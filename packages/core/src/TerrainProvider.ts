/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import type { Credit } from "./Credit"
import type { Ellipsoid } from "./Ellipsoid"
import type { Event } from "./Event"
import type { Request } from "./Request"
import type { TerrainData } from "./TerrainData"
import type { TileProviderError } from "./TileProviderError"
import type { TilingScheme } from "./TilingScheme"

/**
 * 地形 Provider 基类。对标 Cesium `Core/TerrainProvider.js`。
 */
export abstract class TerrainProvider {
  /** 高度图几何误差质量系数（Cesium 默认 0.25） */
  static heightmapTerrainQuality = 0.25

  abstract readonly errorEvent: Event<[TileProviderError]>
  abstract readonly credit: Credit | undefined
  abstract readonly tilingScheme: TilingScheme
  abstract readonly hasWaterMask: boolean
  abstract readonly hasVertexNormals: boolean
  abstract readonly availability: undefined

  /**
   * 由高度图估计 0 级几何误差。
   *
   * @param ellipsoid 椭球
   * @param tileImageWidth 高度图宽度
   * @param numberOfTilesAtLevelZero 0 级 X 向瓦片数
   */
  static getEstimatedLevelZeroGeometricErrorForAHeightmap(
    ellipsoid: Ellipsoid,
    tileImageWidth: number,
    numberOfTilesAtLevelZero: number,
  ): number {
    return (
      (ellipsoid.maximumRadius * 2 * Math.PI * TerrainProvider.heightmapTerrainQuality) /
      (tileImageWidth * numberOfTilesAtLevelZero)
    )
  }

  /**
   * 请求瓦片几何。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param request 可选调度请求
   */
  abstract requestTileGeometry(
    x: number,
    y: number,
    level: number,
    request?: Request,
  ): Promise<TerrainData> | undefined

  /**
   * 指定 LOD 的最大几何误差。
   *
   * @param level LOD
   */
  abstract getLevelMaximumGeometricError(level: number): number

  /**
   * 瓦片是否可用。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   */
  abstract getTileDataAvailable(x: number, y: number, level: number): boolean | undefined

  /**
   * 预加载可用性（椭球无操作）。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   */
  abstract loadTileDataAvailability(x: number, y: number, level: number): undefined
}
