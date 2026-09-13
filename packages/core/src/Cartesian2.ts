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

/** pack / unpack 可用的数值数组 */
export type NumberArray = number[] | TypedArray

/**
 * 二维笛卡尔点。
 * 对标 Cesium `Core/Cartesian2.js`。
 */
export class Cartesian2 {
  x: number
  y: number

  static packedLength = 2
  static readonly ZERO: Readonly<Cartesian2> = Object.freeze(new Cartesian2(0.0, 0.0))
  static readonly ONE: Readonly<Cartesian2> = Object.freeze(new Cartesian2(1.0, 1.0))
  static readonly UNIT_X: Readonly<Cartesian2> = Object.freeze(new Cartesian2(1.0, 0.0))
  static readonly UNIT_Y: Readonly<Cartesian2> = Object.freeze(new Cartesian2(0.0, 1.0))

  /**
   * @param x X
   * @param y Y
   */
  constructor(x?: number, y?: number) {
    this.x = x ?? 0.0
    this.y = y ?? 0.0
  }

  /**
   * 由分量构造。
   *
   * @param x X
   * @param y Y
   * @param result 可选结果对象
   */
  static fromElements(x: number, y: number, result?: Cartesian2): Cartesian2 {
    if (!defined(result)) {
      return new Cartesian2(x, y)
    }
    result.x = x
    result.y = y
    return result
  }

  /**
   * 复制；源未定义时返回 undefined。
   *
   * @param cartesian 源
   * @param result 可选结果对象
   */
  static clone(cartesian: Cartesian2, result?: Cartesian2): Cartesian2
  static clone(cartesian?: Cartesian2, result?: Cartesian2): Cartesian2 | undefined
  static clone(cartesian?: Cartesian2, result?: Cartesian2): Cartesian2 | undefined {
    if (!defined(cartesian)) {
      return undefined
    }
    if (!defined(result)) {
      return new Cartesian2(cartesian.x, cartesian.y)
    }
    result.x = cartesian.x
    result.y = cartesian.y
    return result
  }

  /**
   * 写入连续数组。
   *
   * @param value 源
   * @param array 目标
   * @param startingIndex 起始下标
   */
  static pack(value: Cartesian2, array: NumberArray, startingIndex?: number): NumberArray {
    Check.typeOf.object("value", value)
    Check.defined("array", array)

    const index = startingIndex ?? 0
    array[index] = value.x
    array[index + 1] = value.y
    return array
  }

  /**
   * 从连续数组读出。
   *
   * @param array 源
   * @param startingIndex 起始下标
   * @param result 可选结果对象
   */
  static unpack(array: NumberArray, startingIndex?: number, result?: Cartesian2): Cartesian2 {
    Check.defined("array", array)

    const index = startingIndex ?? 0
    if (!defined(result)) {
      result = new Cartesian2()
    }
    result.x = array[index]!
    result.y = array[index + 1]!
    return result
  }

  /**
   * 展平 Cartesian2 数组。
   *
   * @param array 源
   * @param result 可选目标（typed array 长度必须精确）
   */
  static packArray(array: readonly Cartesian2[], result?: NumberArray): NumberArray {
    Check.defined("array", array)

    const length = array.length
    const resultLength = length * 2
    if (!defined(result)) {
      result = new Array(resultLength)
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      throw new DeveloperError(
        "If result is a typed array, it must have exactly array.length * 2 elements",
      )
    } else if (Array.isArray(result) && result.length !== resultLength) {
      result.length = resultLength
    }

    for (let i = 0; i < length; ++i) {
      Cartesian2.pack(array[i]!, result, i * 2)
    }
    return result
  }

  /**
   * 从分量数组还原 Cartesian2 数组。
   *
   * @param array 分量
   * @param result 可选目标
   */
  static unpackArray(array: NumberArray, result?: Cartesian2[]): Cartesian2[] {
    Check.defined("array", array)
    Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 2)
    if (array.length % 2 !== 0) {
      throw new DeveloperError("array length must be a multiple of 2.")
    }

    const length = array.length
    if (!defined(result)) {
      result = new Array(length / 2)
    } else {
      result.length = length / 2
    }

