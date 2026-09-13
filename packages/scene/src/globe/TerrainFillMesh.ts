/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/scene
 *
 * 偏离：Cesium 用邻边缝合；M3 用常数高度高度图填洞，避免缺瓦黑缝。
 */

import {
  ApproximateTerrainHeights,
  type Ellipsoid,
  HeightmapTessellator,
  type Rectangle,
  type TerrainMesh,
} from "@webgpu-cesium/core"

const FILL_WIDTH = 9

/**
 * 缺失地形时的填充网格。对标 Cesium `Scene/TerrainFillMesh.js` 的填洞职责。
 */
export const TerrainFillMesh = {
  /**
   * 为矩形生成填充网格。
   *
   * @param rectangle 瓦片矩形
   * @param ellipsoid 椭球
   * @param height 常数高；缺省用 ApproximateTerrainHeights 中值或 0
   * @param skirtHeight 裙边
   */
  createMesh(
    rectangle: Rectangle,
    ellipsoid: Ellipsoid,
    height?: number,
    skirtHeight = 0,
  ): TerrainMesh {
    let fillHeight = height ?? 0
    if (height === undefined && ApproximateTerrainHeights.initialized) {
      const range = ApproximateTerrainHeights.getMinimumMaximumHeights(rectangle, ellipsoid)
      fillHeight = 0.5 * (range.minimumTerrainHeight + range.maximumTerrainHeight)
      if (!Number.isFinite(fillHeight)) {
        fillHeight = 0
      }
    }
    const buffer = new Float32Array(FILL_WIDTH * FILL_WIDTH).fill(fillHeight)
    return HeightmapTessellator.computeVertices({
      heightmap: buffer,
      width: FILL_WIDTH,
      height: FILL_WIDTH,
      rectangle,
      ellipsoid,
      skirtHeight,
    })
  },
}

export { FILL_WIDTH }
