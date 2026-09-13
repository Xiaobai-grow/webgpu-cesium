/**
 * Scene：更新相机 → 四叉树 → RenderItem → Render Graph。
 */
import {
  Clock,
  EncodedCartesian3,
  Event,
  type JulianDate,
  Matrix4,
  RequestScheduler,
} from "@webgpu-cesium/core"
import {
  FrameUniformsBuffer,
  type FrameUniformsValues,
  RenderGraph,
  copyTextureToBuffer,
} from "@webgpu-cesium/renderer"
import { type GpuDevice } from "@webgpu-cesium/rhi"
import { Camera } from "./Camera"
import { CreditDisplay } from "./CreditDisplay"
import { FrameState } from "./FrameState"
import { Globe } from "./globe/Globe"
import { ScreenSpaceCameraController } from "./ScreenSpaceCameraController"
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
const viewProjMatrix = new Matrix4()
const invProjMatrix = new Matrix4()

/**
 * 最小场景循环。
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
  requestRenderMode: boolean
  maximumRenderTimeChange = 0.0
  readonly frameState: FrameState
  private readonly _graph = new RenderGraph()
  private readonly _frameUniforms: FrameUniformsBuffer
  private readonly _context: GPUCanvasContext
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

    this.globe.update(this.frameState)
    this.postUpdate.raiseEvent(this, julian)

    const items = this.globe.createRenderItems(this.frameState)
    this.frameState.renderItems.push(...items)
    this.frameState.statistics.renderItemCount = items.length
    this.frameState.statistics.pipelineCount = this.device.pipelines.size

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

    this.uploadFrameUniforms(delta)
    this.preRender.raiseEvent(this, julian)
    this.executeGraph(items)
    RequestScheduler.update()
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
    // 测试里 canvas 可能尚未进入布局（clientWidth=0），保留已设像素尺寸
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
   * 填充 FrameUniforms（RTE + Reverse-Z 矩阵）。
   *
   * @param delta 秒
   */
  private uploadFrameUniforms(delta: number): void {
    const camera = this.camera
    camera.viewMatrix.toFloat32Array(viewScratch)
    camera.frustum.projectionMatrix.toFloat32Array(projScratch)
    Matrix4.multiply(camera.frustum.projectionMatrix, camera.viewMatrix, viewProjMatrix)
    viewProjMatrix.toFloat32Array(viewProjScratch)
    Matrix4.inverse(camera.frustum.projectionMatrix, invProjMatrix)
    invProjMatrix.toFloat32Array(invProjScratch)
    EncodedCartesian3.fromCartesian(camera.positionWC, encodedScratch)
    const values: FrameUniformsValues = {
      time: this._frameNumber / 60,
      deltaTime: delta,
      frameNumber: this._frameNumber,
      viewport: [0, 0, this.canvas.width, this.canvas.height],
      viewMatrix: viewScratch,
      projectionMatrix: projScratch,
      viewProjectionMatrix: viewProjScratch,
      inverseProjectionMatrix: invProjScratch,
      cameraPositionHigh: [encodedScratch.high.x, encodedScratch.high.y, encodedScratch.high.z],
      cameraPositionLow: [encodedScratch.low.x, encodedScratch.low.y, encodedScratch.low.z],
    }
    this._frameUniforms.update(values)
  }

  /**
   * 稳定 pass + 动态 RenderItem。
   *
   * @param items 本帧绘制
   */
  private executeGraph(items: FrameState["renderItems"]): void {
    const color = this._context.getCurrentTexture()
    this._lastColorTexture = color
    const target = this._graph.importTexture("canvas", color)
    const depth = this._graph.createTexture("depth", {
      width: this.canvas.width,
      height: this.canvas.height,
      format: "depth32float",
    })
    this._graph.addPass(
      "globe",
      (builder) => {
        builder.writeColor(target, {
          clearValue: { r: 0.02, g: 0.03, b: 0.08, a: 1 },
        })
        builder.writeDepth(depth, { depthClearValue: 0 })
      },
      (ctx) => {
        ctx.drawItems(items)
      },
    )
    this._graph.execute(this.device)
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
    this._frameUniforms.destroy()
    this._graph.destroy()
  }
}
