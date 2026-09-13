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
import { CesiumMath } from "./CesiumMath"
import { Check } from "./Check"
import { defined } from "./defined"
import { scaleToGeodeticSurface } from "./scaleToGeodeticSurface"

/** fromCartesian 用到的椭球最小接口 */
export interface CartographicEllipsoidLike {
  oneOverRadii: Cartesian3
  oneOverRadiiSquared: Cartesian3
  _centerToleranceSquared: number
}

/**
 * 经纬高（弧度 / 米）。对标 Cesium `Core/Cartographic.js`。
 */
export class Cartographic {
  longitude: number
  latitude: number
  height: number

  static _ellipsoidOneOverRadii = new Cartesian3(
    1.0 / 6378137.0,
    1.0 / 6378137.0,
    1.0 / 6356752.3142451793,
  )
  static _ellipsoidOneOverRadiiSquared = new Cartesian3(
    1.0 / (6378137.0 * 6378137.0),
    1.0 / (6378137.0 * 6378137.0),
    1.0 / (6356752.3142451793 * 6356752.3142451793),
  )
  static _ellipsoidCenterToleranceSquared = CesiumMath.EPSILON1

  /**
   * @param longitude 经度，弧度
   * @param latitude 纬度，弧度
   * @param height 椭球高，米
   */
  constructor(longitude?: number, latitude?: number, height?: number) {
    this.longitude = longitude ?? 0.0
    this.latitude = latitude ?? 0.0
    this.height = height ?? 0.0
  }

  /**
   * 从弧度经纬高创建。
   *
   * @param longitude 经度，弧度
   * @param latitude 纬度，弧度
   * @param height 椭球高，米
   * @param result 可选结果对象
   */
  static fromRadians(
    longitude: number,
    latitude: number,
    height?: number,
    result?: Cartographic,
  ): Cartographic {
    Check.typeOf.number("longitude", longitude)
    Check.typeOf.number("latitude", latitude)
    const h = height ?? 0.0
    if (!defined(result)) {
      return new Cartographic(longitude, latitude, h)
    }
    result.longitude = longitude
    result.latitude = latitude
    result.height = h
    return result
  }

  /**
   * 从角度经纬高创建；结果仍为弧度。
   *
   * @param longitude 经度，度
   * @param latitude 纬度，度
   * @param height 椭球高，米
   * @param result 可选结果对象
   */
  static fromDegrees(
    longitude: number,
    latitude: number,
    height?: number,
    result?: Cartographic,
  ): Cartographic {
    Check.typeOf.number("longitude", longitude)
    Check.typeOf.number("latitude", latitude)
    return Cartographic.fromRadians(
      CesiumMath.toRadians(longitude),
      CesiumMath.toRadians(latitude),
      height,
      result,
    )
  }

  /**
   * 从笛卡尔点转为经纬高。点在椭球中心时返回 undefined。
   *
   * @param cartesian ECEF 位置
   * @param ellipsoid 椭球
   * @param result 可选结果对象
   */
  static fromCartesian(
    cartesian: Cartesian3,
    ellipsoid?: CartographicEllipsoidLike,
    result?: Cartographic,
  ): Cartographic | undefined {
    const oneOverRadii = defined(ellipsoid)
      ? ellipsoid.oneOverRadii
      : Cartographic._ellipsoidOneOverRadii
    const oneOverRadiiSquared = defined(ellipsoid)
      ? ellipsoid.oneOverRadiiSquared
      : Cartographic._ellipsoidOneOverRadiiSquared
    const centerToleranceSquared = defined(ellipsoid)
      ? ellipsoid._centerToleranceSquared
      : Cartographic._ellipsoidCenterToleranceSquared
    const p = scaleToGeodeticSurface(
      cartesian,
      oneOverRadii,
      oneOverRadiiSquared,
      centerToleranceSquared,
      cartesianToCartographicP,
    )
    if (!defined(p)) {
      return undefined
    }
    let n = Cartesian3.multiplyComponents(p, oneOverRadiiSquared, cartesianToCartographicN)
    n = Cartesian3.normalize(n, n)
    const h = Cartesian3.subtract(cartesian, p, cartesianToCartographicH)
    const longitude = Math.atan2(n.y, n.x)
    const latitude = Math.asin(n.z)
    const height = CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h)
    if (!defined(result)) {
      return new Cartographic(longitude, latitude, height)
    }
    result.longitude = longitude
    result.latitude = latitude
    result.height = height
    return result
  }

  /**
   * 经纬高转笛卡尔（输入为弧度）。
   *
   * @param cartographic 经纬高
   * @param ellipsoid 椭球（只需 radiiSquared）
   * @param result 可选结果对象
   */
  static toCartesian(
    cartographic: Cartographic,
    ellipsoid?: { radiiSquared: Cartesian3 },
    result?: Cartesian3,
  ): Cartesian3 {
    Check.defined("cartographic", cartographic)
    return Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height,
      ellipsoid,
      result,
    )
  }

  static clone(cartographic?: Cartographic, result?: Cartographic): Cartographic | undefined {
    if (!defined(cartographic)) {
      return undefined
    }
    if (!defined(result)) {
      return new Cartographic(cartographic.longitude, cartographic.latitude, cartographic.height)
    }
    result.longitude = cartographic.longitude
    result.latitude = cartographic.latitude
    result.height = cartographic.height
    return result
  }

  static equals(left?: Cartographic, right?: Cartographic): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left.longitude === right.longitude &&
        left.latitude === right.latitude &&
        left.height === right.height)
    )
  }

  static equalsEpsilon(left?: Cartographic, right?: Cartographic, epsilon?: number): boolean {
    const e = epsilon ?? 0
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Math.abs(left.longitude - right.longitude) <= e &&
        Math.abs(left.latitude - right.latitude) <= e &&
        Math.abs(left.height - right.height) <= e)
    )
  }

  clone(result?: Cartographic): Cartographic {
    return Cartographic.clone(this, result)!
  }

  equals(right?: Cartographic): boolean {
    return Cartographic.equals(this, right)
  }

  equalsEpsilon(right?: Cartographic, epsilon?: number): boolean {
    return Cartographic.equalsEpsilon(this, right, epsilon)
  }

  toString(): string {
    return `(${this.longitude}, ${this.latitude}, ${this.height})`
  }

  static readonly ZERO = Object.freeze(new Cartographic(0.0, 0.0, 0.0)) as Cartographic
}

const cartesianToCartographicN = new Cartesian3()
const cartesianToCartographicP = new Cartesian3()
const cartesianToCartographicH = new Cartesian3()
