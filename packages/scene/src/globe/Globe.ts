/**
 * Globe：四叉树 + 地形 + 影像层。
 */
import {
  type Cartesian3,
  type Cartographic,
  Color,
  Ellipsoid,
  EllipsoidTerrainProvider,
  type Ray,
  type TerrainProvider,
} from "@webgpu-cesium/core"
import type { FrameUniformsBuffer, RenderItem } from "@webgpu-cesium/renderer"
import type { GpuDevice } from "@webgpu-cesium/rhi"
import type { FrameState } from "../FrameState"
import { ImageryLayerCollection } from "../imagery/ImageryLayerCollection"
import { QuadtreePrimitive } from "../quadtree/QuadtreePrimitive"
import type { QuadtreeTile } from "../quadtree/QuadtreeTile"
import { GlobeSurfaceTileProvider } from "./GlobeSurfaceTileProvider"
import { getHeightFromTiles, pickFromTiles } from "./globeHeight"

export interface GlobeOptions {
  ellipsoid?: Ellipsoid
  terrainProvider?: TerrainProvider
  baseColor?: Color
}

/**
 * 地球装配。
 */
export class Globe {
  show = true
  baseColor: Color
  readonly ellipsoid: Ellipsoid
  readonly imageryLayers = new ImageryLayerCollection()
  verticalExaggeration = 1
  verticalExaggerationRelativeHeight = 0
  private _terrainProvider: TerrainProvider
  private _quadtree: QuadtreePrimitive | undefined
  private _provider: GlobeSurfaceTileProvider | undefined
  private _init:
    | {
        device: GpuDevice
        frameUniforms: FrameUniformsBuffer
        canvasFormat: GPUTextureFormat
      }
    | undefined

  /**
   * @param options 椭球 / 地形 / 底色
   */
  constructor(options?: GlobeOptions) {
    this.ellipsoid = options?.ellipsoid ?? Ellipsoid.default
    this._terrainProvider =
      options?.terrainProvider ?? new EllipsoidTerrainProvider({ ellipsoid: this.ellipsoid })
    this.baseColor = options?.baseColor ?? new Color(0.15, 0.35, 0.65, 1)
  }

  get terrainProvider(): TerrainProvider {
    return this._terrainProvider
  }

  set terrainProvider(value: TerrainProvider) {
    if (this._terrainProvider === value) {
      return
    }
    this._terrainProvider = value
    this.rebuildQuadtree()
  }

  /**
   * 绑定 GPU（Scene 构造时调用一次）。
   *
   * @param device GpuDevice
   * @param frameUniforms 帧 uniform
   * @param canvasFormat 颜色格式
   */
  initialize(
    device: GpuDevice,
    frameUniforms: FrameUniformsBuffer,
    canvasFormat: GPUTextureFormat,
  ): void {
    this._init = { device, frameUniforms, canvasFormat }
    this._provider = new GlobeSurfaceTileProvider({
      device,
      terrainProvider: this._terrainProvider,
      imageryLayers: this.imageryLayers,
      frameUniforms,
      baseColor: this.baseColor,
      canvasFormat,
    })
    this._quadtree = new QuadtreePrimitive({
      tileProvider: this._provider,
      maximumScreenSpaceError: 2,
      tileCacheSize: 256,
    })
  }

  get quadtree(): QuadtreePrimitive | undefined {
    return this._quadtree
  }

  get surfaceTileProvider(): GlobeSurfaceTileProvider | undefined {
    return this._provider
  }

  /**
   * 选择瓦片。
   *
   * @param frameState 帧
   */
  update(frameState: FrameState): void {
    if (!this.show || !this._quadtree || !this._provider) {
      return
    }
    this._provider.exaggeration = this.verticalExaggeration
    this._provider.exaggerationRelativeHeight = this.verticalExaggerationRelativeHeight
    this._quadtree.update(frameState)
  }

  /**
   * 收集 RenderItem。
   *
   * @param frameState 帧
   */
  createRenderItems(frameState: FrameState): RenderItem[] {
    if (!this.show || !this._quadtree) {
      return []
    }
    return this._quadtree.createRenderItems(frameState)
  }

  /**
   * 经纬处地形高（米）。无网格时返回 undefined。
   *
   * @param cartographic 经纬
   */
  getHeight(cartographic: Cartographic): number | undefined {
    if (!this._quadtree) {
      return undefined
    }
    return getHeightFromTiles(
      this._quadtree.levelZeroTiles,
      cartographic,
      this.verticalExaggeration,
      this.verticalExaggerationRelativeHeight,
    )
  }

  /**
   * 射线与地形求交。对标 Cesium `Globe.pick`。
   *
   * @param ray 世界射线
   * @param _scene 场景（API 对齐，未使用）
   * @param result 可选结果
   */
  pick(ray: Ray, _scene?: unknown, result?: Cartesian3): Cartesian3 | undefined {
    const tiles = this._quadtree?.tilesToRender
    if (!tiles || tiles.length === 0) {
      return undefined
    }
    return pickFromTiles(tiles, ray, result)
  }

  destroy(): void {
    this.freeQuadtree()
    this._provider?.atlas.destroy()
    this._quadtree = undefined
    this._provider = undefined
    this._init = undefined
  }

  /**
   * 换地形 Provider 后重建四叉树。
   */
  private rebuildQuadtree(): void {
    if (!this._init) {
      return
    }
    this.freeQuadtree()
    this._provider = new GlobeSurfaceTileProvider({
      device: this._init.device,
      terrainProvider: this._terrainProvider,
      imageryLayers: this.imageryLayers,
      frameUniforms: this._init.frameUniforms,
      baseColor: this.baseColor,
      canvasFormat: this._init.canvasFormat,
    })
    this._quadtree = new QuadtreePrimitive({
      tileProvider: this._provider,
      maximumScreenSpaceError: 2,
      tileCacheSize: 256,
    })
  }

  private freeQuadtree(): void {
    if (!this._quadtree || !this._provider) {
      return
    }
    const visit = (tile: QuadtreeTile): void => {
      this._provider?.freeTile(tile)
      if (tile.children) {
        for (const child of tile.children) {
          visit(child)
        }
      }
    }
    for (const root of this._quadtree.levelZeroTiles) {
      visit(root)
    }
    this._provider.atlas.destroy()
  }
}
