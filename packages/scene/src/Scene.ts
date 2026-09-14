/**
 * Scene：更新相机 / 环境 → 四叉树与网格 → Render Graph（G-buffer / 延迟光照 / 天空 / 色调）。
 */
import {
  type Cartesian2,
  Clock,
  EncodedCartesian3,
  Event,
  type JulianDate,
  Matrix4,
  RequestScheduler,
} from "@webgpu-cesium/core"
import { type Cesium3DTileset, type Model } from "@webgpu-cesium/tiles"
import { EnvironmentState, HillaireAtmosphere } from "@webgpu-cesium/environment"
import {
  FrameUniformsBuffer,
  type FrameUniformsValues,
  type GraphJson,
  GBUFFER_COLOR_USAGE,
  GBUFFER_DEPTH_USAGE,
  GBUFFER_FORMATS,
  HDR_USAGE,
  RenderGraph,
  SunLight,
  copyTextureToBuffer,
  createFullscreenPipelines,
  fullscreenItem,
  type DirectionalLight,
  type FullscreenPipelines,
  type Mesh,
} from "@webgpu-cesium/renderer"
import { type GpuDevice } from "@webgpu-cesium/rhi"
import { Camera } from "./Camera"
import { CreditDisplay } from "./CreditDisplay"
import { Fog } from "./Fog"
import { FrameState } from "./FrameState"
import { Globe } from "./globe/Globe"
import { ScreenSpaceCameraController } from "./ScreenSpaceCameraController"
import { SkyAtmosphere } from "./SkyAtmosphere"
import { TweenCollection } from "./TweenCollection"

export interface SceneOptions {
  canvas: HTMLCanvasElement
  device: GpuDevice
  requestRenderMode?: boolean
  globe?: Globe
}

const encodedScratch = new EncodedCartesian3()
const viewScratch = new Float32Array(16)
const projScratch = new Float32Array(16)
const viewProjScratch = new Float32Array(16)
const invProjScratch = new Float32Array(16)
const invViewScratch = new Float32Array(16)
const viewProjMatrix = new Matrix4()
const invProjMatrix = new Matrix4()
const invViewMatrix = new Matrix4()

export type ToneMappingMode = "aces" | "reinhard"

/**
 * 场景循环。
 */
export class Scene {
  readonly canvas: HTMLCanvasElement
  readonly device: GpuDevice
  readonly camera: Camera
  readonly globe: Globe
  readonly clock = new Clock()
  readonly tweens = new TweenCollection()
  readonly creditDisplay = new CreditDisplay()
  readonly screenSpaceCameraController: ScreenSpaceCameraController
  readonly preUpdate = new Event<[Scene, JulianDate]>()
  readonly postUpdate = new Event<[Scene, JulianDate]>()
  readonly preRender = new Event<[Scene, JulianDate]>()
  readonly postRender = new Event<[Scene, JulianDate]>()
  readonly skyAtmosphere = new SkyAtmosphere()
  readonly fog = new Fog()
  readonly environmentState = new EnvironmentState()
  readonly atmosphere = new HillaireAtmosphere()
  readonly meshes: Mesh[] = []
  readonly models: Model[] = []
  readonly tilesets: Cesium3DTileset[] = []
  light: SunLight | DirectionalLight = new SunLight()
  toneMapping: ToneMappingMode = "aces"
  requestRenderMode: boolean
  maximumRenderTimeChange = 0.0
  readonly frameState: FrameState
  lastGraphJson: GraphJson | undefined
  private readonly _graph = new RenderGraph()
  private readonly _frameUniforms: FrameUniformsBuffer
  private readonly _context: GPUCanvasContext
  private readonly _fullscreen: FullscreenPipelines
  private _frameNumber = 0
  private _renderRequested = true
  private _lastTime = 0
  private _destroyed = false
  private _lastColorTexture: GPUTexture | undefined

