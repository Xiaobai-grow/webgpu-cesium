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
import { Check } from "./Check"
import { Frozen } from "./Frozen"
import { defined } from "./defined"
import { Ellipsoid } from "./Ellipsoid"
import { GeographicProjection } from "./GeographicProjection"
import { CesiumMath } from "./CesiumMath"
import { Rectangle } from "./Rectangle"
import type { Cartographic } from "./Cartographic"
import type { MapProjection } from "./MapProjection"
import type { TilingScheme } from "./TilingScheme"

/**
 * GeographicTilingScheme 构造选项。
 */
export interface GeographicTilingSchemeOptions {
  ellipsoid?: Ellipsoid
  rectangle?: Rectangle
  numberOfLevelZeroTilesX?: number
  numberOfLevelZeroTilesY?: number
}

/**
 * 等距圆柱投影上的瓦片方案（默认 2×1 根瓦片）。
 * 对标 Cesium `Core/GeographicTilingScheme.js`。
 */
export class GeographicTilingScheme implements TilingScheme {
  readonly _ellipsoid: Ellipsoid
  readonly _rectangle: Rectangle
  readonly _projection: GeographicProjection
  readonly _numberOfLevelZeroTilesX: number
  readonly _numberOfLevelZeroTilesY: number

  /**
   * @param options 椭球 / 范围 / 0 级瓦片数
   */
  constructor(options?: GeographicTilingSchemeOptions) {
    const opts = options ?? Frozen.EMPTY_OBJECT

    this._ellipsoid = opts.ellipsoid ?? Ellipsoid.default
    this._rectangle = opts.rectangle ?? Rectangle.MAX_VALUE
    this._projection = new GeographicProjection(this._ellipsoid)
    this._numberOfLevelZeroTilesX = opts.numberOfLevelZeroTilesX ?? 2
    this._numberOfLevelZeroTilesY = opts.numberOfLevelZeroTilesY ?? 1
  }

  /** 被剖分的椭球 */
  get ellipsoid(): Ellipsoid {
    return this._ellipsoid
  }

  /** 覆盖范围（弧度） */
  get rectangle(): Rectangle {
    return this._rectangle
  }

  /** 地理投影 */
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
   * 经纬矩形转为度制本地矩形。
   *
   * @param rectangle 经纬矩形
   * @param result 可选结果对象
   */
  rectangleToNativeRectangle(rectangle: Rectangle, result?: Rectangle): Rectangle {
    Check.defined("rectangle", rectangle)

    const west = CesiumMath.toDegrees(rectangle.west)
    const south = CesiumMath.toDegrees(rectangle.south)
    const east = CesiumMath.toDegrees(rectangle.east)
    const north = CesiumMath.toDegrees(rectangle.north)

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
   * 瓦片索引转为度制本地矩形。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param result 可选结果对象
   */
  tileXYToNativeRectangle(x: number, y: number, level: number, result?: Rectangle): Rectangle {
    const rectangleRadians = this.tileXYToRectangle(x, y, level, result)
    rectangleRadians.west = CesiumMath.toDegrees(rectangleRadians.west)
    rectangleRadians.south = CesiumMath.toDegrees(rectangleRadians.south)
    rectangleRadians.east = CesiumMath.toDegrees(rectangleRadians.east)
    rectangleRadians.north = CesiumMath.toDegrees(rectangleRadians.north)
    return rectangleRadians
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
    const rectangle = this._rectangle

    const xTiles = this.getNumberOfXTilesAtLevel(level)
    const yTiles = this.getNumberOfYTilesAtLevel(level)

    const xTileWidth = rectangle.width / xTiles
    const west = x * xTileWidth + rectangle.west
    const east = (x + 1) * xTileWidth + rectangle.west

    const yTileHeight = rectangle.height / yTiles
    const north = rectangle.north - y * yTileHeight
    const south = rectangle.north - (y + 1) * yTileHeight

    if (!defined(result)) {
      result = new Rectangle(west, south, east, north)
    }

    result.west = west
    result.south = south
    result.east = east
    result.north = north
    return result
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

    const xTileWidth = rectangle.width / xTiles
    const yTileHeight = rectangle.height / yTiles

    let longitude = position.longitude
    if (rectangle.east < rectangle.west) {
      longitude += CesiumMath.TWO_PI
    }

    let xTileCoordinate = ((longitude - rectangle.west) / xTileWidth) | 0
    if (xTileCoordinate >= xTiles) {
      xTileCoordinate = xTiles - 1
    }

    let yTileCoordinate = ((rectangle.north - position.latitude) / yTileHeight) | 0
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
