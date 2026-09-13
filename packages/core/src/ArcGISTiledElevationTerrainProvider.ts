/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：M3 不移植 LERC 解码。encoding 为 LERC 时 requestTileGeometry 抛错；
 * 原始高度图（NONE）可加载。
 */

import { Credit } from "./Credit"
import { defined } from "./defined"
import { Ellipsoid } from "./Ellipsoid"
import { Event } from "./Event"
import { Frozen } from "./Frozen"
import { GeographicTilingScheme } from "./GeographicTilingScheme"
import { HeightmapEncoding, type HeightmapEncodingValue } from "./HeightmapEncoding"
import { HeightmapTerrainData } from "./HeightmapTerrainData"
import type { Request } from "./Request"
import { Resource } from "./Resource"
import { RuntimeError } from "./RuntimeError"
import type { TerrainData } from "./TerrainData"
import { TerrainProvider } from "./TerrainProvider"
import { TileAvailability } from "./TileAvailability"
import type { TileProviderError } from "./TileProviderError"
import type { TilingScheme } from "./TilingScheme"
import { WebMercatorTilingScheme } from "./WebMercatorTilingScheme"

/** 构造选项 */
export interface ArcGISTiledElevationTerrainProviderOptions {
  token?: string
  ellipsoid?: Ellipsoid
}

interface ArcGisServiceJson {
  copyrightText?: string
  tileInfo?: {
    rows?: number
    cols?: number
    lods?: { level: number }[]
    spatialReference?: { wkid?: number; latestWkid?: number }
  }
  cacheType?: string
  bandCount?: number
  minValues?: number[]
  maxValues?: number[]
}

/**
 * ArcGIS 高程切片。对标 Cesium `Core/ArcGISTiledElevationTerrainProvider.js`。
 */
export class ArcGISTiledElevationTerrainProvider extends TerrainProvider {
  readonly errorEvent = new Event<[TileProviderError]>()
  credit: Credit | undefined
  tilingScheme: TilingScheme
  hasWaterMask = false
  hasVertexNormals = false
  availability: TileAvailability | undefined
  private _resource: Resource
  private _width = 257
  private _height = 257
  private _encoding: HeightmapEncodingValue = HeightmapEncoding.NONE
  private _levelZeroMaximumGeometricError = 0
  private _lodCount = 0

  /**
   * @param resource 已解析服务
   * @param options token / 椭球
   */
  private constructor(resource: Resource, options?: ArcGISTiledElevationTerrainProviderOptions) {
    super()
    this._resource = resource
    this.tilingScheme = new GeographicTilingScheme({
      ellipsoid: options?.ellipsoid ?? Ellipsoid.default,
    })
  }

  /**
   * 从 ImageServer / 高程服务 URL 创建。
   *
   * @param url 服务根
   * @param options token / 椭球
   */
  static async fromUrl(
    url: string | Resource,
    options?: ArcGISTiledElevationTerrainProviderOptions,
  ): Promise<ArcGISTiledElevationTerrainProvider> {
    const opts = options ?? Frozen.EMPTY_OBJECT
    const resource = Resource.createIfNeeded(url)
    resource.appendForwardSlash()
    if (defined(opts.token)) {
      resource.setQueryParameters({ token: opts.token })
    }
    const metadataResource = resource.getDerivedResource({
      queryParameters: { f: "json" },
    })
    const json = (await metadataResource.fetchJson()) as ArcGisServiceJson
    const provider = new ArcGISTiledElevationTerrainProvider(resource, opts)
    provider.applyMetadata(json, opts.ellipsoid ?? Ellipsoid.default)
    return provider
  }

  /**
   * 应用服务 metadata。
   *
   * @param json 服务 JSON
   * @param ellipsoid 椭球
   */
  private applyMetadata(json: ArcGisServiceJson, ellipsoid: Ellipsoid): void {
    if (defined(json.copyrightText) && json.copyrightText.length > 0) {
      this.credit = new Credit(json.copyrightText, true)
    }
    const tileInfo = json.tileInfo
    this._width = tileInfo?.cols ?? 257
    this._height = tileInfo?.rows ?? 257
    this._lodCount = tileInfo?.lods?.length ?? 0
    const wkid = tileInfo?.spatialReference?.latestWkid ?? tileInfo?.spatialReference?.wkid
    if (wkid === 4326) {
      this.tilingScheme = new GeographicTilingScheme({ ellipsoid })
    } else {
      this.tilingScheme = new WebMercatorTilingScheme({ ellipsoid })
    }
    const cacheType = (json.cacheType ?? "").toLowerCase()
    this._encoding = cacheType.includes("lerc") ? HeightmapEncoding.LERC : HeightmapEncoding.NONE
    this._levelZeroMaximumGeometricError =
      TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
        this.tilingScheme.ellipsoid,
        this._width,
        this.tilingScheme.getNumberOfXTilesAtLevel(0),
      )
    if (this._lodCount > 0) {
      this.availability = new TileAvailability(this.tilingScheme, this._lodCount)
      const xTiles = this.tilingScheme.getNumberOfXTilesAtLevel(0)
      const yTiles = this.tilingScheme.getNumberOfYTilesAtLevel(0)
      this.availability.addAvailableTileRange(0, 0, 0, xTiles - 1, yTiles - 1)
    }
  }

  /**
   * 请求高程瓦片。LERC 未实现。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param request 调度
   */
  requestTileGeometry(
    x: number,
    y: number,
    level: number,
    request?: Request,
  ): Promise<TerrainData> | undefined {
    if (this._encoding === HeightmapEncoding.LERC) {
      return Promise.reject(
        new RuntimeError(
          "ArcGIS LERC terrain tiles are not decoded in M3; use raw heightmaps or CesiumTerrainProvider.",
        ),
      )
    }
    const tileResource = this._resource.getDerivedResource({
      url: `tile/${level}/${y}/${x}`,
      ...(request !== undefined ? { request } : {}),
    })
    return tileResource.fetchArrayBuffer().then((buffer) => {
      const width = this._width
      const height = this._height
      const expected = width * height
      let heightBuffer: ArrayLike<number>
      if (buffer.byteLength >= expected * 4) {
        heightBuffer = new Float32Array(buffer, 0, expected)
      } else if (buffer.byteLength >= expected * 2) {
        heightBuffer = new Uint16Array(buffer, 0, expected)
      } else {
        heightBuffer = new Uint8Array(buffer, 0, Math.min(expected, buffer.byteLength))
      }
      return new HeightmapTerrainData({
        buffer: heightBuffer,
        width,
        height,
        childTileMask: 15,
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

  getTileDataAvailable(x: number, y: number, level: number): boolean | undefined {
    if (!defined(this.availability)) {
      return undefined
    }
    return this.availability.isTileAvailable(level, x, y)
  }

  loadTileDataAvailability(_x: number, _y: number, _level: number): Promise<void> | undefined {
    return undefined
  }
}
