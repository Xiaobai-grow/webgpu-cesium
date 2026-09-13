/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Check } from "./Check"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { CesiumMath } from "./CesiumMath"
import type { TypedArray } from "./globalTypes"
import type { Spherical } from "./Spherical"

/** pack / unpack 可用的数值数组 */
export type NumberArray = number[] | TypedArray

/** fromRadians 使用的椭球半径平方；由后续 Ellipsoid 覆盖 */
export interface EllipsoidRadiiSquared {
  readonly radiiSquared: Cartesian3
}

/**
 * 三维笛卡尔点（ECEF 等）。
 * 对标 Cesium `Core/Cartesian3.js`。
 */
export class Cartesian3 {
  x: number
  y: number
  z: number

  static packedLength = 3
  /**
   * 默认 WGS84 半径平方。Ellipsoid 设置 default 时覆盖此字段，避免循环依赖。
   */
  static _ellipsoidRadiiSquared = new Cartesian3(
    6378137.0 * 6378137.0,
    6378137.0 * 6378137.0,
    6356752.3142451793 * 6356752.3142451793,
  )
  static readonly ZERO: Readonly<Cartesian3> = Object.freeze(new Cartesian3(0.0, 0.0, 0.0))
  static readonly ONE: Readonly<Cartesian3> = Object.freeze(new Cartesian3(1.0, 1.0, 1.0))
  static readonly UNIT_X: Readonly<Cartesian3> = Object.freeze(new Cartesian3(1.0, 0.0, 0.0))
  static readonly UNIT_Y: Readonly<Cartesian3> = Object.freeze(new Cartesian3(0.0, 1.0, 0.0))
  static readonly UNIT_Z: Readonly<Cartesian3> = Object.freeze(new Cartesian3(0.0, 0.0, 1.0))

  /**
   * @param x X
   * @param y Y
   * @param z Z
   */
  constructor(x?: number, y?: number, z?: number) {
    this.x = x ?? 0.0
    this.y = y ?? 0.0
    this.z = z ?? 0.0
  }

  /**
   * 球坐标转笛卡尔。
   *
   * @param spherical 球坐标
   * @param result 可选结果对象
   */
  static fromSpherical(spherical: Spherical, result?: Cartesian3): Cartesian3 {
    Check.typeOf.object("spherical", spherical)

    if (!defined(result)) {
      result = new Cartesian3()
    }

    const clock = spherical.clock
    const cone = spherical.cone
    const magnitude = spherical.magnitude ?? 1.0
    const radial = magnitude * Math.sin(cone)
    result.x = radial * Math.cos(clock)
    result.y = radial * Math.sin(clock)
    result.z = magnitude * Math.cos(cone)
    return result
  }

  /**
   * 由分量构造。
   *
   * @param x X
   * @param y Y
   * @param z Z
   * @param result 可选结果对象
   */
  static fromElements(x: number, y: number, z: number, result?: Cartesian3): Cartesian3 {
    if (!defined(result)) {
      return new Cartesian3(x, y, z)
    }
    result.x = x
    result.y = y
    result.z = z
    return result
  }

  /**
   * 复制；源未定义时返回 undefined。
   *
   * @param cartesian 源
   * @param result 可选结果对象
   */
  static clone(cartesian: Cartesian3, result?: Cartesian3): Cartesian3
  static clone(cartesian?: Cartesian3, result?: Cartesian3): Cartesian3 | undefined
  static clone(cartesian?: Cartesian3, result?: Cartesian3): Cartesian3 | undefined {
    if (!defined(cartesian)) {
      return undefined
    }
    if (!defined(result)) {
      return new Cartesian3(cartesian.x, cartesian.y, cartesian.z)
    }
    result.x = cartesian.x
    result.y = cartesian.y
    result.z = cartesian.z
    return result
  }

