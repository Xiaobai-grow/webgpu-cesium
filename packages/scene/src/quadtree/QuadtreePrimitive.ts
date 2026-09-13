/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * 四叉树选择：SSE + 视锥 + 地平线。非 1:1 移植 Cesium 的预加载祖先策略。
 */
import { Intersect, type IntersectValue, type TilingScheme } from "@webgpu-cesium/core"
import type { RenderItem } from "@webgpu-cesium/renderer"
import type { FrameState } from "../FrameState"
import { QuadtreeOccluders } from "./QuadtreeOccluders"
import { QuadtreeTile } from "./QuadtreeTile"
import { QuadtreeTileLoadState } from "./QuadtreeTileLoadState"
import type { QuadtreeTileProvider } from "./QuadtreeTileProvider"
import { TileReplacementQueue } from "./TileReplacementQueue"
import { TileSelectionResult } from "./TileSelectionResult"

export interface QuadtreePrimitiveOptions {
  tileProvider: QuadtreeTileProvider
  maximumScreenSpaceError?: number
  tileCacheSize?: number
}

/**
 * 四叉树遍历与 LOD 选择。
 */
export class QuadtreePrimitive {
  readonly tileProvider: QuadtreeTileProvider
  maximumScreenSpaceError: number
  readonly replacementQueue = new TileReplacementQueue()
  readonly occluders: QuadtreeOccluders
  levelZeroTiles: QuadtreeTile[] = []
  readonly tilesToRender: QuadtreeTile[] = []
  private _lastSelectionFrame = -1

  /**
   * @param options Provider 与 SSE
   */
  constructor(options: QuadtreePrimitiveOptions) {
    this.tileProvider = options.tileProvider
    this.maximumScreenSpaceError = options.maximumScreenSpaceError ?? 2
    this.replacementQueue.maximumCount = options.tileCacheSize ?? 256
    this.occluders = new QuadtreeOccluders(this.tilingScheme.ellipsoid)
    this.levelZeroTiles = QuadtreeTile.createLevelZeroTiles(this.tilingScheme)
  }

  get tilingScheme(): TilingScheme {
    return this.tileProvider.tilingScheme
  }

  /**
   * 选择可见瓦片并加载。
   *
   * @param frameState 帧状态
   */
  update(frameState: FrameState): void {
    this.tileProvider.update(frameState)
    this.occluders.setCameraPosition(frameState.camera.positionWC)
    this.tilesToRender.length = 0
    const sseLimit = frameState.maximumScreenSpaceError || this.maximumScreenSpaceError
    for (const root of this.levelZeroTiles) {
      this.visitTile(root, frameState, sseLimit)
    }
    this.replacementQueue.trimTiles((tile) => {
      this.tileProvider.freeTile(tile)
    })
    frameState.statistics.tilesSelected = this.tilesToRender.length
    this._lastSelectionFrame = frameState.frameNumber
  }

  /**
   * 递归访问。
   *
   * @param tile 节点
   * @param frameState 帧
   * @param sseLimit SSE 阈值
   */
  private visitTile(tile: QuadtreeTile, frameState: FrameState, sseLimit: number): IntersectValue {
    const visibility = this.tileProvider.computeTileVisibility(tile, frameState)
    if (visibility === Intersect.OUTSIDE) {
      tile.selectionResult = TileSelectionResult.CULLED
      return visibility
    }
    const sphere = tile.boundingRegion?.boundingSphere
    if (sphere && !this.occluders.isBoundingSphereVisible(sphere)) {
      tile.selectionResult = TileSelectionResult.CULLED
      return Intersect.OUTSIDE
    }

    this.tileProvider.loadTile(tile, frameState)
    const canRefine =
      this.tileProvider.canRefine(tile) && this.screenSpaceError(tile, frameState) > sseLimit
    if (canRefine) {
      const children = tile.ensureChildren(this.tilingScheme)
      const renderedBefore = this.tilesToRender.length
      for (const child of children) {
        this.visitTile(child, frameState, sseLimit)
      }
      // 子瓦片尚未入选（未就绪）时回退画本级，避免整帧空白
      if (this.tilesToRender.length > renderedBefore) {
        tile.selectionResult = TileSelectionResult.REFINED
        return Intersect.INTERSECTING
      }
    }

    if (tile.state === QuadtreeTileLoadState.DONE && tile.data?.renderable) {
      this.tilesToRender.push(tile)
      this.replacementQueue.markTileRendered(tile)
      this.tileProvider.showTileThisFrame(tile, frameState)
      tile.selectionResult = TileSelectionResult.RENDERED
      return Intersect.INSIDE
    }

    // 未就绪：尽量渲染祖先
    let ancestor = tile.parent
    while (ancestor) {
      if (ancestor.state === QuadtreeTileLoadState.DONE && ancestor.data?.renderable) {
        if (!this.tilesToRender.includes(ancestor)) {
          this.tilesToRender.push(ancestor)
          this.replacementQueue.markTileRendered(ancestor)
          this.tileProvider.showTileThisFrame(ancestor, frameState)
        }
        tile.selectionResult = TileSelectionResult.CULLED_BUT_NEEDED
        return Intersect.INTERSECTING
      }
      ancestor = ancestor.parent
    }
    tile.selectionResult = TileSelectionResult.NONE
    return Intersect.INTERSECTING
  }

  /**
   * 屏幕空间误差。
   *
   * @param tile 瓦片
   * @param frameState 帧
   */
  screenSpaceError(tile: QuadtreeTile, frameState: FrameState): number {
    const geometricError = this.tileProvider.getLevelMaximumGeometricError(tile.level)
    const distance = Math.max(
      tile.boundingRegion?.distanceToCamera(frameState.camera.positionWC) ?? 1,
      1,
    )
    const height = frameState.drawingBufferHeight
    const sseDenominator = frameState.camera.frustum.sseDenominator ?? 1
    return (geometricError * height) / (distance * sseDenominator)
  }

  /**
   * 由已选瓦片生成 RenderItem。
   *
   * @param frameState 帧
   */
  createRenderItems(frameState: FrameState): RenderItem[] {
    return this.tileProvider.createRenderItems(this.tilesToRender, frameState)
  }

  get lastSelectionFrame(): number {
    return this._lastSelectionFrame
  }
}
