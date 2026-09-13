/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { AxisAlignedBoundingBox } from "./AxisAlignedBoundingBox"
import { Cartesian2 } from "./Cartesian2"
import { Cartesian3 } from "./Cartesian3"
import { Cartesian4 } from "./Cartesian4"
import { Check } from "./Check"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { Ellipsoid } from "./Ellipsoid"
import { IntersectionTests } from "./IntersectionTests"
import { Matrix4 } from "./Matrix4"
import { Plane } from "./Plane"
import { Ray } from "./Ray"
import { Transforms } from "./Transforms"

const scratchCart4 = new Cartesian4()
const tmpBox = new AxisAlignedBoundingBox()
const scratchProjectPointOntoPlaneRay = new Ray()
const scratchProjectPointOntoPlaneCartesian3 = new Cartesian3()
const projectPointsOntoEllipsoidScratch = new Cartesian3()

/**
 * 椭球表面一点的切平面。
 * 对标 Cesium `Core/EllipsoidTangentPlane.js`。
 */
export class EllipsoidTangentPlane {
  readonly _ellipsoid: Ellipsoid
  readonly _origin: Cartesian3
  readonly _xAxis: Cartesian3
  readonly _yAxis: Cartesian3
  readonly _plane: Plane

  /**
   * @param origin 切点（不在表面时先投影）
   * @param ellipsoid 椭球
   */
  constructor(origin: Cartesian3, ellipsoid?: Ellipsoid) {
    Check.defined("origin", origin)

    const nextEllipsoid = ellipsoid ?? Ellipsoid.default
    const surfaceOrigin = nextEllipsoid.scaleToGeodeticSurface(origin)

    if (!defined(surfaceOrigin)) {
      throw new DeveloperError("origin must not be at the center of the ellipsoid.")
    }

    const eastNorthUpToFixedFrame = (
      Transforms as unknown as {
        eastNorthUpToFixedFrame: (
          origin: Cartesian3,
          ellipsoid?: Ellipsoid,
          result?: Matrix4,
        ) => Matrix4
      }
    ).eastNorthUpToFixedFrame
    const eastNorthUp = eastNorthUpToFixedFrame(surfaceOrigin, nextEllipsoid)
    this._ellipsoid = nextEllipsoid
    this._origin = surfaceOrigin
    this._xAxis = Cartesian3.fromCartesian4(Matrix4.getColumn(eastNorthUp, 0, scratchCart4))!
    this._yAxis = Cartesian3.fromCartesian4(Matrix4.getColumn(eastNorthUp, 1, scratchCart4))!

    const normal = Cartesian3.fromCartesian4(Matrix4.getColumn(eastNorthUp, 2, scratchCart4))!
    this._plane = Plane.fromPointNormal(surfaceOrigin, normal)
  }

  /** 椭球 */
  get ellipsoid(): Ellipsoid {
    return this._ellipsoid
  }

  /** 切点 */
  get origin(): Cartesian3 {
    return this._origin
  }

  /** 切平面 */
  get plane(): Plane {
    return this._plane
  }

  /** 局部东向 */
  get xAxis(): Cartesian3 {
    return this._xAxis
  }

  /** 局部北向 */
  get yAxis(): Cartesian3 {
    return this._yAxis
  }

  /** 局部天顶 */
  get zAxis(): Cartesian3 {
    return this._plane.normal
  }

  /**
   * 用点集 AABB 中心创建切平面。
   *
   * @param cartesians 点集
   * @param ellipsoid 椭球
   */
  static fromPoints(cartesians: Cartesian3[], ellipsoid?: Ellipsoid): EllipsoidTangentPlane {
    Check.defined("cartesians", cartesians)
    const box = AxisAlignedBoundingBox.fromPoints(cartesians, tmpBox)
    return new EllipsoidTangentPlane(box.center, ellipsoid)
  }

  /**
   * 从椭球中心沿径向投影到切平面。
   *
   * @param cartesian ECEF 点
   * @param result 可选结果对象
   */
  projectPointOntoPlane(cartesian: Cartesian3, result?: Cartesian2): Cartesian2 | undefined {
    Check.defined("cartesian", cartesian)

    const ray = scratchProjectPointOntoPlaneRay
    ray.origin = cartesian
    Cartesian3.normalize(cartesian, ray.direction)

    let intersectionPoint = IntersectionTests.rayPlane(
      ray,
      this._plane,
      scratchProjectPointOntoPlaneCartesian3,
    )
    if (!defined(intersectionPoint)) {
      Cartesian3.negate(ray.direction, ray.direction)
      intersectionPoint = IntersectionTests.rayPlane(
        ray,
        this._plane,
        scratchProjectPointOntoPlaneCartesian3,
      )
    }

    if (defined(intersectionPoint)) {
      const v = Cartesian3.subtract(intersectionPoint, this._origin, intersectionPoint)
      const x = Cartesian3.dot(this._xAxis, v)
      const y = Cartesian3.dot(this._yAxis, v)

      if (!defined(result)) {
        return new Cartesian2(x, y)
      }
      result.x = x
      result.y = y
      return result
    }
    return undefined
  }

