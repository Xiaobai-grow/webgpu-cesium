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
import { Check } from "./Check"
import { defined } from "./defined"
import { Ellipsoid } from "./Ellipsoid"
import { EllipsoidTangentPlane } from "./EllipsoidTangentPlane"
import { IntersectionTests } from "./IntersectionTests"
import { CesiumMath } from "./CesiumMath"
import { Ray } from "./Ray"

const scratchCartographic = new Cartographic()
const scratchCartesian = new Cartesian3()
const scratchProjectPointOntoPlaneRay = new Ray()
const scratchProjectPointOntoPlaneRayDirection = new Cartesian3()
const scratchProjectPointOntoPlaneCartesian3 = new Cartesian3()

/**
 * 极球面立体投影点。
 * 对标 Cesium `Core/Stereographic.js`。
 */
export class Stereographic {
  position: Cartesian2
  tangentPlane: EllipsoidTangentPlane

  /**
   * 半径 0.5 的辅助球（Cesium 源注释误写成 Stereographic）。
   */
  static readonly HALF_UNIT_SPHERE: Ellipsoid = Object.freeze(new Ellipsoid(0.5, 0.5, 0.5))

  static readonly NORTH_POLE: Cartesian3 = Object.freeze(new Cartesian3(0.0, 0.0, 0.5))

  static readonly SOUTH_POLE: Cartesian3 = Object.freeze(new Cartesian3(0.0, 0.0, -0.5))

  static readonly NORTH_POLE_TANGENT_PLANE: EllipsoidTangentPlane = Object.freeze(
    new EllipsoidTangentPlane(Stereographic.NORTH_POLE, Stereographic.HALF_UNIT_SPHERE),
  )

  static readonly SOUTH_POLE_TANGENT_PLANE: EllipsoidTangentPlane = Object.freeze(
    new EllipsoidTangentPlane(Stereographic.SOUTH_POLE, Stereographic.HALF_UNIT_SPHERE),
  )

  /**
   * @param position 立体投影平面坐标
   * @param tangentPlane 切平面
   */
  constructor(position?: Cartesian2, tangentPlane?: EllipsoidTangentPlane) {
    this.position = defined(position) ? position : new Cartesian2()
    this.tangentPlane = defined(tangentPlane)
      ? tangentPlane
      : Stereographic.NORTH_POLE_TANGENT_PLANE
  }

  /** 切平面所用椭球 */
  get ellipsoid(): Ellipsoid {
    return this.tangentPlane.ellipsoid
  }

  /** 平面 x */
  get x(): number {
    return this.position.x
  }

  /** 平面 y */
  get y(): number {
    return this.position.y
  }

  /** 共形纬度 */
  get conformalLatitude(): number {
    const r = Cartesian2.magnitude(this.position)
    const d = 2 * this.ellipsoid.maximumRadius
    const sign = this.tangentPlane.plane.normal.z
    return sign * (CesiumMath.PI_OVER_TWO - 2 * Math.atan2(r, d))
  }

  /** 经度 */
  get longitude(): number {
    let longitude = CesiumMath.PI_OVER_TWO + Math.atan2(this.y, this.x)
    if (longitude > CesiumMath.PI) {
      longitude -= CesiumMath.TWO_PI
    }
    return longitude
  }

  /**
   * 按指定椭球计算大地纬度。
   *
   * @param ellipsoid 椭球
   */
  getLatitude(ellipsoid?: Ellipsoid): number {
    const nextEllipsoid = ellipsoid ?? Ellipsoid.default

    scratchCartographic.latitude = this.conformalLatitude
    scratchCartographic.longitude = this.longitude
    scratchCartographic.height = 0.0
    const cartesian = this.ellipsoid.cartographicToCartesian(scratchCartographic, scratchCartesian)
    nextEllipsoid.cartesianToCartographic(cartesian, scratchCartographic)
    return scratchCartographic.latitude
  }

  /**
   * 从 ECEF 点做极球面立体投影。
   *
   * @param cartesian ECEF 点
   * @param result 可选结果对象
   */
  static fromCartesian(cartesian: Cartesian3, result?: Stereographic): Stereographic {
    Check.defined("cartesian", cartesian)

    const sign = CesiumMath.signNotZero(cartesian.z)
    let tangentPlane = Stereographic.NORTH_POLE_TANGENT_PLANE
    let origin = Stereographic.SOUTH_POLE
    if (sign < 0) {
      tangentPlane = Stereographic.SOUTH_POLE_TANGENT_PLANE
      origin = Stereographic.NORTH_POLE
    }

    const ray = scratchProjectPointOntoPlaneRay
    ray.origin = tangentPlane.ellipsoid.scaleToGeocentricSurface(cartesian, ray.origin)
    ray.direction = Cartesian3.subtract(
      ray.origin,
      origin,
      scratchProjectPointOntoPlaneRayDirection,
    )
    Cartesian3.normalize(ray.direction, ray.direction)

    const intersectionPoint = IntersectionTests.rayPlane(
      ray,
      tangentPlane.plane,
      scratchProjectPointOntoPlaneCartesian3,
    )!
    const v = Cartesian3.subtract(intersectionPoint, origin, intersectionPoint)
    const x = Cartesian3.dot(tangentPlane.xAxis, v)
    const y = sign * Cartesian3.dot(tangentPlane.yAxis, v)

    if (!defined(result)) {
      return new Stereographic(new Cartesian2(x, y), tangentPlane)
    }

    result.position = new Cartesian2(x, y)
    result.tangentPlane = tangentPlane
    return result
  }

  /**
   * 批量从 ECEF 投影。
   *
   * @param cartesians ECEF 数组
   * @param result 可选结果数组
   */
  static fromCartesianArray(cartesians: Cartesian3[], result?: Stereographic[]): Stereographic[] {
    Check.defined("cartesians", cartesians)

    const length = cartesians.length
    if (!defined(result)) {
      result = new Array<Stereographic>(length)
    } else {
      result.length = length
    }
    for (let i = 0; i < length; i++) {
      const existing = result[i]
      result[i] = Stereographic.fromCartesian(
        cartesians[i]!,
        defined(existing) ? existing : undefined,
      )
    }
    return result
  }

  /**
   * 复制实例；源未定义时返回 undefined。
   *
   * @param stereographic 源
   * @param result 可选结果对象
   */
  static clone(stereographic?: Stereographic, result?: Stereographic): Stereographic | undefined {
    if (!defined(stereographic)) {
      return undefined
    }
    if (!defined(result)) {
      return new Stereographic(stereographic.position, stereographic.tangentPlane)
    }

    result.position = stereographic.position
    result.tangentPlane = stereographic.tangentPlane
    return result
  }
}
