/**
 * 四叉树瓦片内容提供者接口。
 */
import type { IntersectValue, TilingScheme } from "@webgpu-cesium/core"
import type { RenderItem } from "@webgpu-cesium/renderer"
import type { FrameState } from "../FrameState"
import type { QuadtreeTile } from "./QuadtreeTile"

/**
 * Globe / 其它图层实现此接口。
 */
export interface QuadtreeTileProvider {
  readonly tilingScheme: TilingScheme
  update(frameState: FrameState): void
  loadTile(tile: QuadtreeTile, frameState: FrameState): void
  computeTileVisibility(tile: QuadtreeTile, frameState: FrameState): IntersectValue
  canRefine(tile: QuadtreeTile): boolean
  showTileThisFrame(tile: QuadtreeTile, frameState: FrameState): void
  createRenderItems(tiles: readonly QuadtreeTile[], frameState: FrameState): RenderItem[]
  getLevelMaximumGeometricError(level: number): number
  freeTile(tile: QuadtreeTile): void
}