  /**
   * 批量径向投影；失败的点会被丢掉。
   *
   * @param cartesians ECEF 数组
   * @param result 可选结果数组
   */
  projectPointsOntoPlane(cartesians: Cartesian3[], result?: Cartesian2[]): Cartesian2[] {
    Check.defined("cartesians", cartesians)

    if (!defined(result)) {
      result = []
    }

    let count = 0
    const length = cartesians.length
    for (let i = 0; i < length; i++) {
      const existing = result[count]
      const p = this.projectPointOntoPlane(cartesians[i]!, defined(existing) ? existing : undefined)
      if (defined(p)) {
        result[count] = p
        count++
      }
    }
    result.length = count
    return result
  }

  /**
   * 沿平面法线投影到切平面。
   *
   * @param cartesian ECEF 点
   * @param result 可选结果对象
   */
  projectPointToNearestOnPlane(cartesian: Cartesian3, result?: Cartesian2): Cartesian2 {
    Check.defined("cartesian", cartesian)

    if (!defined(result)) {
      result = new Cartesian2()
    }

    const ray = scratchProjectPointOntoPlaneRay
    ray.origin = cartesian
    Cartesian3.clone(this._plane.normal, ray.direction)

    let intersectionPoint = IntersectionTests.rayPlane(
      ray,
      this._plane,
      scratchProjectPointOntoPlaneCartesian3,
    )
    if (!defined(intersectionPoint)) {
      Cartesian3.negate(ray.direction, ray.direction)
      intersectionPoint = IntersectionTests.rayPlane(
        ray,
        this._plane,
        scratchProjectPointOntoPlaneCartesian3,
      )!
    }

    const v = Cartesian3.subtract(intersectionPoint, this._origin, intersectionPoint)
    const x = Cartesian3.dot(this._xAxis, v)
    const y = Cartesian3.dot(this._yAxis, v)

    result.x = x
    result.y = y
    return result
  }

  /**
   * 批量沿法线投影。
   *
   * @param cartesians ECEF 数组
   * @param result 可选结果数组
   */
  projectPointsToNearestOnPlane(cartesians: Cartesian3[], result?: Cartesian2[]): Cartesian2[] {
    Check.defined("cartesians", cartesians)

    if (!defined(result)) {
      result = []
    }

    const length = cartesians.length
    result.length = length
    for (let i = 0; i < length; i++) {
      const existing = result[i]
      result[i] = this.projectPointToNearestOnPlane(
        cartesians[i]!,
        defined(existing) ? existing : undefined,
      )
    }
    return result
  }

  /**
   * 切平面 2D 点投影回椭球面。
   *
   * @param cartesian 切平面坐标
   * @param result 可选结果对象
   */
  projectPointOntoEllipsoid(cartesian: Cartesian2, result?: Cartesian3): Cartesian3 {
    Check.defined("cartesian", cartesian)

    if (!defined(result)) {
      result = new Cartesian3()
    }

    const ellipsoid = this._ellipsoid
    const origin = this._origin
    const xAxis = this._xAxis
    const yAxis = this._yAxis
    const tmp = projectPointsOntoEllipsoidScratch

    Cartesian3.multiplyByScalar(xAxis, cartesian.x, tmp)
    result = Cartesian3.add(origin, tmp, result)
    Cartesian3.multiplyByScalar(yAxis, cartesian.y, tmp)
    Cartesian3.add(result, tmp, result)
    ellipsoid.scaleToGeocentricSurface(result, result)
    return result
  }

  /**
   * 批量投影回椭球面。
   *
   * @param cartesians 切平面坐标数组
   * @param result 可选结果数组
   */
  projectPointsOntoEllipsoid(cartesians: Cartesian2[], result?: Cartesian3[]): Cartesian3[] {
    Check.defined("cartesians", cartesians)

    const length = cartesians.length
    if (!defined(result)) {
      result = new Array<Cartesian3>(length)
    } else {
      result.length = length
    }

    for (let i = 0; i < length; ++i) {
      const existing = result[i]
      result[i] = this.projectPointOntoEllipsoid(
        cartesians[i]!,
        defined(existing) ? existing : undefined,
      )
    }

    return result
  }
}
