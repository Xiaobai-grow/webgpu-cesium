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
import { Cartesian4 } from "./Cartesian4"
import { Check } from "./Check"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { CesiumMath } from "./CesiumMath"
import { Matrix4 } from "./Matrix4"

const scratchNormal = new Cartesian3()
const scratchCartesian = new Cartesian3()
const scratchInverseTranspose = new Matrix4()
const scratchPlaneCartesian4 = new Cartesian4()
const scratchTransformNormal = new Cartesian3()

/**
 * 断言法线已归一化。
 */
function checkNormalized(normal: Cartesian3): void {
  if (!CesiumMath.equalsEpsilon(Cartesian3.magnitude(normal), 1.0, CesiumMath.EPSILON6)) {
    throw new DeveloperError("normal must be normalized.")
  }
}

/**
 * Hessian 法式平面 `ax + by + cz + d = 0`。
 * 对标 Cesium `Core/Plane.js`。
 */
export class Plane {
  normal: Cartesian3
  distance: number

  /**
   * @param normal 已归一化法线
   * @param distance 原点到平面的有符号距离
   */
  constructor(normal: Cartesian3, distance: number) {
    Check.typeOf.object("normal", normal)
    checkNormalized(normal)
    Check.typeOf.number("distance", distance)
    this.normal = Cartesian3.clone(normal)
    this.distance = distance
  }

  /**
   * 由平面上一点与法线构造。
   *
   * @param point 平面上的点
   * @param normal 已归一化法线
   * @param result 可选结果
   */
  static fromPointNormal(point: Cartesian3, normal: Cartesian3, result?: Plane): Plane {
    Check.typeOf.object("point", point)
    Check.typeOf.object("normal", normal)
    checkNormalized(normal)
    const distance = -Cartesian3.dot(normal, point)
    if (!defined(result)) {
      return new Plane(normal, distance)
    }
    Cartesian3.clone(normal, result.normal)
    result.distance = distance
    return result
  }

  /**
   * 由 `Cartesian4 (nx, ny, nz, d)` 构造。
   *
   * @param coefficients xyz 为法线，w 为距离
   * @param result 可选结果
   */
  static fromCartesian4(coefficients: Cartesian4, result?: Plane): Plane {
    Check.typeOf.object("coefficients", coefficients)
    const normal = Cartesian3.fromCartesian4(coefficients, scratchNormal)!
    const distance = coefficients.w
    checkNormalized(normal)
    if (!defined(result)) {
      return new Plane(normal, distance)
    }
    Cartesian3.clone(normal, result.normal)
    result.distance = distance
    return result
  }

  /**
   * 点到平面的有符号最短距离。
   *
   * @param plane 平面
   * @param point 点
   */
  static getPointDistance(plane: Plane, point: Cartesian3): number {
    Check.typeOf.object("plane", plane)
    Check.typeOf.object("point", point)
    return Cartesian3.dot(plane.normal, point) + plane.distance
  }

  /**
   * 把点投影到平面上。
   *
   * @param plane 平面
   * @param point 点
   * @param result 可选结果
   */
  static projectPointOntoPlane(plane: Plane, point: Cartesian3, result?: Cartesian3): Cartesian3 {
    Check.typeOf.object("plane", plane)
    Check.typeOf.object("point", point)
    const out = defined(result) ? result : new Cartesian3()
    const pointDistance = Plane.getPointDistance(plane, point)
    const scaledNormal = Cartesian3.multiplyByScalar(plane.normal, pointDistance, scratchCartesian)
    return Cartesian3.subtract(point, scaledNormal, out)
  }

  /**
   * 用 4×4 变换矩阵变换平面（先逆转置再归一化到 Hessian 法式）。
   *
   * @param plane 平面
   * @param transform 变换
   * @param result 可选结果
   */
  static transform(plane: Plane, transform: Matrix4, result?: Plane): Plane {
    Check.typeOf.object("plane", plane)
    Check.typeOf.object("transform", transform)
    const inverseTranspose = Matrix4.inverseTranspose(transform, scratchInverseTranspose)
    let planeAsCartesian4 = Cartesian4.fromElements(
      plane.normal.x,
      plane.normal.y,
      plane.normal.z,
      plane.distance,
      scratchPlaneCartesian4,
    )
    planeAsCartesian4 = Matrix4.multiplyByVector(
      inverseTranspose,
      planeAsCartesian4,
      planeAsCartesian4,
    )
    const transformedNormal = Cartesian3.fromCartesian4(planeAsCartesian4, scratchTransformNormal)!
    planeAsCartesian4 = Cartesian4.divideByScalar(
      planeAsCartesian4,
      Cartesian3.magnitude(transformedNormal),
      planeAsCartesian4,
    )
    return Plane.fromCartesian4(planeAsCartesian4, result)
  }

  /**
   * 复制平面。
   *
   * @param plane 源
   * @param result 可选结果
   */
  static clone(plane: Plane, result?: Plane): Plane {
    Check.typeOf.object("plane", plane)
    if (!defined(result)) {
      return new Plane(plane.normal, plane.distance)
    }
    Cartesian3.clone(plane.normal, result.normal)
    result.distance = plane.distance
    return result
  }

  /**
   * 法线与距离均相等时返回 true。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left: Plane, right: Plane): boolean {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    return left.distance === right.distance && Cartesian3.equals(left.normal, right.normal)
  }

  /** 过原点、法线 +Z 的 XY 平面 */
  static readonly ORIGIN_XY_PLANE: Plane = Object.freeze(new Plane(Cartesian3.UNIT_Z, 0.0))

  /** 过原点、法线 +X 的 YZ 平面 */
  static readonly ORIGIN_YZ_PLANE: Plane = Object.freeze(new Plane(Cartesian3.UNIT_X, 0.0))

  /** 过原点、法线 +Y 的 ZX 平面 */
  static readonly ORIGIN_ZX_PLANE: Plane = Object.freeze(new Plane(Cartesian3.UNIT_Y, 0.0))
}
