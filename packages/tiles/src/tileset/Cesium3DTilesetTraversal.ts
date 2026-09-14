/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/tiles
 */
import { Cesium3DTileRefine } from "./Cesium3DTileRefine"
import { boundingVolumeVisible } from "./TileBoundingVolume"
import type { Cesium3DTile } from "./Cesium3DTile"
import type { Cesium3DTileset } from "./Cesium3DTileset"
import type { FrameContext } from "../FrameContext"

/**
 * SSE：geometricError * height / (distance * sseDenominator)。
 *
 * @param tile 瓦片
 * @param frame 帧
 */
export function computeScreenSpaceError(tile: Cesium3DTile, frame: FrameContext): number {
  if (tile.geometricError <= 0) {
    return 0
  }
  const distance = Math.max(tile.boundingVolume.distanceToCamera(frame.camera.positionWC), 1e-3)
  const sseDenominator = frame.camera.frustum.sseDenominator ?? 1
  const height = frame.drawingBufferHeight
  return ((tile.geometricError * height) / (distance * sseDenominator)) * frame.pixelRatio
}

/**
 * 选择本帧要渲染 / 请求的瓦片。
 *
 * @param tileset 数据集
 * @param frame 帧
 */
export function selectTiles(tileset: Cesium3DTileset, frame: FrameContext): Cesium3DTile[] {
  const selected: Cesium3DTile[] = []
  if (!tileset.root || !tileset.show) {
    return selected
  }
  visit(tileset.root, tileset, frame, selected)
  return selected
}

function visit(
  tile: Cesium3DTile,
  tileset: Cesium3DTileset,
  frame: FrameContext,
  selected: Cesium3DTile[],
): void {
  tile.lastVisitedFrame = frame.frameNumber
  tile.selected = false
  if (!boundingVolumeVisible(tile.boundingVolume, frame.cullingVolume)) {
    return
  }
  const sse = computeScreenSpaceError(tile, frame)
  const meets = sse <= tileset.maximumScreenSpaceError
  const canRefine = tile.children.length > 0 && !meets
  if (canRefine) {
    if (tile.refine === Cesium3DTileRefine.ADD && tile.contentUri !== undefined) {
      selectOrRequest(tile, selected)
    }
    for (const child of tile.children) {
      visit(child, tileset, frame, selected)
    }
    return
  }
  selectOrRequest(tile, selected)
}

function selectOrRequest(tile: Cesium3DTile, selected: Cesium3DTile[]): void {
  tile.selected = true
  selected.push(tile)
  if (tile.contentUri !== undefined && !tile.contentReady) {
    void tile.requestContent()
  }
}