    for (let i = 0; i < length; i += 2) {
      const index = i / 2
      result[index] = Cartesian2.unpack(array, i, result[index])
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
  static fromArray(array: NumberArray, startingIndex?: number, result?: Cartesian2): Cartesian2 {
    return Cartesian2.unpack(array, startingIndex, result)
  }

  /**
   * 取 Cartesian3 的 x/y（丢弃 z）。
   *
   * @param cartesian 源
   * @param result 可选结果对象
   */
  static fromCartesian3(
    cartesian?: { x: number; y: number },
    result?: Cartesian2,
  ): Cartesian2 | undefined {
    return Cartesian2.clone(cartesian as Cartesian2 | undefined, result)
  }

  /**
   * 取 Cartesian4 的 x/y（丢弃 z/w）。
   *
   * @param cartesian 源
   * @param result 可选结果对象
   */
  static fromCartesian4(
    cartesian?: { x: number; y: number },
    result?: Cartesian2,
  ): Cartesian2 | undefined {
    return Cartesian2.clone(cartesian as Cartesian2 | undefined, result)
  }

  /**
   * 最大分量。
   *
   * @param cartesian 源
   */
  static maximumComponent(cartesian: Cartesian2): number {
    Check.typeOf.object("cartesian", cartesian)
    return Math.max(cartesian.x, cartesian.y)
  }

  /**
   * 最小分量。
   *
   * @param cartesian 源
   */
  static minimumComponent(cartesian: Cartesian2): number {
    Check.typeOf.object("cartesian", cartesian)
    return Math.min(cartesian.x, cartesian.y)
  }

  /**
   * 分量最小值。
   *
   * @param first 第一个
   * @param second 第二个
   * @param result 结果
   */
  static minimumByComponent(first: Cartesian2, second: Cartesian2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("first", first)
    Check.typeOf.object("second", second)
    Check.typeOf.object("result", result)
    result.x = Math.min(first.x, second.x)
    result.y = Math.min(first.y, second.y)
    return result
  }

  /**
   * 分量最大值。
   *
   * @param first 第一个
   * @param second 第二个
   * @param result 结果
   */
  static maximumByComponent(first: Cartesian2, second: Cartesian2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("first", first)
    Check.typeOf.object("second", second)
    Check.typeOf.object("result", result)
    result.x = Math.max(first.x, second.x)
    result.y = Math.max(first.y, second.y)
    return result
  }

  /**
   * 分量夹紧到 [min, max]。
   *
   * @param value 值
   * @param min 下界
   * @param max 上界
   * @param result 结果
   */
  static clamp(
    value: Cartesian2,
    min: Cartesian2,
    max: Cartesian2,
    result: Cartesian2,
  ): Cartesian2 {
    Check.typeOf.object("value", value)
    Check.typeOf.object("min", min)
    Check.typeOf.object("max", max)
    Check.typeOf.object("result", result)
    result.x = CesiumMath.clamp(value.x, min.x, max.x)
    result.y = CesiumMath.clamp(value.y, min.y, max.y)
    return result
  }

  /**
   * 模长平方。
   *
   * @param cartesian 源
   */
  static magnitudeSquared(cartesian: Cartesian2): number {
    Check.typeOf.object("cartesian", cartesian)
    return cartesian.x * cartesian.x + cartesian.y * cartesian.y
  }

  /**
   * 模长。
   *
   * @param cartesian 源
   */
  static magnitude(cartesian: Cartesian2): number {
    return Math.sqrt(Cartesian2.magnitudeSquared(cartesian))
  }

  /**
   * 两点距离。
   *
   * @param left 左点
   * @param right 右点
   */
  static distance(left: Cartesian2, right: Cartesian2): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Cartesian2.subtract(left, right, distanceScratch)
    return Cartesian2.magnitude(distanceScratch)
  }

