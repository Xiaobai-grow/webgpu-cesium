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
import { Ellipsoid } from "./Ellipsoid"
import { Event } from "./Event"
import { Frozen } from "./Frozen"
import { GeographicTilingScheme } from "./GeographicTilingScheme"
import { HeightmapTerrainData } from "./HeightmapTerrainData"
import type { Request } from "./Request"
import { TerrainProvider } from "./TerrainProvider"
import type { TerrainData } from "./TerrainData"
import type { TileProviderError } from "./TileProviderError"
import type { TilingScheme } from "./TilingScheme"

/** 椭球地形选项 */
export interface EllipsoidTerrainProviderOptions {
  tilingScheme?: TilingScheme
  ellipsoid?: Ellipsoid
}

/** 与 Cesium 一致的高度图尺寸 */
export const ELLIPSOID_TERRAIN_HEIGHTMAP_WIDTH = 16

/**
 * 零高度椭球地形。对标 Cesium `Core/EllipsoidTerrainProvider.js`。
 */
export class EllipsoidTerrainProvider extends TerrainProvider {
  readonly errorEvent = new Event<[TileProviderError]>()
  readonly credit: Credit | undefined = undefined
  readonly tilingScheme: TilingScheme
  readonly hasWaterMask = false
  readonly hasVertexNormals = false
  readonly availability = undefined
  private readonly _levelZeroMaximumGeometricError: number

  /**
   * @param options 瓦片方案 / 椭球
   */
  constructor(options?: EllipsoidTerrainProviderOptions) {
    super()
    const opts = options ?? Frozen.EMPTY_OBJECT
    this.tilingScheme =
      opts.tilingScheme ??
      new GeographicTilingScheme({
        ellipsoid: opts.ellipsoid ?? Ellipsoid.default,
      })
    this._levelZeroMaximumGeometricError =
      TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
        this.tilingScheme.ellipsoid,
        64,
        this.tilingScheme.getNumberOfXTilesAtLevel(0),
      )
  }

  /**
   * 返回全零 16×16 高度图。
   *
   * @param _x 列
   * @param _y 行
   * @param _level LOD
   * @param _request 未使用
   */
  requestTileGeometry(
    _x: number,
    _y: number,
    _level: number,
    _request?: Request,
  ): Promise<TerrainData> {
    const width = ELLIPSOID_TERRAIN_HEIGHTMAP_WIDTH
    const height = ELLIPSOID_TERRAIN_HEIGHTMAP_WIDTH
    return Promise.resolve(
      new HeightmapTerrainData({
        buffer: new Uint8Array(width * height),
        width,
        height,
      }),
    )
  }

  /**
   * 指定 LOD 的最大几何误差。
   *
   * @param level LOD
   */
  getLevelMaximumGeometricError(level: number): number {
    return this._levelZeroMaximumGeometricError / (1 << level)
  }

  getTileDataAvailable(_x: number, _y: number, _level: number): boolean | undefined {
    return undefined
  }

  loadTileDataAvailability(_x: number, _y: number, _level: number): undefined {
    return undefined
  }
}
