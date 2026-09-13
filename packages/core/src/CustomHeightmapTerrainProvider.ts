/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Credit } from "./Credit"
import { defined } from "./defined"
import { Ellipsoid } from "./Ellipsoid"
import { Event } from "./Event"
import { Frozen } from "./Frozen"
import { GeographicTilingScheme } from "./GeographicTilingScheme"
import { HeightmapTerrainData } from "./HeightmapTerrainData"
import type { Request } from "./Request"
import type { TerrainData } from "./TerrainData"
import { TerrainProvider } from "./TerrainProvider"
import type { TileAvailability } from "./TileAvailability"
import type { TileProviderError } from "./TileProviderError"
import type { TilingScheme } from "./TilingScheme"

/** 回调：返回高度数组或 Promise */
export type CustomHeightmapGeometryCallback = (
  x: number,
  y: number,
  level: number,
) =>
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | number[]
  | Promise<
      | Int8Array
      | Uint8Array
      | Int16Array
      | Uint16Array
      | Int32Array
      | Uint32Array
      | Float32Array
      | Float64Array
      | number[]
    >
  | undefined

/** CustomHeightmapTerrainProvider 选项 */
export interface CustomHeightmapTerrainProviderOptions {
  callback: CustomHeightmapGeometryCallback
  width: number
  height: number
  tilingScheme?: TilingScheme
  ellipsoid?: Ellipsoid
  credit?: string | Credit
}

/**
 * 回调高度图地形。对标 Cesium `Core/CustomHeightmapTerrainProvider.js`。
 */
export class CustomHeightmapTerrainProvider extends TerrainProvider {
  readonly errorEvent = new Event<[TileProviderError]>()
  readonly credit: Credit | undefined
  readonly tilingScheme: TilingScheme
  readonly hasWaterMask = false
  readonly hasVertexNormals = false
  readonly availability: TileAvailability | undefined = undefined
  readonly width: number
  readonly height: number
  private readonly _callback: CustomHeightmapGeometryCallback
  private readonly _levelZeroMaximumGeometricError: number

  /**
   * @param options 回调与尺寸
   */
  constructor(options: CustomHeightmapTerrainProviderOptions) {
    super()
    const opts = options ?? Frozen.EMPTY_OBJECT
    this._callback = opts.callback
    this.width = opts.width
    this.height = opts.height
    this.tilingScheme =
      opts.tilingScheme ??
      new GeographicTilingScheme({
        ellipsoid: opts.ellipsoid ?? Ellipsoid.default,
      })
    if (opts.credit instanceof Credit) {
      this.credit = opts.credit
    } else if (typeof opts.credit === "string") {
      this.credit = new Credit(opts.credit, true)
    } else {
      this.credit = undefined
    }
    this._levelZeroMaximumGeometricError =
      TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
        this.tilingScheme.ellipsoid,
        Math.max(this.width, this.height),
        this.tilingScheme.getNumberOfXTilesAtLevel(0),
      )
  }

  /**
   * 请求回调高度图。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param _request 未使用
   */
  requestTileGeometry(
    x: number,
    y: number,
    level: number,
    _request?: Request,
  ): Promise<TerrainData> | undefined {
    const promised = this._callback(x, y, level)
    if (!defined(promised)) {
      return undefined
    }
    const width = this.width
    const height = this.height
    return Promise.resolve(promised).then((heightmapData) => {
      const buffer = Array.isArray(heightmapData) ? new Float64Array(heightmapData) : heightmapData
      return new HeightmapTerrainData({
        buffer,
        width,
        height,
      })
    })
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

  loadTileDataAvailability(_x: number, _y: number, _level: number): Promise<void> | undefined {
    return undefined
  }
}