  /**
   * 写入连续数组。
   *
   * @param value 源
   * @param array 目标
   * @param startingIndex 起始下标
   */
  static pack(value: Cartesian3, array: NumberArray, startingIndex?: number): NumberArray {
    Check.typeOf.object("value", value)
    Check.defined("array", array)

    const index = startingIndex ?? 0
    array[index] = value.x
    array[index + 1] = value.y
    array[index + 2] = value.z
    return array
  }

  /**
   * 从连续数组读出。
   *
   * @param array 源
   * @param startingIndex 起始下标
   * @param result 可选结果对象
   */
  static unpack(array: NumberArray, startingIndex?: number, result?: Cartesian3): Cartesian3 {
    Check.defined("array", array)

    const index = startingIndex ?? 0
    if (!defined(result)) {
      result = new Cartesian3()
    }
    result.x = array[index]!
    result.y = array[index + 1]!
    result.z = array[index + 2]!
    return result
  }

  /**
   * 展平 Cartesian3 数组。
   *
   * @param array 源
   * @param result 可选目标
   */
  static packArray(array: readonly Cartesian3[], result?: NumberArray): NumberArray {
    Check.defined("array", array)

    const length = array.length
    const resultLength = length * 3
    if (!defined(result)) {
      result = new Array(resultLength)
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      throw new DeveloperError(
        "If result is a typed array, it must have exactly array.length * 3 elements",
      )
    } else if (Array.isArray(result) && result.length !== resultLength) {
      result.length = resultLength
    }

    for (let i = 0; i < length; ++i) {
      Cartesian3.pack(array[i]!, result, i * 3)
    }
    return result
  }

  /**
   * 从分量数组还原 Cartesian3 数组。
   *
   * @param array 分量
   * @param result 可选目标
   */
  static unpackArray(array: NumberArray, result?: Cartesian3[]): Cartesian3[] {
    Check.defined("array", array)
    Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 3)
    if (array.length % 3 !== 0) {
      throw new DeveloperError("array length must be a multiple of 3.")
    }

    const length = array.length
    if (!defined(result)) {
      result = new Array(length / 3)
    } else {
      result.length = length / 3
    }

