/**
 * 把四叉树瓦片变成 RenderItem：上传网格、图集、RTE uniform。
 */
import {
  type Color,
  EncodedCartesian3,
  Intersect,
  type IntersectValue,
  type Rectangle,
  type TerrainData,
  TERRAIN_VERTEX_STRIDE_BYTES,
  type TerrainProvider,
  type TilingScheme,
} from "@webgpu-cesium/core"
import { type FrameUniformsBuffer, type RenderItem } from "@webgpu-cesium/renderer"
import { makeLabel, type GpuDevice } from "@webgpu-cesium/rhi"
import { composeShader, SHADER_MODULES } from "@webgpu-cesium/shaders"
import type { FrameState } from "../FrameState"
import { coveringTiles } from "../imagery/coveringTiles"
import type { ImageryLayer } from "../imagery/ImageryLayer"
import type { ImageryLayerCollection } from "../imagery/ImageryLayerCollection"
import { ImageryState } from "../imagery/ImageryState"
import {
  reprojectImageCpu,
  reprojectImageGpu,
  reprojectImagesCpu,
} from "../imagery/ImageryReprojector"
import { TileImagery } from "../imagery/TileImagery"
import type { QuadtreeTile } from "../quadtree/QuadtreeTile"
import type { QuadtreeTileProvider } from "../quadtree/QuadtreeTileProvider"
import { QuadtreeTileLoadState } from "../quadtree/QuadtreeTileLoadState"
import { GlobeSurfaceTile } from "./GlobeSurfaceTile"
import { ImageryAtlas } from "./ImageryAtlas"
import { TerrainFillMesh } from "./TerrainFillMesh"
import { TerrainState } from "./TerrainState"

const PACKAGE_LABEL = "scene"
const TILE_UNIFORM_BYTES = 48
const NO_LAYER = 0xffffffff
const SKIRT_ERROR_SCALE = 5

const encodedScratch = new EncodedCartesian3()

/**
 * 地形 Provider 是否与影像方案 0 级瓦片数相同（1:1 映射）。
 *
 * @param terrain 地形方案
 * @param imagery 影像方案
 */
export function tilingSchemesCompatible(terrain: TilingScheme, imagery: TilingScheme): boolean {
  return (
    terrain.getNumberOfXTilesAtLevel(0) === imagery.getNumberOfXTilesAtLevel(0) &&
    terrain.getNumberOfYTilesAtLevel(0) === imagery.getNumberOfYTilesAtLevel(0)
  )
}

export interface GlobeSurfaceTileProviderOptions {
  device: GpuDevice
  terrainProvider: TerrainProvider
  imageryLayers: ImageryLayerCollection
  frameUniforms: FrameUniformsBuffer
  baseColor: Color
  canvasFormat: GPUTextureFormat
}

/**
 * Globe 的四叉树内容提供者。
 */
export class GlobeSurfaceTileProvider implements QuadtreeTileProvider {
  terrainProvider: TerrainProvider
  readonly imageryLayers: ImageryLayerCollection
  readonly atlas: ImageryAtlas
  exaggeration = 1
  exaggerationRelativeHeight = 0
  private readonly _device: GpuDevice
  private readonly _frameUniforms: FrameUniformsBuffer
  private readonly _baseColor: Color
  private readonly _pipeline: GPURenderPipelineDescriptor
  private readonly _pipelineKey: string
  private readonly _pipelineLayout: GPUPipelineLayout
  private readonly _imageryBindGroup: GPUBindGroup
  private readonly _tileLayout: GPUBindGroupLayout
  loadedTiles = 0
  requestedTiles = 0

