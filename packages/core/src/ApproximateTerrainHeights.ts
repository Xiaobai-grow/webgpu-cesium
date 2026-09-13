/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：不捆绑 Cesium 完整 approximateTerrainHeights.json；
 * initialize() 可注入表，缺省用全球粗范围，保证无网络也能用。
 */

import { BoundingSphere } from "./BoundingSphere"
import { Cartesian2 } from "./Cartesian2"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { Check } from "./Check"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { Ellipsoid } from "./Ellipsoid"
import { GeographicTilingScheme } from "./GeographicTilingScheme"
import { Rectangle } from "./Rectangle"

const scratchDiagonalCartesianNE = new Cartesian3()
const scratchDiagonalCartesianSW = new Cartesian3()
const scratchDiagonalCartographic = new Cartographic()
const scratchCenterCartesian = new Cartesian3()
const scratchSurfaceCartesian = new Cartesian3()
const scratchBoundingSphere = new BoundingSphere()
const tilingScheme = new GeographicTilingScheme()
const scratchCorners = [
  new Cartographic(),
  new Cartographic(),
  new Cartographic(),
  new Cartographic(),
]
const scratchTileXY = new Cartesian2()

/** 瓦片键 → [min, max] 米 */
export type ApproximateTerrainHeightTable = Record<string, readonly [number, number]>

const DEFAULT_TABLE: ApproximateTerrainHeightTable = {
  "0-0-0": [-11000, 8900],
  "0-1-0": [-11000, 8900],
}

function getTileXYLevel(
  rectangle: Rectangle,
  maxLevel: number,
): { x: number; y: number; level: number } | undefined {
  Cartographic.fromRadians(rectangle.east, rectangle.north, 0.0, scratchCorners[0])
  Cartographic.fromRadians(rectangle.west, rectangle.north, 0.0, scratchCorners[1])
  Cartographic.fromRadians(rectangle.east, rectangle.south, 0.0, scratchCorners[2])
  Cartographic.fromRadians(rectangle.west, rectangle.south, 0.0, scratchCorners[3])

  let lastLevelX = 0
  let lastLevelY = 0
  let currentX = 0
  let currentY = 0
  let i = 0
  for (i = 0; i <= maxLevel; ++i) {
    let failed = false
    for (let j = 0; j < 4; ++j) {
      const corner = scratchCorners[j]
      if (corner === undefined) {
        failed = true
        break
      }
      const xy = tilingScheme.positionToTileXY(corner, i, scratchTileXY)
      if (!defined(xy)) {
        failed = true
        break
      }
      if (j === 0) {
        currentX = xy.x
        currentY = xy.y
      } else if (currentX !== xy.x || currentY !== xy.y) {
        failed = true
        break
      }
    }
    if (failed) {
      break
    }
    lastLevelX = currentX
    lastLevelY = currentY
  }
  if (i === 0) {
    return undefined
  }
  return {
    x: lastLevelX,
    y: lastLevelY,
    level: i > maxLevel ? maxLevel : i - 1,
  }
}

/**
 * 粗略地形高程范围。对标 Cesium `Core/ApproximateTerrainHeights.js`。
 */
export const ApproximateTerrainHeights = {
  _terrainHeightsMaxLevel: 6,
  _defaultMaxTerrainHeight: 9000.0,
  _defaultMinTerrainHeight: -100000.0,
  _terrainHeights: undefined as ApproximateTerrainHeightTable | undefined,
  _initPromise: undefined as Promise<void> | undefined,

  /**
   * 初始化高程表。可注入 JSON；否则用内置全球粗范围。
   *
   * @param heights 可选 `level-x-y` → `[min, max]`
   */
  initialize(heights?: ApproximateTerrainHeightTable): Promise<void> {
    if (defined(this._initPromise) && heights === undefined) {
      return this._initPromise
    }
    this._terrainHeights = heights ?? DEFAULT_TABLE
    this._initPromise = Promise.resolve()
    return this._initPromise
  },

  get initialized(): boolean {
    return defined(this._terrainHeights)
  },

  /**
   * 矩形内近似最小 / 最大地形高。
   *
   * @param rectangle 查询矩形
   * @param ellipsoid 椭球
   */
  getMinimumMaximumHeights(
    rectangle: Rectangle,
    ellipsoid?: Ellipsoid,
  ): { minimumTerrainHeight: number; maximumTerrainHeight: number } {
    Check.defined("rectangle", rectangle)
    if (!defined(this._terrainHeights)) {
      throw new DeveloperError(
        "You must call ApproximateTerrainHeights.initialize and wait for the promise to resolve before using this function",
      )
    }
    const ellip = ellipsoid ?? Ellipsoid.default
    const xyLevel = getTileXYLevel(rectangle, this._terrainHeightsMaxLevel)
    let minTerrainHeight = this._defaultMinTerrainHeight
    let maxTerrainHeight = this._defaultMaxTerrainHeight
    if (defined(xyLevel)) {
      const key = `${xyLevel.level}-${xyLevel.x}-${xyLevel.y}`
      const heights = this._terrainHeights[key]
      if (defined(heights)) {
        minTerrainHeight = heights[0]
        maxTerrainHeight = heights[1]
      }
      ellip.cartographicToCartesian(
        Rectangle.northeast(rectangle, scratchDiagonalCartographic),
        scratchDiagonalCartesianNE,
      )
      ellip.cartographicToCartesian(
        Rectangle.southwest(rectangle, scratchDiagonalCartographic),
        scratchDiagonalCartesianSW,
      )
      Cartesian3.midpoint(
        scratchDiagonalCartesianSW,
        scratchDiagonalCartesianNE,
        scratchCenterCartesian,
      )
      const surfacePosition = ellip.scaleToGeodeticSurface(
        scratchCenterCartesian,
        scratchSurfaceCartesian,
      )
      if (defined(surfacePosition)) {
        const distance = Cartesian3.distance(scratchCenterCartesian, surfacePosition)
        minTerrainHeight = Math.min(minTerrainHeight, -distance)
      } else {
        minTerrainHeight = this._defaultMinTerrainHeight
      }
    }
    minTerrainHeight = Math.max(this._defaultMinTerrainHeight, minTerrainHeight)
    return {
      minimumTerrainHeight: minTerrainHeight,
      maximumTerrainHeight: maxTerrainHeight,
    }
  },

  /**
   * 用近似高程估计包围球。
   *
   * @param rectangle 矩形
   * @param ellipsoid 椭球
   */
  getBoundingSphere(rectangle: Rectangle, ellipsoid?: Ellipsoid): BoundingSphere {
    Check.defined("rectangle", rectangle)
    if (!defined(this._terrainHeights)) {
      throw new DeveloperError(
        "You must call ApproximateTerrainHeights.initialize and wait for the promise to resolve before using this function",
      )
    }
    const ellip = ellipsoid ?? Ellipsoid.default
    const xyLevel = getTileXYLevel(rectangle, this._terrainHeightsMaxLevel)
    let maxTerrainHeight = this._defaultMaxTerrainHeight
    if (defined(xyLevel)) {
      const key = `${xyLevel.level}-${xyLevel.x}-${xyLevel.y}`
      const heights = this._terrainHeights[key]
      if (defined(heights)) {
        maxTerrainHeight = heights[1]
      }
    }
    const result = BoundingSphere.fromRectangle3D(rectangle, ellip, 0.0)
    BoundingSphere.fromRectangle3D(rectangle, ellip, maxTerrainHeight, scratchBoundingSphere)
    return BoundingSphere.union(result, scratchBoundingSphere, result)
  },
}
