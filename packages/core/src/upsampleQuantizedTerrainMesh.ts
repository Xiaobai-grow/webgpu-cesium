/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：上采样输出规则高度图（17×17），再走 HeightmapTerrainData，
 * 而不是再编码一份 quantized-mesh。数值与三角形插值一致。
 */

import { HeightmapTerrainData } from "./HeightmapTerrainData"
import type { QuantizedMeshTerrainData } from "./QuantizedMeshTerrainData"
import type { TerrainData } from "./TerrainData"
import type { TilingScheme } from "./TilingScheme"

const UPSAMPLE_WIDTH = 17

/**
 * 把量化网格上采样为子瓦片高度图。
 *
 * @param parent 父数据
 * @param tilingScheme 方案
 * @param thisX 父列
 * @param thisY 父行
 * @param thisLevel 父 LOD
 * @param descendantX 子列
 * @param descendantY 子行
 * @param descendantLevel 子 LOD
 */
export function upsampleQuantizedTerrainMesh(
  parent: QuantizedMeshTerrainData,
  tilingScheme: TilingScheme,
  thisX: number,
  thisY: number,
  thisLevel: number,
  descendantX: number,
  descendantY: number,
  descendantLevel: number,
): Promise<TerrainData> {
  const sourceRectangle = tilingScheme.tileXYToRectangle(thisX, thisY, thisLevel)
  const destinationRectangle = tilingScheme.tileXYToRectangle(
    descendantX,
    descendantY,
    descendantLevel,
  )
  const buffer = new Float32Array(UPSAMPLE_WIDTH * UPSAMPLE_WIDTH)
  for (let row = 0; row < UPSAMPLE_WIDTH; row++) {
    const latitude =
      destinationRectangle.north -
      (destinationRectangle.north - destinationRectangle.south) * (row / (UPSAMPLE_WIDTH - 1))
    for (let col = 0; col < UPSAMPLE_WIDTH; col++) {
      const longitude =
        destinationRectangle.west +
        (destinationRectangle.east - destinationRectangle.west) * (col / (UPSAMPLE_WIDTH - 1))
      buffer[row * UPSAMPLE_WIDTH + col] =
        parent.interpolateHeight(sourceRectangle, longitude, latitude) ?? 0
    }
  }
  return Promise.resolve(
    new HeightmapTerrainData({
      buffer,
      width: UPSAMPLE_WIDTH,
      height: UPSAMPLE_WIDTH,
      childTileMask: 0,
      createdByUpsampling: true,
    }),
  )
}

export { UPSAMPLE_WIDTH }
