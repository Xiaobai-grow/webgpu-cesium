/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Cartesian2 } from "./Cartesian2"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { Frozen } from "./Frozen"
import { defined } from "./defined"
import { Ellipsoid } from "./Ellipsoid"
import { Rectangle } from "./Rectangle"
import { WebMercatorProjection } from "./WebMercatorProjection"
import type { MapProjection } from "./MapProjection"
import type { TilingScheme } from "./TilingScheme"

const southwestScratch = new Cartographic()
const northeastScratch = new Cartographic()
const southwestCartesianScratch = new Cartesian3()
const northeastCartesianScratch = new Cartesian3()

/**
 * WebMercatorTilingScheme 构造选项。
 */
export interface WebMercatorTilingSchemeOptions {
  ellipsoid?: Ellipsoid
  numberOfLevelZeroTilesX?: number
  numberOfLevelZeroTilesY?: number
  rectangleSouthwestInMeters?: Cartesian2
  rectangleNortheastInMeters?: Cartesian2
}

/**
 * Web Mercator（EPSG:3857）瓦片方案，默认覆盖全球正方形。
 * 对标 Cesium `Core/WebMercatorTilingScheme.js`。
 */
export class WebMercatorTilingScheme implements TilingScheme {
  readonly _ellipsoid: Ellipsoid
  readonly _numberOfLevelZeroTilesX: number
  readonly _numberOfLevelZeroTilesY: number
  readonly _projection: WebMercatorProjection
  readonly _rectangleSouthwestInMeters: Cartesian2
  readonly _rectangleNortheastInMeters: Cartesian2
  readonly _rectangle: Rectangle

  /**
   * @param options 椭球 / 0 级瓦片数 / 米制范围
   */
  constructor(options?: WebMercatorTilingSchemeOptions) {
    const opts = options ?? Frozen.EMPTY_OBJECT

    this._ellipsoid = opts.ellipsoid ?? Ellipsoid.default
    this._numberOfLevelZeroTilesX = opts.numberOfLevelZeroTilesX ?? 1
    this._numberOfLevelZeroTilesY = opts.numberOfLevelZeroTilesY ?? 1
    this._projection = new WebMercatorProjection(this._ellipsoid)

    if (defined(opts.rectangleSouthwestInMeters) && defined(opts.rectangleNortheastInMeters)) {
      this._rectangleSouthwestInMeters = opts.rectangleSouthwestInMeters
      this._rectangleNortheastInMeters = opts.rectangleNortheastInMeters
    } else {
      const semimajorAxisTimesPi = this._ellipsoid.maximumRadius * Math.PI
      this._rectangleSouthwestInMeters = new Cartesian2(
        -semimajorAxisTimesPi,
        -semimajorAxisTimesPi,
      )
      this._rectangleNortheastInMeters = new Cartesian2(semimajorAxisTimesPi, semimajorAxisTimesPi)
    }

    let { x, y } = this._rectangleSouthwestInMeters
    Cartesian3.fromElements(x, y, 0, southwestCartesianScratch)
    this._projection.unproject(southwestCartesianScratch, southwestScratch)

    ;({ x, y } = this._rectangleNortheastInMeters)
    Cartesian3.fromElements(x, y, 0, northeastCartesianScratch)
    this._projection.unproject(northeastCartesianScratch, northeastScratch)

    this._rectangle = new Rectangle(
      southwestScratch.longitude,
      southwestScratch.latitude,
      northeastScratch.longitude,
      northeastScratch.latitude,
    )
  }

  /** 被剖分的椭球 */
  get ellipsoid(): Ellipsoid {
    return this._ellipsoid
  }

  /** 覆盖范围（弧度） */
  get rectangle(): Rectangle {
    return this._rectangle
  }

  /** Web Mercator 投影 */
  get projection(): MapProjection {
    return this._projection
  }

  /**
   * 指定 LOD 的 X 方向瓦片数。
   *
   * @param level LOD
   */
  getNumberOfXTilesAtLevel(level: number): number {
    return this._numberOfLevelZeroTilesX << level
  }

  /**
   * 指定 LOD 的 Y 方向瓦片数。
   *
   * @param level LOD
   */
  getNumberOfYTilesAtLevel(level: number): number {
    return this._numberOfLevelZeroTilesY << level
  }