  /**
   * @param options 设备与图层
   */
  constructor(options: GlobeSurfaceTileProviderOptions) {
    this._device = options.device
    this.terrainProvider = options.terrainProvider
    this.imageryLayers = options.imageryLayers
    this._frameUniforms = options.frameUniforms
    this._baseColor = options.baseColor
    this.atlas = new ImageryAtlas(options.device)

    const composed = composeShader({
      entry: "globe/terrain.wgsl",
      modules: SHADER_MODULES,
    })
    const module = options.device.shaderModules.get(
      composed.code,
      composed.hash,
      makeLabel("ShaderModule", "globe/terrain", PACKAGE_LABEL),
    )
    this._tileLayout = options.device.bindGroupLayouts.get({
      label: makeLabel("BindGroupLayout", "tile", PACKAGE_LABEL),
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    })
    const imageryLayout = options.device.bindGroupLayouts.get({
      label: makeLabel("BindGroupLayout", "imagery", PACKAGE_LABEL),
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "2d-array" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      ],
    })
    this._pipelineLayout = options.device.bindGroupLayouts.getPipelineLayout(
      [options.frameUniforms.bindGroupLayout, imageryLayout, this._tileLayout],
      makeLabel("PipelineLayout", "globe", PACKAGE_LABEL),
    )
    // group 0 frame / group 1 imagery atlas / group 2 tile
    this._imageryBindGroup = options.device.device.createBindGroup({
      label: makeLabel("BindGroup", "imageryAtlas", PACKAGE_LABEL),
      layout: imageryLayout,
      entries: [
        { binding: 0, resource: this.atlas.texture.createView({ dimension: "2d-array" }) },
        { binding: 1, resource: this.atlas.sampler },
      ],
    })
    this._pipeline = {
      layout: this._pipelineLayout,
      vertex: {
        module,
        entryPoint: "vsTerrain",
        buffers: [
          {
            arrayStride: TERRAIN_VERTEX_STRIDE_BYTES,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x3" },
              { shaderLocation: 1, offset: 12, format: "float32x2" },
            ],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: "fsTerrain",
        targets: [{ format: options.canvasFormat }],
      },
      primitive: { topology: "triangle-list", cullMode: "back", frontFace: "ccw" },
      depthStencil: {
        format: "depth32float",
        depthWriteEnabled: true,
        depthCompare: "greater",
      },
    }
    this._pipelineKey = options.device.pipelines.keyOf(this._pipeline)
  }

  get tilingScheme(): TilingScheme {
    return this.terrainProvider.tilingScheme
  }

  /**
   * 每帧开始：重置计数。
   *
   * @param _frameState 帧
   */
  update(_frameState: FrameState): void {
    this.requestedTiles = 0
    this.loadedTiles = 0
  }

  /**
   * 视锥可见性。
   *
   * @param tile 瓦片
   * @param frameState 帧
   */
  computeTileVisibility(tile: QuadtreeTile, frameState: FrameState): IntersectValue {
    const volume = frameState.cullingVolume
    const sphere = tile.boundingRegion?.boundingSphere
    if (!volume || !sphere) {
      return Intersect.INSIDE
    }
    return volume.computeVisibility(sphere)
  }

  /**
   * 子瓦片是否值得细分（可用或可上采样）。
   *
   * @param tile 父瓦片
   */
  canRefine(tile: QuadtreeTile): boolean {
    const level = tile.level + 1
    const children = [
      { x: tile.x * 2, y: tile.y * 2 + 1 },
      { x: tile.x * 2 + 1, y: tile.y * 2 + 1 },
      { x: tile.x * 2, y: tile.y * 2 },
      { x: tile.x * 2 + 1, y: tile.y * 2 },
    ]
    let any = false
    for (const child of children) {
      const available = this.terrainProvider.getTileDataAvailable(child.x, child.y, level)
      if (available !== false) {
        any = true
      }
    }
    if (any) {
      return true
    }
    const surface = tile.data as GlobeSurfaceTile | undefined
    return surface?.terrainData !== undefined
  }

  getLevelMaximumGeometricError(level: number): number {
    return this.terrainProvider.getLevelMaximumGeometricError(level)
  }

  showTileThisFrame(_tile: QuadtreeTile, _frameState: FrameState): void {
    // 统计在 createRenderItems
  }