  /**
   * @param options canvas 与设备
   */
  constructor(options: SceneOptions) {
    this.canvas = options.canvas
    this.device = options.device
    this.requestRenderMode = options.requestRenderMode ?? false
    this._context = options.device.configureCanvas(options.canvas, {
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    })
    this._frameUniforms = new FrameUniformsBuffer(options.device)
    this.atmosphere.initialize(options.device, this._frameUniforms)
    this._fullscreen = createFullscreenPipelines(
      options.device,
      this._frameUniforms,
      options.device.canvasFormat,
    )
    this.camera = new Camera({
      canvas: options.canvas,
      tweens: this.tweens,
      pixelRatio: 1,
      ...(options.globe !== undefined ? { ellipsoid: options.globe.ellipsoid } : {}),
    })
    this.globe = options.globe ?? new Globe({ ellipsoid: this.camera.ellipsoid })
    this.globe.initialize(options.device, this._frameUniforms, options.device.canvasFormat)
    this.frameState = new FrameState(this.camera)
    this.frameState.creditDisplay = this.creditDisplay
    this.frameState.clock = this.clock
    this.screenSpaceCameraController = new ScreenSpaceCameraController(this)
    this.camera.changed.addEventListener(() => {
      this.requestRender()
    })
  }

  get drawingBufferWidth(): number {
    return this.canvas.width
  }

  get drawingBufferHeight(): number {
    return this.canvas.height
  }

  get ellipsoid() {
    return this.globe.ellipsoid
  }

  /** 导出最近一帧帧图（Mermaid / JSON） */
  exportGraph(): GraphJson | undefined {
    return this.lastGraphJson
  }

  /** 请求一帧（requestRenderMode） */
  requestRender(): void {
    this._renderRequested = true
  }

  /**
   * 渲染一帧。
   *
   * @param time 可选儒略日
   */
  render(time?: JulianDate): void {
    if (this._destroyed) {
      return
    }
    if (this.requestRenderMode && !this._renderRequested) {
      return
    }
    this._renderRequested = false
    const now = performance.now()
    const delta = this._lastTime === 0 ? 0 : (now - this._lastTime) / 1000
    this._lastTime = now
    const startCpu = now

    this.resize()
    const julian = time ?? this.clock.tick()
    this.preUpdate.raiseEvent(this, julian)
    this.tweens.update(delta)
    this.screenSpaceCameraController.update(delta)
    this.camera.updateFrustumAspect(this.canvas.width, this.canvas.height)
    this.camera.updateMembers()

    this.frameState.frameNumber = ++this._frameNumber
    this.frameState.time = julian
    this.frameState.pixelRatio = window.devicePixelRatio || 1
    this.frameState.drawingBufferWidth = this.canvas.width
    this.frameState.drawingBufferHeight = this.canvas.height
    this.frameState.viewport.x = this.canvas.width
    this.frameState.viewport.y = this.canvas.height
    this.frameState.cullingVolume = this.camera.frustum.computeCullingVolume(
      this.camera.positionWC,
      this.camera.directionWC,
      this.camera.upWC,
    )
    this.frameState.renderItems.length = 0
    this.frameState.afterRender.length = 0
    this.frameState.statistics.tilesSelected = 0
    this.frameState.statistics.tilesRendered = 0
    this.frameState.statistics.tilesLoaded = 0
    this.frameState.statistics.tilesRequested = 0

    this.ensureMeshes()
    this.ensureModels()
    this.ensureTilesets()
    this.globe.update(this.frameState)
    for (const tileset of this.tilesets) {
      tileset.update(this.frameState)
    }
    this.postUpdate.raiseEvent(this, julian)

    const globeItems = this.globe.createRenderItems(this.frameState)
    const meshItems = this.collectMeshItems()
    const modelItems = this.collectModelItems()
    const tilesetItems = this.collectTilesetItems()
    const items = [...globeItems, ...meshItems, ...modelItems, ...tilesetItems]
    this.frameState.renderItems.push(...items)
    this.accumulateTilesetStats()
    this.frameState.statistics.renderItemCount = items.length
    this.frameState.statistics.pipelineCount = this.device.pipelines.size
    this.frameState.lightDirectionWC = this.environmentState.sunDirectionECEF

    const terrainCredit = this.globe.terrainProvider.credit
    if (terrainCredit) {
      this.creditDisplay.addCredit(terrainCredit)
    }
    for (const layer of this.globe.imageryLayers) {
      const credit = layer.imageryProvider.credit
      if (credit) {
        this.creditDisplay.addCredit(credit)
      }
    }
    this.creditDisplay.endFrame()

    this.uploadFrameUniforms(delta, julian)
    this.atmosphere.updateStars(julian)
    this.preRender.raiseEvent(this, julian)
    this.executeGraph(items)
    this.frameState.statistics.cpuFrameTimeMs = performance.now() - startCpu
    for (const callback of this.frameState.afterRender) {
      callback()
    }
    this.postRender.raiseEvent(this, julian)
  }

