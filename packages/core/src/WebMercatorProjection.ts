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
import { CesiumMath } from "./CesiumMath"
import type { MapProjection } from "./MapProjection"

/**
 * 球面 Web Mercator（EPSG:3857）。
 * 对标 Cesium `Core/WebMercatorProjection.js`。
 */
export class WebMercatorProjection implements MapProjection {
  readonly _ellipsoid: Ellipsoid
  readonly _semimajorAxis: number
  readonly _oneOverSemimajorAxis: number

  /**
   * 使投影为正方形的最大纬度（南北）。
   * 等于 `mercatorAngleToGeodeticLatitude(π)`。
   */
  static MaximumLatitude = WebMercatorProjection.mercatorAngleToGeodeticLatitude(Math.PI)

  /**
   * @param ellipsoid 椭球，默认 WGS84
   */
  constructor(ellipsoid?: Ellipsoid) {
    this._ellipsoid = ellipsoid ?? Ellipsoid.WGS84
    this._semimajorAxis = this._ellipsoid.maximumRadius
    this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis
  }

  /** 投影使用的椭球 */
  get ellipsoid(): Ellipsoid {
    return this._ellipsoid
  }

  /**
   * Mercator 角 [-π, π] → 大地纬度 [-π/2, π/2]。
   *
   * @param mercatorAngle Mercator 角
   */
  static mercatorAngleToGeodeticLatitude(mercatorAngle: number): number {
    return CesiumMath.PI_OVER_TWO - 2.0 * Math.atan(Math.exp(-mercatorAngle))
  }

  /**
   * 大地纬度 → Mercator 角；超出 MaximumLatitude 时夹紧。
   *
   * @param latitude 大地纬度，弧度
   */
  static geodeticLatitudeToMercatorAngle(latitude: number): number {
    let nextLatitude = latitude
    if (nextLatitude > WebMercatorProjection.MaximumLatitude) {
      nextLatitude = WebMercatorProjection.MaximumLatitude
    } else if (nextLatitude < -WebMercatorProjection.MaximumLatitude) {
      nextLatitude = -WebMercatorProjection.MaximumLatitude
    }
    const sinLatitude = Math.sin(nextLatitude)
    return 0.5 * Math.log((1.0 + sinLatitude) / (1.0 - sinLatitude))
  }

  /**
   * 经纬高投影到 Web Mercator 米制坐标。
   *
   * @param cartographic 经纬高
   * @param result 可选结果对象
   */
  project(cartographic: Cartographic, result?: Cartesian3): Cartesian3 {
    const semimajorAxis = this._semimajorAxis
    const x = cartographic.longitude * semimajorAxis
    const y =
      WebMercatorProjection.geodeticLatitudeToMercatorAngle(cartographic.latitude) * semimajorAxis
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
   * Web Mercator 米制坐标反投影到经纬高。
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
    const latitude = WebMercatorProjection.mercatorAngleToGeodeticLatitude(
      cartesian.y * oneOverEarthSemimajorAxis,
    )
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