  /**
   * 加载地形网格与影像。
   *
   * @param tile 瓦片
   * @param _frameState 帧
   */
  loadTile(tile: QuadtreeTile, _frameState: FrameState): void {
    tile.data ??= new GlobeSurfaceTile()
    const surface = tile.data as GlobeSurfaceTile
    if (surface.terrainState === TerrainState.UNLOADED) {
      surface.terrainState = TerrainState.RECEIVING
      tile.state = QuadtreeTileLoadState.LOADING
      this.requestedTiles++
      this.beginTerrain(tile, surface)
    } else if (surface.terrainState === TerrainState.READY) {
      tile.state = QuadtreeTileLoadState.DONE
      surface.renderable = true
    }
    this.syncImagery(tile, surface)
    this.advanceImagery(surface)
  }

  /**
   * 请求 / 上采样 / 填充。
   *
   * @param tile 瓦片
   * @param surface 地表
   */
  private beginTerrain(tile: QuadtreeTile, surface: GlobeSurfaceTile): void {
    const available = this.terrainProvider.getTileDataAvailable(tile.x, tile.y, tile.level)
    if (available === false) {
      this.upsampleOrFill(tile, surface)
      return
    }
    const promised = this.terrainProvider.requestTileGeometry(tile.x, tile.y, tile.level)
    if (!promised) {
      surface.terrainState = TerrainState.UNLOADED
      tile.state = QuadtreeTileLoadState.START
      return
    }
    void promised
      .then((data) => this.finishTerrain(tile, surface, data))
      .catch(() => {
        this.upsampleOrFill(tile, surface)
      })
  }

  /**
   * 父网格上采样，失败则填洞。
   *
   * @param tile 瓦片
   * @param surface 地表
   */
  private upsampleOrFill(tile: QuadtreeTile, surface: GlobeSurfaceTile): void {
    const parent = tile.parent
    const parentData = (parent?.data as GlobeSurfaceTile | undefined)?.terrainData
    if (parent && parentData) {
      const upsampled = parentData.upsample(
        this.tilingScheme,
        parent.x,
        parent.y,
        parent.level,
        tile.x,
        tile.y,
        tile.level,
      )
      if (upsampled) {
        void upsampled
          .then((data) => this.finishTerrain(tile, surface, data))
          .catch(() => {
            this.useFillMesh(tile, surface)
          })
        return
      }
    }
    this.useFillMesh(tile, surface)
  }

  /**
   * 常数高度填充，避免缺瓦黑缝。
   *
   * @param tile 瓦片
   * @param surface 地表
   */
  private useFillMesh(tile: QuadtreeTile, surface: GlobeSurfaceTile): void {
    if (tile.data !== surface) {
      return
    }
    const skirtHeight = this.getLevelMaximumGeometricError(tile.level) * SKIRT_ERROR_SCALE
    surface.mesh = TerrainFillMesh.createMesh(
      tile.rectangle,
      this.tilingScheme.ellipsoid,
      undefined,
      skirtHeight,
    )
    this.afterMeshReady(tile, surface)
  }

  /**
   * createMesh 并上传。
   *
   * @param tile 瓦片
   * @param surface 地表
   * @param data 地形数据
   */
  private async finishTerrain(
    tile: QuadtreeTile,
    surface: GlobeSurfaceTile,
    data: TerrainData,
  ): Promise<void> {
    if (tile.data !== surface) {
      return
    }
    surface.terrainData = data
    surface.waterMask = data.waterMask
    const skirtHeight = this.getLevelMaximumGeometricError(tile.level) * SKIRT_ERROR_SCALE
    const mesh = await data.createMesh({
      tilingScheme: this.tilingScheme,
      x: tile.x,
      y: tile.y,
      level: tile.level,
      exaggeration: this.exaggeration,
      exaggerationRelativeHeight: this.exaggerationRelativeHeight,
      skirtHeight,
    })
    if (tile.data !== surface) {
      return
    }
    surface.mesh = mesh
    this.afterMeshReady(tile, surface)
  }

  /**
   * 更新包围体、上传 GPU、挂影像。
   *
   * @param tile 瓦片
   * @param surface 地表
   */
  private afterMeshReady(tile: QuadtreeTile, surface: GlobeSurfaceTile): void {
    const mesh = surface.mesh
    if (!mesh) {
      return
    }
    tile.boundingRegion?.updateFromMesh(mesh)
    this.uploadMesh(surface, tile)
    this.attachImagery(tile, surface)
    surface.terrainState = TerrainState.READY
    surface.renderable = true
    tile.state = QuadtreeTileLoadState.DONE
    this.loadedTiles++
  }

