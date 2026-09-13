/**
 * Globe：四叉树 + 零高度地形 + 影像层。
 */
import {
  Color,
  Ellipsoid,
  EllipsoidTerrainProvider,
  type TerrainProvider,
} from "@webgpu-cesium/core"
import type { FrameUniformsBuffer, RenderItem } from "@webgpu-cesium/renderer"
import type { GpuDevice } from "@webgpu-cesium/rhi"
import type { FrameState } from "../FrameState"
import { ImageryLayerCollection } from "../imagery/ImageryLayerCollection"
import { QuadtreePrimitive } from "../quadtree/QuadtreePrimitive"
import { GlobeSurfaceTileProvider } from "./GlobeSurfaceTileProvider"

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
  terrainProvider: TerrainProvider
  private _quadtree: QuadtreePrimitive | undefined
  private _provider: GlobeSurfaceTileProvider | undefined

  /**
   * @param options 椭球 / 地形 / 底色
   */
  constructor(options?: GlobeOptions) {
    this.ellipsoid = options?.ellipsoid ?? Ellipsoid.default
    this.terrainProvider =
      options?.terrainProvider ?? new EllipsoidTerrainProvider({ ellipsoid: this.ellipsoid })
    this.baseColor = options?.baseColor ?? new Color(0.15, 0.35, 0.65, 1)
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
    this._provider = new GlobeSurfaceTileProvider({
      device,
      terrainProvider: this.terrainProvider,
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
    if (!this.show || !this._quadtree) {
      return
    }
    if (this._provider && this._provider.terrainProvider !== this.terrainProvider) {
      this._provider.terrainProvider = this.terrainProvider
    }
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

  destroy(): void {
    this._provider?.atlas.destroy()
    this._quadtree = undefined
    this._provider = undefined
  }
}