  /**
   * 两点距离平方。
   *
   * @param left 左点
   * @param right 右点
   */
  static distanceSquared(left: Cartesian2, right: Cartesian2): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Cartesian2.subtract(left, right, distanceScratch)
    return Cartesian2.magnitudeSquared(distanceScratch)
  }

  /**
   * 单位化。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static normalize(cartesian: Cartesian2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    const magnitude = Cartesian2.magnitude(cartesian)
    result.x = cartesian.x / magnitude
    result.y = cartesian.y / magnitude
    if (isNaN(result.x) || isNaN(result.y)) {
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
  static dot(left: Cartesian2, right: Cartesian2): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    return left.x * right.x + left.y * right.y
  }

  /**
   * 二维叉积（等价于补 z=0 后的 z 分量）。
   *
   * @param left 左
   * @param right 右
   */
  static cross(left: Cartesian2, right: Cartesian2): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    return left.x * right.y - left.y * right.x
  }

  /**
   * 分量乘。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static multiplyComponents(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x * right.x
    result.y = left.y * right.y
    return result
  }

  /**
   * 分量除。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static divideComponents(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x / right.x
    result.y = left.y / right.y
    return result
  }

  /**
   * 分量加。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static add(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x + right.x
    result.y = left.y + right.y
    return result
  }

  /**
   * 分量减。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static subtract(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x - right.x
    result.y = left.y - right.y
    return result
  }

  /**
   * 数乘。
   *
   * @param cartesian 向量
   * @param scalar 标量
   * @param result 结果
   */
  static multiplyByScalar(cartesian: Cartesian2, scalar: number, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.number("scalar", scalar)
    Check.typeOf.object("result", result)
    result.x = cartesian.x * scalar
    result.y = cartesian.y * scalar
    return result
  }

  /**
   * 数除。
   *
   * @param cartesian 向量
   * @param scalar 标量
   * @param result 结果
   */
  static divideByScalar(cartesian: Cartesian2, scalar: number, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.number("scalar", scalar)
    Check.typeOf.object("result", result)
    result.x = cartesian.x / scalar
    result.y = cartesian.y / scalar
    return result
  }

  /**
   * 取负。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static negate(cartesian: Cartesian2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result.x = -cartesian.x
    result.y = -cartesian.y
    return result
  }

  /**
   * 分量绝对值。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static abs(cartesian: Cartesian2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result.x = Math.abs(cartesian.x)
    result.y = Math.abs(cartesian.y)
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
  static lerp(start: Cartesian2, end: Cartesian2, t: number, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("start", start)
    Check.typeOf.object("end", end)
    Check.typeOf.number("t", t)
    Check.typeOf.object("result", result)
    Cartesian2.multiplyByScalar(end, t, lerpScratch)
    result = Cartesian2.multiplyByScalar(start, 1.0 - t, result)
    return Cartesian2.add(lerpScratch, result, result)
  }

  /**
   * 夹角（弧度）。
   *
   * @param left 左
   * @param right 右
   */
  static angleBetween(left: Cartesian2, right: Cartesian2): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Cartesian2.normalize(left, angleBetweenScratch)
    Cartesian2.normalize(right, angleBetweenScratch2)
    return CesiumMath.acosClamped(Cartesian2.dot(angleBetweenScratch, angleBetweenScratch2))
  }

  /**
   * 与该向量最正交的单位轴。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static mostOrthogonalAxis(cartesian: Cartesian2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    const f = Cartesian2.normalize(cartesian, mostOrthogonalAxisScratch)
    Cartesian2.abs(f, f)
    if (f.x <= f.y) {
      return Cartesian2.clone(Cartesian2.UNIT_X, result)
    }
    return Cartesian2.clone(Cartesian2.UNIT_Y, result)
  }

  /**
   * 分量严格相等。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left?: Cartesian2, right?: Cartesian2): boolean {
    return (
      left === right ||
      (defined(left) && defined(right) && left.x === right.x && left.y === right.y)
    )
  }

  /**
   * 与数组片段比较。
   *
   * @param cartesian 向量
   * @param array 数组
   * @param offset 偏移
   */
  static equalsArray(cartesian: Cartesian2, array: NumberArray, offset: number): boolean {
    return cartesian.x === array[offset] && cartesian.y === array[offset + 1]
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
    left?: Cartesian2,
    right?: Cartesian2,
    relativeEpsilon?: number,
    absoluteEpsilon?: number,
  ): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        CesiumMath.equalsEpsilon(left.x, right.x, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(left.y, right.y, relativeEpsilon, absoluteEpsilon))
    )
  }

  /**
   * 复制本实例。
   *
   * @param result 可选结果对象
   */
  clone(result?: Cartesian2): Cartesian2 | undefined {
    return Cartesian2.clone(this, result)
  }

  /**
   * 与 `right` 相等。
   *
   * @param right 右侧
   */
  equals(right?: Cartesian2): boolean {
    return Cartesian2.equals(this, right)
  }

  /**
   * 与 `right` 在容差内相等。
   *
   * @param right 右侧
   * @param relativeEpsilon 相对容差
   * @param absoluteEpsilon 绝对容差
   */
  equalsEpsilon(right?: Cartesian2, relativeEpsilon?: number, absoluteEpsilon?: number): boolean {
    return Cartesian2.equalsEpsilon(this, right, relativeEpsilon, absoluteEpsilon)
  }

  /** `(x, y)` */
  toString(): string {
    return `(${this.x}, ${this.y})`
  }
}

const distanceScratch = new Cartesian2()
const lerpScratch = new Cartesian2()
const angleBetweenScratch = new Cartesian2()
const angleBetweenScratch2 = new Cartesian2()
const mostOrthogonalAxisScratch = new Cartesian2()