  /**
   * 上传顶点 / 索引。
   *
   * @param surface 地表
   * @param tile 瓦片
   */
  private uploadMesh(surface: GlobeSurfaceTile, tile: QuadtreeTile): void {
    const mesh = surface.mesh
    if (!mesh) {
      return
    }
    const gpu = this._device.device
    surface.vertexBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", `tile-${tile.level}-${tile.x}-${tile.y}-vb`, PACKAGE_LABEL),
      size: mesh.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    gpu.queue.writeBuffer(surface.vertexBuffer, 0, mesh.vertices)
    const indices = mesh.indices
    surface.indexFormat = indices instanceof Uint32Array ? "uint32" : "uint16"
    const indexBytes =
      indices instanceof Uint32Array
        ? indices
        : indices instanceof Uint16Array
          ? indices
          : new Uint16Array(indices)
    surface.indexBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", `tile-${tile.level}-${tile.x}-${tile.y}-ib`, PACKAGE_LABEL),
      size: indexBytes.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    })
    gpu.queue.writeBuffer(surface.indexBuffer, 0, indexBytes)
    surface.indexCount = indexBytes.length
    surface.tileUniformBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", `tile-${tile.level}-${tile.x}-${tile.y}-ub`, PACKAGE_LABEL),
      size: TILE_UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    surface.tileBindGroup = gpu.createBindGroup({
      label: makeLabel("BindGroup", `tile-${tile.level}-${tile.x}-${tile.y}`, PACKAGE_LABEL),
      layout: this._tileLayout,
      entries: [{ binding: 0, resource: { buffer: surface.tileUniformBuffer } }],
    })
    this.writeTileUniforms(surface, NO_LAYER)
  }

  /**
   * 匹配影像层（同方案 1:1；不同方案重投影）。
   *
   * @param tile 瓦片
   * @param surface 地表
   */
  private attachImagery(tile: QuadtreeTile, surface: GlobeSurfaceTile): void {
    this.syncImagery(tile, surface)
  }

  /**
   * 补挂后来加入的影像层。
   *
   * @param tile 瓦片
   * @param surface 地表
   */
  private syncImagery(tile: QuadtreeTile, surface: GlobeSurfaceTile): void {
    for (const layer of this.imageryLayers) {
      const exists = surface.tileImagery.some(
        (item) =>
          item.loadingImagery?.imageryLayer === layer || item.readyImagery?.imageryLayer === layer,
      )
      if (exists) {
        continue
      }
      if (tilingSchemesCompatible(this.tilingScheme, layer.imageryProvider.tilingScheme)) {
        const tileImagery = layer.createTileImagery(tile.x, tile.y, tile.level)
        if (tileImagery) {
          surface.tileImagery.push(tileImagery)
        }
        continue
      }
      const reprojected = this.createReprojectedImagery(tile, layer)
      if (reprojected) {
        surface.tileImagery.push(reprojected)
      }
    }
  }

  /**
   * Geographic 地形 + Mercator 影像：拉覆盖瓦片再重投影。
   *
   * @param tile 地形瓦片
   * @param layer 影像层
   */
  private createReprojectedImagery(
    tile: QuadtreeTile,
    layer: ImageryLayer,
  ): TileImagery | undefined {
    if (!layer.show) {
      return undefined
    }
    const provider = layer.imageryProvider
    const imageryLevel = Math.max(
      provider.minimumLevel,
      provider.maximumLevel !== undefined
        ? Math.min(tile.level, provider.maximumLevel)
        : tile.level,
    )
    const sources = coveringTiles(provider.tilingScheme, tile.rectangle, imageryLevel)
    if (sources.length === 0) {
      return undefined
    }
    const destImagery = layer.getReprojectImagery(tile.x, tile.y, tile.level)
    const tileImagery = new TileImagery(destImagery)
    tileImagery.needsReproject = true
    tileImagery.destRectangle = tile.rectangle
    if (sources.length === 1 && sources[0]) {
      const source = sources[0]
      tileImagery.sourceRectangle = provider.tilingScheme.tileXYToRectangle(
        source.x,
        source.y,
        imageryLevel,
      )
      tileImagery.reprojectSources = [layer.getImageryFromCache(source.x, source.y, imageryLevel)]
    } else {
      tileImagery.reprojectSources = sources.map((source) =>
        layer.getImageryFromCache(source.x, source.y, imageryLevel),
      )
    }
    for (const source of tileImagery.reprojectSources) {
      source.addReference()
    }
    return tileImagery
  }

  /**
   * 推进影像解码与图集上传。
   *
   * @param surface 地表
   */
  private advanceImagery(surface: GlobeSurfaceTile): void {
    for (const tileImagery of surface.tileImagery) {
      if (tileImagery.needsReproject) {
        this.advanceReproject(tileImagery)
        continue
      }
      const imagery = tileImagery.loadingImagery ?? tileImagery.readyImagery
      if (!imagery) {
        continue
      }
      if (imagery.state === ImageryState.UNLOADED) {
        imagery.imageryLayer.processImagery(imagery)
      }
      if (imagery.state === ImageryState.RECEIVED && imagery.image) {
        let layer = imagery.textureLayer
        if (layer === undefined) {
          layer = this.atlas.allocate()
          if (layer === undefined) {
            continue
          }
          imagery.textureLayer = layer
        }
        this.atlas.upload(this._device, layer, imagery.image as ImageBitmap)
        imagery.state = ImageryState.READY
        tileImagery.readyImagery = imagery
        tileImagery.loadingImagery = undefined
      }
    }
  }

  /**
   * 重投影：等源图齐后 GPU / CPU 写入图集。
   *
   * @param tileImagery 瓦片影像
   */
  private advanceReproject(tileImagery: TileImagery): void {
    const dest = tileImagery.loadingImagery ?? tileImagery.readyImagery
    const destRectangle = tileImagery.destRectangle
    if (!dest || !destRectangle) {
      return
    }
    for (const source of tileImagery.reprojectSources) {
      if (source.state === ImageryState.UNLOADED) {
        source.imageryLayer.processImagery(source)
      }
    }
    if (tileImagery.reprojectSources.some((source) => source.state === ImageryState.FAILED)) {
      dest.state = ImageryState.FAILED
      return
    }
    if (
      !tileImagery.reprojectSources.every(
        (source) => source.state === ImageryState.RECEIVED && source.image,
      )
    ) {
      return
    }
    if (tileImagery.reprojectPending || dest.state === ImageryState.READY) {
      return
    }
    let layer = dest.textureLayer
    if (layer === undefined) {
      layer = this.atlas.allocate()
      if (layer === undefined) {
        return
      }
      dest.textureLayer = layer
    }
    tileImagery.reprojectPending = true
    const destLayer = layer
    void this.runReproject(tileImagery, destLayer, destRectangle)
      .then(() => {
        dest.state = ImageryState.READY
        tileImagery.readyImagery = dest
        tileImagery.loadingImagery = undefined
        tileImagery.reprojectPending = false
      })
      .catch(() => {
        dest.state = ImageryState.FAILED
        tileImagery.reprojectPending = false
      })
  }

  /**
   * 执行 GPU 或 CPU 重投影。
   *
   * @param tileImagery 瓦片影像
   * @param destLayer 图集层
   * @param destRectangle 目标矩形
   */
  private async runReproject(
    tileImagery: TileImagery,
    destLayer: number,
    destRectangle: Rectangle,
  ): Promise<void> {
    const sources = tileImagery.reprojectSources
      .map((imagery) => {
        const rectangle = imagery.imageryLayer.imageryProvider.tilingScheme.tileXYToRectangle(
          imagery.x,
          imagery.y,
          imagery.level,
        )
        return imagery.image ? { image: imagery.image as ImageBitmap, rectangle } : undefined
      })
      .filter((item): item is { image: ImageBitmap; rectangle: Rectangle } => item !== undefined)
    if (sources.length === 0) {
      throw new Error("reproject sources empty")
    }
    if (sources.length === 1 && sources[0] && tileImagery.sourceRectangle) {
      try {
        reprojectImageGpu(
          this._device,
          sources[0].image,
          this.atlas.texture,
          destLayer,
          destRectangle,
          tileImagery.sourceRectangle,
        )
        return
      } catch {
        const image = reprojectImageCpu(
          sources[0].image,
          destRectangle,
          tileImagery.sourceRectangle,
          this.atlas.tileSize,
        )
        const bitmap = await createImageBitmap(image)
        this.atlas.upload(this._device, destLayer, bitmap)
        return
      }
    }
    const image = reprojectImagesCpu(sources, destRectangle, this.atlas.tileSize)
    const bitmap = await createImageBitmap(image)
    this.atlas.upload(this._device, destLayer, bitmap)
  }

  /**
   * 写瓦片 uniform。
   *
   * @param surface 地表
   * @param layerIndex 图集层
   */
  private writeTileUniforms(surface: GlobeSurfaceTile, layerIndex: number): void {
    const mesh = surface.mesh
    const buffer = surface.tileUniformBuffer
    if (!mesh || !buffer) {
      return
    }
    EncodedCartesian3.fromCartesian(mesh.center, encodedScratch)
    const data = new ArrayBuffer(TILE_UNIFORM_BYTES)
    const f32 = new Float32Array(data)
    const u32 = new Uint32Array(data)
    f32[0] = encodedScratch.high.x
    f32[1] = encodedScratch.high.y
    f32[2] = encodedScratch.high.z
    u32[3] = layerIndex >>> 0
    f32[4] = encodedScratch.low.x
    f32[5] = encodedScratch.low.y
    f32[6] = encodedScratch.low.z
    f32[8] = this._baseColor.red
    f32[9] = this._baseColor.green
    f32[10] = this._baseColor.blue
    f32[11] = this._baseColor.alpha
    this._device.device.queue.writeBuffer(buffer, 0, data)
  }

  /**
   * 生成 RenderItem。
   *
   * @param tiles 已选瓦片
   * @param frameState 帧
   */
  createRenderItems(tiles: readonly QuadtreeTile[], frameState: FrameState): RenderItem[] {
    const items: RenderItem[] = []
    let rendered = 0
    for (const tile of tiles) {
      const surface = tile.data as GlobeSurfaceTile | undefined
      if (
        !surface?.renderable ||
        !surface.vertexBuffer ||
        !surface.indexBuffer ||
        !surface.tileBindGroup
      ) {
        continue
      }
      let layer = NO_LAYER
      for (const tileImagery of surface.tileImagery) {
        const ready = tileImagery.readyImagery
        if (ready?.textureLayer !== undefined) {
          layer = ready.textureLayer
          break
        }
      }
      this.writeTileUniforms(surface, layer)
      items.push({
        pass: "globe",
        sortKey: tile.level,
        pipelineKey: this._pipelineKey,
        pipeline: this._pipeline,
        bindGroups: [this._frameUniforms.bindGroup, this._imageryBindGroup, surface.tileBindGroup],
        vertexBuffers: [{ buffer: surface.vertexBuffer }],
        indexBuffer: { buffer: surface.indexBuffer, format: surface.indexFormat },
        draw: { indexCount: surface.indexCount },
        label: `globe-${tile.level}-${tile.x}-${tile.y}`,
      })
      rendered++
    }
    frameState.statistics.tilesRendered = rendered
    frameState.statistics.tilesLoaded += this.loadedTiles
    frameState.statistics.tilesRequested += this.requestedTiles
    return items
  }

  /**
   * 卸载瓦片 GPU。
   *
   * @param tile 瓦片
   */
  freeTile(tile: QuadtreeTile): void {
    const surface = tile.data as GlobeSurfaceTile | undefined
    if (!surface) {
      return
    }
    for (const tileImagery of surface.tileImagery) {
      const imagery = tileImagery.readyImagery
      if (imagery?.textureLayer !== undefined && imagery.referenceCount <= 1) {
        this.atlas.free(imagery.textureLayer)
        imagery.textureLayer = undefined
      }
      for (const source of tileImagery.reprojectSources) {
        source.releaseReference()
      }
    }
    surface.freeResources()
    tile.state = QuadtreeTileLoadState.START
    tile.data = undefined
  }
}