    for (let i = 0; i < length; i += 3) {
      const index = i / 3
      result[index] = Cartesian3.unpack(array, i, result[index])
    }
    return result
  }

  /**
   * 从连续数组创建（unpack 别名）。
   *
   * @param array 源
   * @param startingIndex 起始下标
   * @param result 可选结果对象
   */
  static fromArray(array: NumberArray, startingIndex?: number, result?: Cartesian3): Cartesian3 {
    return Cartesian3.unpack(array, startingIndex, result)
  }

  /**
   * 取 Cartesian4 的 x/y/z（丢弃 w）。
   *
   * @param cartesian 源
   * @param result 可选结果对象
   */
  static fromCartesian4(
    cartesian?: { x: number; y: number; z: number },
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    return Cartesian3.clone(cartesian as Cartesian3 | undefined, result)
  }

  /**
   * 最大分量。
   *
   * @param cartesian 源
   */
  static maximumComponent(cartesian: Cartesian3): number {
    Check.typeOf.object("cartesian", cartesian)
    return Math.max(cartesian.x, cartesian.y, cartesian.z)
  }

  /**
   * 最小分量。
   *
   * @param cartesian 源
   */
  static minimumComponent(cartesian: Cartesian3): number {
    Check.typeOf.object("cartesian", cartesian)
    return Math.min(cartesian.x, cartesian.y, cartesian.z)
  }

  /**
   * 分量最小值。
   *
   * @param first 第一个
   * @param second 第二个
   * @param result 结果
   */
  static minimumByComponent(first: Cartesian3, second: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("first", first)
    Check.typeOf.object("second", second)
    Check.typeOf.object("result", result)
    result.x = Math.min(first.x, second.x)
    result.y = Math.min(first.y, second.y)
    result.z = Math.min(first.z, second.z)
    return result
  }

  /**
   * 分量最大值。
   *
   * @param first 第一个
   * @param second 第二个
   * @param result 结果
   */
  static maximumByComponent(first: Cartesian3, second: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("first", first)
    Check.typeOf.object("second", second)
    Check.typeOf.object("result", result)
    result.x = Math.max(first.x, second.x)
    result.y = Math.max(first.y, second.y)
    result.z = Math.max(first.z, second.z)
    return result
  }

  /**
   * 分量夹紧。
   *
   * @param value 值
   * @param min 下界
   * @param max 上界
   * @param result 结果
   */
  static clamp(
    value: Cartesian3,
    min: Cartesian3,
    max: Cartesian3,
    result: Cartesian3,
  ): Cartesian3 {
    Check.typeOf.object("value", value)
    Check.typeOf.object("min", min)
    Check.typeOf.object("max", max)
    Check.typeOf.object("result", result)
    result.x = CesiumMath.clamp(value.x, min.x, max.x)
    result.y = CesiumMath.clamp(value.y, min.y, max.y)
    result.z = CesiumMath.clamp(value.z, min.z, max.z)
    return result
  }

  /**
   * 模长平方。
   *
   * @param cartesian 源
   */
  static magnitudeSquared(cartesian: Cartesian3): number {
    Check.typeOf.object("cartesian", cartesian)
    return cartesian.x * cartesian.x + cartesian.y * cartesian.y + cartesian.z * cartesian.z
  }

  /**
   * 模长。
   *
   * @param cartesian 源
   */
  static magnitude(cartesian: Cartesian3): number {
    return Math.sqrt(Cartesian3.magnitudeSquared(cartesian))
  }

  /**
   * 两点距离。
   *
   * @param left 左点
   * @param right 右点
   */
  static distance(left: Cartesian3, right: Cartesian3): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Cartesian3.subtract(left, right, distanceScratch)
    return Cartesian3.magnitude(distanceScratch)
  }

  /**
   * 两点距离平方。
   *
   * @param left 左点
   * @param right 右点
   */
  static distanceSquared(left: Cartesian3, right: Cartesian3): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Cartesian3.subtract(left, right, distanceScratch)
    return Cartesian3.magnitudeSquared(distanceScratch)
  }

  /**
   * 单位化。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static normalize(cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    const magnitude = Cartesian3.magnitude(cartesian)
    result.x = cartesian.x / magnitude
    result.y = cartesian.y / magnitude
    result.z = cartesian.z / magnitude
    if (isNaN(result.x) || isNaN(result.y) || isNaN(result.z)) {
      throw new DeveloperError("normalized result is not a number")
    }
    return result
  }

  /**
   * 点积。
   *
   * @param left 左
   * @param right 右
   */
  static dot(left: Cartesian3, right: Cartesian3): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    return left.x * right.x + left.y * right.y + left.z * right.z
  }

  /**
   * 分量乘。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static multiplyComponents(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x * right.x
    result.y = left.y * right.y
    result.z = left.z * right.z
    return result
  }

  /**
   * 分量除。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static divideComponents(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x / right.x
    result.y = left.y / right.y
    result.z = left.z / right.z
    return result
  }

  /**
   * 分量加。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static add(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x + right.x
    result.y = left.y + right.y
    result.z = left.z + right.z
    return result
  }

  /**
   * 分量减。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static subtract(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x - right.x
    result.y = left.y - right.y
    result.z = left.z - right.z
    return result
  }

  /**
   * 数乘。
   *
   * @param cartesian 向量
   * @param scalar 标量
   * @param result 结果
   */
  static multiplyByScalar(cartesian: Cartesian3, scalar: number, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.number("scalar", scalar)
    Check.typeOf.object("result", result)
    result.x = cartesian.x * scalar
    result.y = cartesian.y * scalar
    result.z = cartesian.z * scalar
    return result
  }

  /**
   * 数除。
   *
   * @param cartesian 向量
   * @param scalar 标量
   * @param result 结果
   */
  static divideByScalar(cartesian: Cartesian3, scalar: number, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.number("scalar", scalar)
    Check.typeOf.object("result", result)
    result.x = cartesian.x / scalar
    result.y = cartesian.y / scalar
    result.z = cartesian.z / scalar
    return result
  }

  /**
   * 取负。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static negate(cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result.x = -cartesian.x
    result.y = -cartesian.y
    result.z = -cartesian.z
    return result
  }

  /**
   * 分量绝对值。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static abs(cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result.x = Math.abs(cartesian.x)
    result.y = Math.abs(cartesian.y)
    result.z = Math.abs(cartesian.z)
    return result
  }

  /**
   * 线性插值 / 外推。
   *
   * @param start t=0
   * @param end t=1
   * @param t 参数
   * @param result 结果
   */
  static lerp(start: Cartesian3, end: Cartesian3, t: number, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("start", start)
    Check.typeOf.object("end", end)
    Check.typeOf.number("t", t)
    Check.typeOf.object("result", result)
    Cartesian3.multiplyByScalar(end, t, lerpScratch)
    result = Cartesian3.multiplyByScalar(start, 1.0 - t, result)
    return Cartesian3.add(lerpScratch, result, result)
  }

  /**
   * 夹角（弧度）。
   *
   * @param left 左
   * @param right 右
   */
  static angleBetween(left: Cartesian3, right: Cartesian3): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Cartesian3.normalize(left, angleBetweenScratch)
    Cartesian3.normalize(right, angleBetweenScratch2)
    const cosine = Cartesian3.dot(angleBetweenScratch, angleBetweenScratch2)
    const sine = Cartesian3.magnitude(
      Cartesian3.cross(angleBetweenScratch, angleBetweenScratch2, angleBetweenScratch),
    )
    return Math.atan2(sine, cosine)
  }

  /**
   * 与该向量最正交的单位轴。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static mostOrthogonalAxis(cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    const f = Cartesian3.normalize(cartesian, mostOrthogonalAxisScratch)
    Cartesian3.abs(f, f)

    if (f.x <= f.y) {
      if (f.x <= f.z) {
        return Cartesian3.clone(Cartesian3.UNIT_X, result)
      }
      return Cartesian3.clone(Cartesian3.UNIT_Z, result)
    }
    if (f.y <= f.z) {
      return Cartesian3.clone(Cartesian3.UNIT_Y, result)
    }
    return Cartesian3.clone(Cartesian3.UNIT_Z, result)
  }

  /**
   * 把 a 投影到 b。
   *
   * @param a 待投影
   * @param b 投影轴
   * @param result 结果
   */
  static projectVector(a: Cartesian3, b: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.defined("a", a)
    Check.defined("b", b)
    Check.defined("result", result)
    const scalar = Cartesian3.dot(a, b) / Cartesian3.dot(b, b)
    return Cartesian3.multiplyByScalar(b, scalar, result)
  }

  /**
   * 分量严格相等。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left?: Cartesian3, right?: Cartesian3): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left.x === right.x &&
        left.y === right.y &&
        left.z === right.z)
    )
  }

  /**
   * 与数组片段比较。
   *
   * @param cartesian 向量
   * @param array 数组
   * @param offset 偏移
   */
  static equalsArray(cartesian: Cartesian3, array: NumberArray, offset: number): boolean {
    return (
      cartesian.x === array[offset] &&
      cartesian.y === array[offset + 1] &&
      cartesian.z === array[offset + 2]
    )
  }

  /**
   * 相对 / 绝对容差比较。
   *
   * @param left 左
   * @param right 右
   * @param relativeEpsilon 相对容差
   * @param absoluteEpsilon 绝对容差
   */
  static equalsEpsilon(
    left?: Cartesian3,
    right?: Cartesian3,
    relativeEpsilon?: number,
    absoluteEpsilon?: number,
  ): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        CesiumMath.equalsEpsilon(left.x, right.x, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(left.y, right.y, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(left.z, right.z, relativeEpsilon, absoluteEpsilon))
    )
  }

  /**
   * 叉积。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static cross(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)

    const leftX = left.x
    const leftY = left.y
    const leftZ = left.z
    const rightX = right.x
    const rightY = right.y
    const rightZ = right.z

    result.x = leftY * rightZ - leftZ * rightY
    result.y = leftZ * rightX - leftX * rightZ
    result.z = leftX * rightY - leftY * rightX
    return result
  }

  /**
   * 中点。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static midpoint(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = (left.x + right.x) * 0.5
    result.y = (left.y + right.y) * 0.5
    result.z = (left.z + right.z) * 0.5
    return result
  }

  /**
   * 经纬度（度）转 ECEF。未传椭球时用 `_ellipsoidRadiiSquared`（默认 WGS84）。
   *
   * @param longitude 经度，度
   * @param latitude 纬度，度
   * @param height 高程，米
   * @param ellipsoid 椭球（只需 radiiSquared）
   * @param result 可选结果对象
   */
  static fromDegrees(
    longitude: number,
    latitude: number,
    height?: number,
    ellipsoid?: EllipsoidRadiiSquared,
    result?: Cartesian3,
  ): Cartesian3 {
    Check.typeOf.number("longitude", longitude)
    Check.typeOf.number("latitude", latitude)
    return Cartesian3.fromRadians(
      CesiumMath.toRadians(longitude),
      CesiumMath.toRadians(latitude),
      height,
      ellipsoid,
      result,
    )
  }

  /**
   * 经纬度（弧度）转 ECEF。不直接 import Ellipsoid，只用 `_ellipsoidRadiiSquared`。
   *
   * @param longitude 经度，弧度
   * @param latitude 纬度，弧度
   * @param height 高程，米
   * @param ellipsoid 椭球（只需 radiiSquared）
   * @param result 可选结果对象
   */
  static fromRadians(
    longitude: number,
    latitude: number,
    height?: number,
    ellipsoid?: EllipsoidRadiiSquared,
    result?: Cartesian3,
  ): Cartesian3 {
    Check.typeOf.number("longitude", longitude)
    Check.typeOf.number("latitude", latitude)

    const h = height ?? 0.0
    const radiiSquared = !defined(ellipsoid)
      ? Cartesian3._ellipsoidRadiiSquared
      : ellipsoid.radiiSquared

    const cosLatitude = Math.cos(latitude)
    scratchN.x = cosLatitude * Math.cos(longitude)
    scratchN.y = cosLatitude * Math.sin(longitude)
    scratchN.z = Math.sin(latitude)
    scratchN = Cartesian3.normalize(scratchN, scratchN)

    Cartesian3.multiplyComponents(radiiSquared, scratchN, scratchK)
    const gamma = Math.sqrt(Cartesian3.dot(scratchN, scratchK))
    scratchK = Cartesian3.divideByScalar(scratchK, gamma, scratchK)
    scratchN = Cartesian3.multiplyByScalar(scratchN, h, scratchN)

    if (!defined(result)) {
      result = new Cartesian3()
    }
    return Cartesian3.add(scratchK, scratchN, result)
  }

  /**
   * 度经纬度数组转 ECEF 数组。
   *
   * @param coordinates [lon, lat, ...]
   * @param ellipsoid 椭球
   * @param result 可选目标
   */
  static fromDegreesArray(
    coordinates: NumberArray,
    ellipsoid?: EllipsoidRadiiSquared,
    result?: Cartesian3[],
  ): Cartesian3[] {
    Check.defined("coordinates", coordinates)
    if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
      throw new DeveloperError("the number of coordinates must be a multiple of 2 and at least 2")
    }

    const length = coordinates.length
    if (!defined(result)) {
      result = new Array(length / 2)
    } else {
      result.length = length / 2
    }

    for (let i = 0; i < length; i += 2) {
      const index = i / 2
      result[index] = Cartesian3.fromDegrees(
        coordinates[i]!,
        coordinates[i + 1]!,
        0,
        ellipsoid,
        result[index],
      )
    }
    return result
  }

  /**
   * 弧度经纬度数组转 ECEF 数组。
   *
   * @param coordinates [lon, lat, ...]
   * @param ellipsoid 椭球
   * @param result 可选目标
   */
  static fromRadiansArray(
    coordinates: NumberArray,
    ellipsoid?: EllipsoidRadiiSquared,
    result?: Cartesian3[],
  ): Cartesian3[] {
    Check.defined("coordinates", coordinates)
    if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
      throw new DeveloperError("the number of coordinates must be a multiple of 2 and at least 2")
    }

    const length = coordinates.length
    if (!defined(result)) {
      result = new Array(length / 2)
    } else {
      result.length = length / 2
    }

    for (let i = 0; i < length; i += 2) {
      const index = i / 2
      result[index] = Cartesian3.fromRadians(
        coordinates[i]!,
        coordinates[i + 1]!,
        0,
        ellipsoid,
        result[index],
      )
    }
    return result
  }

  /**
   * 度经纬高数组转 ECEF 数组。
   *
   * @param coordinates [lon, lat, height, ...]
   * @param ellipsoid 椭球
   * @param result 可选目标
   */
  static fromDegreesArrayHeights(
    coordinates: NumberArray,
    ellipsoid?: EllipsoidRadiiSquared,
    result?: Cartesian3[],
  ): Cartesian3[] {
    Check.defined("coordinates", coordinates)
    if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
      throw new DeveloperError("the number of coordinates must be a multiple of 3 and at least 3")
    }

    const length = coordinates.length
    if (!defined(result)) {
      result = new Array(length / 3)
    } else {
      result.length = length / 3
    }

    for (let i = 0; i < length; i += 3) {
      const index = i / 3
      result[index] = Cartesian3.fromDegrees(
        coordinates[i]!,
        coordinates[i + 1]!,
        coordinates[i + 2],
        ellipsoid,
        result[index],
      )
    }
    return result
  }

  /**
   * 弧度经纬高数组转 ECEF 数组。
   *
   * @param coordinates [lon, lat, height, ...]
   * @param ellipsoid 椭球
   * @param result 可选目标
   */
  static fromRadiansArrayHeights(
    coordinates: NumberArray,
    ellipsoid?: EllipsoidRadiiSquared,
    result?: Cartesian3[],
  ): Cartesian3[] {
    Check.defined("coordinates", coordinates)
    if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
      throw new DeveloperError("the number of coordinates must be a multiple of 3 and at least 3")
    }

    const length = coordinates.length
    if (!defined(result)) {
      result = new Array(length / 3)
    } else {
      result.length = length / 3
    }

    for (let i = 0; i < length; i += 3) {
      const index = i / 3
      result[index] = Cartesian3.fromRadians(
        coordinates[i]!,
        coordinates[i + 1]!,
        coordinates[i + 2],
        ellipsoid,
        result[index],
      )
    }
    return result
  }

  /**
   * 复制本实例。
   *
   * @param result 可选结果对象
   */
  clone(result?: Cartesian3): Cartesian3 | undefined {
    return Cartesian3.clone(this, result)
  }

  /**
   * 与 `right` 相等。
   *
   * @param right 右侧
   */
  equals(right?: Cartesian3): boolean {
    return Cartesian3.equals(this, right)
  }

  /**
   * 与 `right` 在容差内相等。
   *
   * @param right 右侧
   * @param relativeEpsilon 相对容差
   * @param absoluteEpsilon 绝对容差
   */
  equalsEpsilon(right?: Cartesian3, relativeEpsilon?: number, absoluteEpsilon?: number): boolean {
    return Cartesian3.equalsEpsilon(this, right, relativeEpsilon, absoluteEpsilon)
  }

  /** `(x, y, z)` */
  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z})`
  }
}

const distanceScratch = new Cartesian3()
const lerpScratch = new Cartesian3()
const angleBetweenScratch = new Cartesian3()
const angleBetweenScratch2 = new Cartesian3()
const mostOrthogonalAxisScratch = new Cartesian3()

let scratchN = new Cartesian3()
let scratchK = new Cartesian3()
