/**
 * 把四叉树瓦片变成 RenderItem：上传网格、图集、RTE uniform。
 */
import {
  type Color,
  EncodedCartesian3,
  Intersect,
  type IntersectValue,
  TERRAIN_VERTEX_STRIDE_BYTES,
  type TerrainProvider,
  type TilingScheme,
} from "@webgpu-cesium/core"
import { type FrameUniformsBuffer, type RenderItem } from "@webgpu-cesium/renderer"
import { makeLabel, type GpuDevice } from "@webgpu-cesium/rhi"
import { composeShader, SHADER_MODULES } from "@webgpu-cesium/shaders"
import type { FrameState } from "../FrameState"
import { ImageryState } from "../imagery/ImageryState"
import type { ImageryLayerCollection } from "../imagery/ImageryLayerCollection"
import type { QuadtreeTile } from "../quadtree/QuadtreeTile"
import type { QuadtreeTileProvider } from "../quadtree/QuadtreeTileProvider"
import { QuadtreeTileLoadState } from "../quadtree/QuadtreeTileLoadState"
import { GlobeSurfaceTile } from "./GlobeSurfaceTile"
import { ImageryAtlas } from "./ImageryAtlas"
import { TerrainState } from "./TerrainState"

const PACKAGE_LABEL = "scene"
const TILE_UNIFORM_BYTES = 48
const NO_LAYER = 0xffffffff

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

  canRefine(_tile: QuadtreeTile): boolean {
    return true
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
      const promised = this.terrainProvider.requestTileGeometry(tile.x, tile.y, tile.level)
      if (!promised) {
        surface.terrainState = TerrainState.UNLOADED
        tile.state = QuadtreeTileLoadState.START
        return
      }
      void promised
        .then((data) =>
          data.createMesh({
            tilingScheme: this.tilingScheme,
            x: tile.x,
            y: tile.y,
            level: tile.level,
          }),
        )
        .then((mesh) => {
          surface.mesh = mesh
          this.uploadMesh(surface, tile)
          this.attachImagery(tile, surface)
          surface.terrainState = TerrainState.READY
          surface.renderable = true
          tile.state = QuadtreeTileLoadState.DONE
          this.loadedTiles++
        })
        .catch(() => {
          surface.terrainState = TerrainState.FAILED
          tile.state = QuadtreeTileLoadState.FAILED
        })
    } else if (surface.terrainState === TerrainState.READY) {
      tile.state = QuadtreeTileLoadState.DONE
      surface.renderable = true
    }
    this.syncImagery(tile, surface)
    this.advanceImagery(surface)
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
    const indices =
      mesh.indices instanceof Uint16Array ? mesh.indices : new Uint16Array(mesh.indices)
    surface.indexBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", `tile-${tile.level}-${tile.x}-${tile.y}-ib`, PACKAGE_LABEL),
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    })
    gpu.queue.writeBuffer(surface.indexBuffer, 0, indices)
    surface.indexCount = indices.length
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
   * 匹配影像层（仅同方案 1:1）。
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
      if (!tilingSchemesCompatible(this.tilingScheme, layer.imageryProvider.tilingScheme)) {
        continue
      }
      const exists = surface.tileImagery.some(
        (item) =>
          item.loadingImagery?.imageryLayer === layer || item.readyImagery?.imageryLayer === layer,
      )
      if (exists) {
        continue
      }
      const tileImagery = layer.createTileImagery(tile.x, tile.y, tile.level)
      if (tileImagery) {
        surface.tileImagery.push(tileImagery)
      }
    }
  }

  /**
   * 推进影像解码与图集上传。
   *
   * @param surface 地表
   */
  private advanceImagery(surface: GlobeSurfaceTile): void {
    for (const tileImagery of surface.tileImagery) {
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
        indexBuffer: { buffer: surface.indexBuffer, format: "uint16" },
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
    }
    surface.freeResources()
    tile.state = QuadtreeTileLoadState.START
    tile.data = undefined
  }
}
