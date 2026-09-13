/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { Ellipsoid } from "./Ellipsoid"
import type { MapProjection } from "./MapProjection"

/**
 * 等距圆柱 / 板卡雷投影（经纬度 × 最大半径）。
 * 对标 Cesium `Core/GeographicProjection.js`。
 */
export class GeographicProjection implements MapProjection {
  readonly _ellipsoid: Ellipsoid
  readonly _semimajorAxis: number
  readonly _oneOverSemimajorAxis: number

  /**
   * @param ellipsoid 椭球，默认 `Ellipsoid.default`
   */
  constructor(ellipsoid?: Ellipsoid) {
    this._ellipsoid = ellipsoid ?? Ellipsoid.default
    this._semimajorAxis = this._ellipsoid.maximumRadius
    this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis
  }

  /** 投影使用的椭球 */
  get ellipsoid(): Ellipsoid {
    return this._ellipsoid
  }

  /**
   * 经纬高投影：X=lon×R，Y=lat×R，Z=height。
   *
   * @param cartographic 经纬高
   * @param result 可选结果对象
   */
  project(cartographic: Cartographic, result?: Cartesian3): Cartesian3 {
    const semimajorAxis = this._semimajorAxis
    const x = cartographic.longitude * semimajorAxis
    const y = cartographic.latitude * semimajorAxis
    const z = cartographic.height

    if (!defined(result)) {
      return new Cartesian3(x, y, z)
    }

    result.x = x
    result.y = y
    result.z = z
    return result
  }

  /**
   * 反投影：lon=X/R，lat=Y/R，height=Z。
   *
   * @param cartesian 投影坐标
   * @param result 可选结果对象
   */
  unproject(cartesian: Cartesian3, result?: Cartographic): Cartographic {
    if (!defined(cartesian)) {
      throw new DeveloperError("cartesian is required")
    }

    const oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis
    const longitude = cartesian.x * oneOverEarthSemimajorAxis
    const latitude = cartesian.y * oneOverEarthSemimajorAxis
    const height = cartesian.z

    if (!defined(result)) {
      return new Cartographic(longitude, latitude, height)
    }

    result.longitude = longitude
    result.latitude = latitude
    result.height = height
    return result
  }
}