  /**
   * 调整 canvas 像素尺寸。
   */
  resize(): boolean {
    const clientWidth = this.canvas.clientWidth
    const clientHeight = this.canvas.clientHeight
    if (clientWidth < 1 || clientHeight < 1) {
      return false
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.floor(clientWidth * ratio))
    const height = Math.max(1, Math.floor(clientHeight * ratio))
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
      this.requestRender()
      return true
    }
    return false
  }

  /**
   * 填充 FrameUniforms（RTE + Reverse-Z + EnvironmentState）。
   *
   * @param delta 秒
   * @param time 儒略日
   */
  private uploadFrameUniforms(delta: number, time: JulianDate): void {
    const camera = this.camera
    camera.viewMatrix.toFloat32Array(viewScratch)
    camera.frustum.projectionMatrix.toFloat32Array(projScratch)
    Matrix4.multiply(camera.frustum.projectionMatrix, camera.viewMatrix, viewProjMatrix)
    viewProjMatrix.toFloat32Array(viewProjScratch)
    Matrix4.inverse(camera.frustum.projectionMatrix, invProjMatrix)
    invProjMatrix.toFloat32Array(invProjScratch)
    Matrix4.inverse(camera.viewMatrix, invViewMatrix)
    invViewMatrix.toFloat32Array(invViewScratch)
    EncodedCartesian3.fromCartesian(camera.positionWC, encodedScratch)
    this.environmentState.update(
      time,
      camera.positionWC,
      viewScratch,
      this.ellipsoid,
      this.light,
      delta,
    )
    const env = this.environmentState
    const values: FrameUniformsValues = {
      time: this._frameNumber / 60,
      deltaTime: delta,
      frameNumber: this._frameNumber,
      viewport: [0, 0, this.canvas.width, this.canvas.height],
      viewMatrix: viewScratch,
      projectionMatrix: projScratch,
      viewProjectionMatrix: viewProjScratch,
      inverseProjectionMatrix: invProjScratch,
      inverseViewMatrix: invViewScratch,
      cameraPositionHigh: [encodedScratch.high.x, encodedScratch.high.y, encodedScratch.high.z],
      cameraPositionLow: [encodedScratch.low.x, encodedScratch.low.y, encodedScratch.low.z],
      toneMappingMode: this.toneMapping === "reinhard" ? 1 : 0,
      exposure: env.exposure,
      moonPhase: env.moonPhase,
      sunDirectionECEF: [env.sunDirectionECEF.x, env.sunDirectionECEF.y, env.sunDirectionECEF.z],
      sunDirectionView: [env.sunDirectionView.x, env.sunDirectionView.y, env.sunDirectionView.z],
      sunIrradiance: [env.sunIrradiance.x, env.sunIrradiance.y, env.sunIrradiance.z],
      cameraHeight: env.cameraHeight,
      atmosphereRadius: env.atmosphereRadius,
      planetRadius: env.planetRadius,
      aerialPerspectiveEnabled: this.fog.enabled ? 1 : 0,
      moonDirectionECEF: [
        env.moonDirectionECEF.x,
        env.moonDirectionECEF.y,
        env.moonDirectionECEF.z,
      ],
      moonIntensity: env.moonIntensity,
    }
    this._frameUniforms.update(values)
  }

  /**
   * G-buffer → 光照 → 天空 → 色调映射。
   *
   * @param items 本帧不透明绘制
   */
  private executeGraph(items: FrameState["renderItems"]): void {
    const color = this._context.getCurrentTexture()
    this._lastColorTexture = color
    const width = Math.max(this.canvas.width, 1)
    const height = Math.max(this.canvas.height, 1)
    const canvas = this._graph.importTexture("canvas", color)
    const gb0 = this._graph.createTexture("gb0", {
      width,
      height,
      format: GBUFFER_FORMATS.gb0,
      usage: GBUFFER_COLOR_USAGE,
    })
    const gb1 = this._graph.createTexture("gb1", {
      width,
      height,
      format: GBUFFER_FORMATS.gb1,
      usage: GBUFFER_COLOR_USAGE,
    })
    const gb2 = this._graph.createTexture("gb2", {
      width,
      height,
      format: GBUFFER_FORMATS.gb2,
      usage: GBUFFER_COLOR_USAGE,
    })
    const gb3 = this._graph.createTexture("gb3", {
      width,
      height,
      format: GBUFFER_FORMATS.gb3,
      usage: GBUFFER_COLOR_USAGE,
    })
    const depth = this._graph.createTexture("depth", {
      width,
      height,
      format: GBUFFER_FORMATS.depth,
      usage: GBUFFER_DEPTH_USAGE,
    })
    const hdr = this._graph.createTexture("hdr", {
      width,
      height,
      format: GBUFFER_FORMATS.hdr,
      usage: HDR_USAGE,
    })

    this.atmosphere.declareCompute(
      this._graph,
      this._frameUniforms,
      this.environmentState.sunDirectionECEF,
    )

    this._graph.addPass(
      "gbuffer",
      (builder) => {
        builder.writeColor(gb0)
        builder.writeColor(gb1)
        builder.writeColor(gb2)
        builder.writeColor(gb3)
        builder.writeDepth(depth, { depthClearValue: 0 })
      },
      (ctx) => {
        ctx.drawItems(items)
      },
    )

    this._graph.addPass(
      "lighting",
      (builder) => {
        builder.read(gb0)
        builder.read(gb1)
        builder.read(gb2)
        builder.read(gb3)
        builder.read(depth)
        builder.writeColor(hdr)
      },
      (ctx) => {
        const lightingBg = this.atmosphere.createLightingBindGroup(
          this.device,
          this._fullscreen.lightingLayout,
          {
            gb0: ctx.getTextureView(gb0),
            gb1: ctx.getTextureView(gb1),
            gb2: ctx.getTextureView(gb2),
            gb3: ctx.getTextureView(gb3),
            depth: ctx.getTextureView(depth),
          },
        )
        ctx.drawItems([
          fullscreenItem("lighting", this._fullscreen.lighting, this._fullscreen.lightingKey, [
            this._frameUniforms.bindGroup,
            lightingBg,
          ]),
        ])
      },
    )

    if (this.skyAtmosphere.show) {
      this._graph.addPass(
        "sky",
        (builder) => {
          builder.read(depth)
          builder.writeColor(hdr, { loadOp: "load" })
        },
        (ctx) => {
          const skyBg = this.atmosphere.createSkyBindGroup(
            this.device,
            this._fullscreen.skyLayout,
            ctx.getTextureView(depth),
          )
          ctx.drawItems([
            fullscreenItem("sky", this._fullscreen.sky, this._fullscreen.skyKey, [
              this._frameUniforms.bindGroup,
              skyBg,
            ]),
          ])
        },
      )
    }

    const hdrSampler = this.device.samplers.get({ magFilter: "linear", minFilter: "linear" })
    this._graph.addPass(
      "tonemap",
      (builder) => {
        builder.read(hdr)
        builder.writeColor(canvas)
      },
      (ctx) => {
        const toneBg = this.device.device.createBindGroup({
          label: "renderer/BindGroup/tonemap",
          layout: this._fullscreen.tonemapLayout,
          entries: [
            { binding: 0, resource: ctx.getTextureView(hdr) },
            { binding: 1, resource: hdrSampler },
          ],
        })
        ctx.drawItems([
          fullscreenItem("tonemap", this._fullscreen.tonemap, this._fullscreen.tonemapKey, [
            this._frameUniforms.bindGroup,
            toneBg,
          ]),
        ])
      },
    )

    this.lastGraphJson = this._graph.toJson()
    this._graph.execute(this.device)
    RequestScheduler.update()
  }

  private ensureMeshes(): void {
    for (const mesh of this.meshes) {
      if (!mesh.initialized) {
        mesh.initialize(this.device, this._frameUniforms)
      }
    }
  }

  private collectMeshItems() {
    const items = []
    this.ensureMeshes()
    for (const mesh of this.meshes) {
      mesh.uploadUniforms(this.device)
      const item = mesh.createRenderItem(this._frameUniforms)
      if (item) {
        items.push(item)
      }
    }
    return items
  }

  private ensureModels(): void {
    for (const model of this.models) {
      if (!model.initialized) {
        model.initialize(this.device, this._frameUniforms)
      }
    }
  }

  private ensureTilesets(): void {
    for (const tileset of this.tilesets) {
      tileset.initialize(this.device, this._frameUniforms)
    }
  }

  private collectModelItems() {
    const items = []
    this.ensureModels()
    for (const model of this.models) {
      items.push(...model.createRenderItems(this.device, this._frameUniforms))
    }
    return items
  }

  private collectTilesetItems() {
    const items = []
    for (const tileset of this.tilesets) {
      items.push(...tileset.createRenderItems())
    }
    return items
  }

  private accumulateTilesetStats(): void {
    let selected = this.frameState.statistics.tilesSelected
    let rendered = this.frameState.statistics.tilesRendered
    let loaded = this.frameState.statistics.tilesLoaded
    let requested = this.frameState.statistics.tilesRequested
    for (const tileset of this.tilesets) {
      selected += tileset.statistics.numberOfTilesSelected
      rendered += tileset.selectedTiles.filter((tile) => tile.contentReady).length
      loaded += tileset.statistics.numberOfTilesWithContentReady
      requested += tileset.statistics.numberOfPendingRequests
    }
    this.frameState.statistics.tilesSelected = selected
    this.frameState.statistics.tilesRendered = rendered
    this.frameState.statistics.tilesLoaded = loaded
    this.frameState.statistics.tilesRequested = requested
  }

  /**
   * 异步拾取：射线打中的 Model 或 3D Tile 要素。
   *
   * @param windowPosition 像素
   */
  pickAsync(windowPosition: Cartesian2): Promise<unknown> {
    const ray = this.camera.getPickRay(windowPosition)
    for (const tileset of this.tilesets) {
      const hit = tileset.pick(ray.origin, ray.direction)
      if (hit) {
        return Promise.resolve(hit)
      }
    }
    for (const model of this.models) {
      if (model.pickBoundingSphere(ray.origin, ray.direction)) {
        return Promise.resolve(model)
      }
    }
    return Promise.resolve(undefined)
  }

  /**
   * 当前帧 canvas 颜色回读（须在 render 之后立即调用）。
   */
  async readColorBuffer(): Promise<Uint8Array> {
    const texture = this._lastColorTexture
    if (!texture) {
      throw new Error("Scene.readColorBuffer: 尚未渲染过")
    }
    return copyTextureToBuffer(this.device, texture)
  }

  destroy(): void {
    if (this._destroyed) {
      return
    }
    this._destroyed = true
    this.screenSpaceCameraController.destroy()
    this.globe.destroy()
    for (const mesh of this.meshes) {
      mesh.destroy()
    }
    for (const model of this.models) {
      model.destroy()
    }
    for (const tileset of this.tilesets) {
      tileset.destroy()
    }
    this.atmosphere.destroy()
    this._frameUniforms.destroy()
    this._graph.destroy()
  }
}