  /**
   * 经纬矩形转为 Web Mercator 米制矩形。
   *
   * @param rectangle 经纬矩形
   * @param result 可选结果对象
   */
  rectangleToNativeRectangle(rectangle: Rectangle, result?: Rectangle): Rectangle {
    const projection = this._projection
    const southwest = projection.project(Rectangle.southwest(rectangle))
    const northeast = projection.project(Rectangle.northeast(rectangle))

    if (!defined(result)) {
      return new Rectangle(southwest.x, southwest.y, northeast.x, northeast.y)
    }

    result.west = southwest.x
    result.south = southwest.y
    result.east = northeast.x
    result.north = northeast.y
    return result
  }

  /**
   * 瓦片索引转为米制本地矩形。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param result 可选结果对象
   */
  tileXYToNativeRectangle(x: number, y: number, level: number, result?: Rectangle): Rectangle {
    const xTiles = this.getNumberOfXTilesAtLevel(level)
    const yTiles = this.getNumberOfYTilesAtLevel(level)

    const xTileWidth =
      (this._rectangleNortheastInMeters.x - this._rectangleSouthwestInMeters.x) / xTiles
    const west = this._rectangleSouthwestInMeters.x + x * xTileWidth
    const east = this._rectangleSouthwestInMeters.x + (x + 1) * xTileWidth

    const yTileHeight =
      (this._rectangleNortheastInMeters.y - this._rectangleSouthwestInMeters.y) / yTiles
    const north = this._rectangleNortheastInMeters.y - y * yTileHeight
    const south = this._rectangleNortheastInMeters.y - (y + 1) * yTileHeight

    if (!defined(result)) {
      return new Rectangle(west, south, east, north)
    }

    result.west = west
    result.south = south
    result.east = east
    result.north = north
    return result
  }

  /**
   * 瓦片索引转为经纬矩形。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param result 可选结果对象
   */
  tileXYToRectangle(x: number, y: number, level: number, result?: Rectangle): Rectangle {
    const nativeRectangle = this.tileXYToNativeRectangle(x, y, level, result)

    const projection = this._projection
    const southwest = projection.unproject(
      new Cartesian3(nativeRectangle.west, nativeRectangle.south),
    )
    const northeast = projection.unproject(
      new Cartesian3(nativeRectangle.east, nativeRectangle.north),
    )

    nativeRectangle.west = southwest.longitude
    nativeRectangle.south = southwest.latitude
    nativeRectangle.east = northeast.longitude
    nativeRectangle.north = northeast.latitude
    return nativeRectangle
  }

  /**
   * 经纬高所在瓦片 XY；范围外返回 undefined。
   *
   * @param position 经纬高
   * @param level LOD
   * @param result 可选结果对象
   */
  positionToTileXY(
    position: Cartographic,
    level: number,
    result?: Cartesian2,
  ): Cartesian2 | undefined {
    const rectangle = this._rectangle
    if (!Rectangle.contains(rectangle, position)) {
      return undefined
    }

    const xTiles = this.getNumberOfXTilesAtLevel(level)
    const yTiles = this.getNumberOfYTilesAtLevel(level)

    const overallWidth = this._rectangleNortheastInMeters.x - this._rectangleSouthwestInMeters.x
    const xTileWidth = overallWidth / xTiles
    const overallHeight = this._rectangleNortheastInMeters.y - this._rectangleSouthwestInMeters.y
    const yTileHeight = overallHeight / yTiles

    const webMercatorPosition = this._projection.project(position)
    const distanceFromWest = webMercatorPosition.x - this._rectangleSouthwestInMeters.x
    const distanceFromNorth = this._rectangleNortheastInMeters.y - webMercatorPosition.y

    let xTileCoordinate = (distanceFromWest / xTileWidth) | 0
    if (xTileCoordinate >= xTiles) {
      xTileCoordinate = xTiles - 1
    }
    let yTileCoordinate = (distanceFromNorth / yTileHeight) | 0
    if (yTileCoordinate >= yTiles) {
      yTileCoordinate = yTiles - 1
    }

    if (!defined(result)) {
      return new Cartesian2(xTileCoordinate, yTileCoordinate)
    }

    result.x = xTileCoordinate
    result.y = yTileCoordinate
    return result
  }
}
