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

/** Color 的结构子集，避免依赖尚未移植的 Color */
export interface ColorLike {
  red: number
  green: number
  blue: number
  alpha: number
}

/**
 * 四维笛卡尔点。
 * 对标 Cesium `Core/Cartesian4.js`。
 */
export class Cartesian4 {
  x: number
  y: number
  z: number
  w: number

  static packedLength = 4
  static readonly ZERO: Readonly<Cartesian4> = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 0.0))
  static readonly ONE: Readonly<Cartesian4> = Object.freeze(new Cartesian4(1.0, 1.0, 1.0, 1.0))
  static readonly UNIT_X: Readonly<Cartesian4> = Object.freeze(new Cartesian4(1.0, 0.0, 0.0, 0.0))
  static readonly UNIT_Y: Readonly<Cartesian4> = Object.freeze(new Cartesian4(0.0, 1.0, 0.0, 0.0))
  static readonly UNIT_Z: Readonly<Cartesian4> = Object.freeze(new Cartesian4(0.0, 0.0, 1.0, 0.0))
  static readonly UNIT_W: Readonly<Cartesian4> = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 1.0))

  /**
   * @param x X
   * @param y Y
   * @param z Z
   * @param w W
   */
  constructor(x?: number, y?: number, z?: number, w?: number) {
    this.x = x ?? 0.0
    this.y = y ?? 0.0
    this.z = z ?? 0.0
    this.w = w ?? 0.0
  }

  /**
   * 由分量构造。
   *
   * @param x X
   * @param y Y
   * @param z Z
   * @param w W
   * @param result 可选结果对象
   */
  static fromElements(x: number, y: number, z: number, w: number, result?: Cartesian4): Cartesian4 {
    if (!defined(result)) {
      return new Cartesian4(x, y, z, w)
    }
    result.x = x
    result.y = y
    result.z = z
    result.w = w
    return result
  }

  /**
   * 由 Color 的 rgba 映射到 xyzw。
   *
   * @param color 颜色
   * @param result 可选结果对象
   */
  static fromColor(color: ColorLike, result?: Cartesian4): Cartesian4 {
    Check.typeOf.object("color", color)
    if (!defined(result)) {
      return new Cartesian4(color.red, color.green, color.blue, color.alpha)
    }
    result.x = color.red
    result.y = color.green
    result.z = color.blue
    result.w = color.alpha
    return result
  }

  /**
   * 复制；源未定义时返回 undefined。
   *
   * @param cartesian 源
   * @param result 可选结果对象
   */
  static clone(cartesian: Cartesian4, result?: Cartesian4): Cartesian4
  static clone(cartesian?: Cartesian4, result?: Cartesian4): Cartesian4 | undefined
  static clone(cartesian?: Cartesian4, result?: Cartesian4): Cartesian4 | undefined {
    if (!defined(cartesian)) {
      return undefined
    }
    if (!defined(result)) {
      return new Cartesian4(cartesian.x, cartesian.y, cartesian.z, cartesian.w)
    }
    result.x = cartesian.x
    result.y = cartesian.y
    result.z = cartesian.z
    result.w = cartesian.w
    return result
  }

  /**
   * 写入连续数组。
   *
   * @param value 源
   * @param array 目标
   * @param startingIndex 起始下标
   */
  static pack(value: Cartesian4, array: NumberArray, startingIndex?: number): NumberArray {
    Check.typeOf.object("value", value)
    Check.defined("array", array)

    const index = startingIndex ?? 0
    array[index] = value.x
    array[index + 1] = value.y
    array[index + 2] = value.z
    array[index + 3] = value.w
    return array
  }

  /**
   * 从连续数组读出。
   *
   * @param array 源
   * @param startingIndex 起始下标
   * @param result 可选结果对象
   */
  static unpack(array: NumberArray, startingIndex?: number, result?: Cartesian4): Cartesian4 {
    Check.defined("array", array)

    const index = startingIndex ?? 0
    if (!defined(result)) {
      result = new Cartesian4()
    }
    result.x = array[index]!
    result.y = array[index + 1]!
    result.z = array[index + 2]!
    result.w = array[index + 3]!
    return result
  }

  /**
   * 展平 Cartesian4 数组。
   *
   * @param array 源
   * @param result 可选目标
   */
  static packArray(array: readonly Cartesian4[], result?: NumberArray): NumberArray {
    Check.defined("array", array)

    const length = array.length
    const resultLength = length * 4
    if (!defined(result)) {
      result = new Array(resultLength)
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      throw new DeveloperError(
        "If result is a typed array, it must have exactly array.length * 4 elements",
      )
    } else if (Array.isArray(result) && result.length !== resultLength) {
      result.length = resultLength
    }

    for (let i = 0; i < length; ++i) {
      Cartesian4.pack(array[i]!, result, i * 4)
    }
    return result
  }

  /**
   * 从分量数组还原 Cartesian4 数组。
   *
   * @param array 分量
   * @param result 可选目标
   */
  static unpackArray(array: NumberArray, result?: Cartesian4[]): Cartesian4[] {
    Check.defined("array", array)
    Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 4)
    if (array.length % 4 !== 0) {
      throw new DeveloperError("array length must be a multiple of 4.")
    }

    const length = array.length
    if (!defined(result)) {
      result = new Array(length / 4)
    } else {
      result.length = length / 4
    }

    for (let i = 0; i < length; i += 4) {
      const index = i / 4
      result[index] = Cartesian4.unpack(array, i, result[index])
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
  static fromArray(array: NumberArray, startingIndex?: number, result?: Cartesian4): Cartesian4 {
    return Cartesian4.unpack(array, startingIndex, result)
  }

  /**
   * 最大分量。
   *
   * @param cartesian 源
   */
  static maximumComponent(cartesian: Cartesian4): number {
    Check.typeOf.object("cartesian", cartesian)
    return Math.max(cartesian.x, cartesian.y, cartesian.z, cartesian.w)
  }

  /**
   * 最小分量。
   *
   * @param cartesian 源
   */
  static minimumComponent(cartesian: Cartesian4): number {
    Check.typeOf.object("cartesian", cartesian)
    return Math.min(cartesian.x, cartesian.y, cartesian.z, cartesian.w)
  }

  /**
   * 分量最小值。
   *
   * @param first 第一个
   * @param second 第二个
   * @param result 结果
   */
  static minimumByComponent(first: Cartesian4, second: Cartesian4, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("first", first)
    Check.typeOf.object("second", second)
    Check.typeOf.object("result", result)
    result.x = Math.min(first.x, second.x)
    result.y = Math.min(first.y, second.y)
    result.z = Math.min(first.z, second.z)
    result.w = Math.min(first.w, second.w)
    return result
  }

  /**
   * 分量最大值。
   *
   * @param first 第一个
   * @param second 第二个
   * @param result 结果
   */
  static maximumByComponent(first: Cartesian4, second: Cartesian4, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("first", first)
    Check.typeOf.object("second", second)
    Check.typeOf.object("result", result)
    result.x = Math.max(first.x, second.x)
    result.y = Math.max(first.y, second.y)
    result.z = Math.max(first.z, second.z)
    result.w = Math.max(first.w, second.w)
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
    value: Cartesian4,
    min: Cartesian4,
    max: Cartesian4,
    result: Cartesian4,
  ): Cartesian4 {
    Check.typeOf.object("value", value)
    Check.typeOf.object("min", min)
    Check.typeOf.object("max", max)
    Check.typeOf.object("result", result)
    result.x = CesiumMath.clamp(value.x, min.x, max.x)
    result.y = CesiumMath.clamp(value.y, min.y, max.y)
    result.z = CesiumMath.clamp(value.z, min.z, max.z)
    result.w = CesiumMath.clamp(value.w, min.w, max.w)
    return result
  }

  /**
   * 模长平方。
   *
   * @param cartesian 源
   */
  static magnitudeSquared(cartesian: Cartesian4): number {
    Check.typeOf.object("cartesian", cartesian)
    return (
      cartesian.x * cartesian.x +
      cartesian.y * cartesian.y +
      cartesian.z * cartesian.z +
      cartesian.w * cartesian.w
    )
  }

  /**
   * 模长。
   *
   * @param cartesian 源
   */
  static magnitude(cartesian: Cartesian4): number {
    return Math.sqrt(Cartesian4.magnitudeSquared(cartesian))
  }

  /**
   * 四点距离。
   *
   * @param left 左点
   * @param right 右点
   */
  static distance(left: Cartesian4, right: Cartesian4): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Cartesian4.subtract(left, right, distanceScratch)
    return Cartesian4.magnitude(distanceScratch)
  }

  /**
   * 距离平方。
   *
   * @param left 左点
   * @param right 右点
   */
  static distanceSquared(left: Cartesian4, right: Cartesian4): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Cartesian4.subtract(left, right, distanceScratch)
    return Cartesian4.magnitudeSquared(distanceScratch)
  }

  /**
   * 单位化。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static normalize(cartesian: Cartesian4, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    const magnitude = Cartesian4.magnitude(cartesian)
    result.x = cartesian.x / magnitude
    result.y = cartesian.y / magnitude
    result.z = cartesian.z / magnitude
    result.w = cartesian.w / magnitude
    if (isNaN(result.x) || isNaN(result.y) || isNaN(result.z) || isNaN(result.w)) {
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
  static dot(left: Cartesian4, right: Cartesian4): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    return left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w
  }

  /**
   * 分量乘。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static multiplyComponents(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x * right.x
    result.y = left.y * right.y
    result.z = left.z * right.z
    result.w = left.w * right.w
    return result
  }

  /**
   * 分量除。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static divideComponents(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x / right.x
    result.y = left.y / right.y
    result.z = left.z / right.z
    result.w = left.w / right.w
    return result
  }

  /**
   * 分量加。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static add(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x + right.x
    result.y = left.y + right.y
    result.z = left.z + right.z
    result.w = left.w + right.w
    return result
  }

  /**
   * 分量减。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static subtract(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.x = left.x - right.x
    result.y = left.y - right.y
    result.z = left.z - right.z
    result.w = left.w - right.w
    return result
  }

  /**
   * 数乘。
   *
   * @param cartesian 向量
   * @param scalar 标量
   * @param result 结果
   */
  static multiplyByScalar(cartesian: Cartesian4, scalar: number, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.number("scalar", scalar)
    Check.typeOf.object("result", result)
    result.x = cartesian.x * scalar
    result.y = cartesian.y * scalar
    result.z = cartesian.z * scalar
    result.w = cartesian.w * scalar
    return result
  }

  /**
   * 数除。
   *
   * @param cartesian 向量
   * @param scalar 标量
   * @param result 结果
   */
  static divideByScalar(cartesian: Cartesian4, scalar: number, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.number("scalar", scalar)
    Check.typeOf.object("result", result)
    result.x = cartesian.x / scalar
    result.y = cartesian.y / scalar
    result.z = cartesian.z / scalar
    result.w = cartesian.w / scalar
    return result
  }

  /**
   * 取负。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static negate(cartesian: Cartesian4, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result.x = -cartesian.x
    result.y = -cartesian.y
    result.z = -cartesian.z
    result.w = -cartesian.w
    return result
  }

  /**
   * 分量绝对值。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static abs(cartesian: Cartesian4, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result.x = Math.abs(cartesian.x)
    result.y = Math.abs(cartesian.y)
    result.z = Math.abs(cartesian.z)
    result.w = Math.abs(cartesian.w)
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
  static lerp(start: Cartesian4, end: Cartesian4, t: number, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("start", start)
    Check.typeOf.object("end", end)
    Check.typeOf.number("t", t)
    Check.typeOf.object("result", result)
    Cartesian4.multiplyByScalar(end, t, lerpScratch)
    result = Cartesian4.multiplyByScalar(start, 1.0 - t, result)
    return Cartesian4.add(lerpScratch, result, result)
  }

  /**
   * 与该向量最正交的单位轴。
   *
   * @param cartesian 源
   * @param result 结果
   */
  static mostOrthogonalAxis(cartesian: Cartesian4, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)

    const f = Cartesian4.normalize(cartesian, mostOrthogonalAxisScratch)
    Cartesian4.abs(f, f)

    if (f.x <= f.y) {
      if (f.x <= f.z) {
        if (f.x <= f.w) {
          return Cartesian4.clone(Cartesian4.UNIT_X, result)
        }
        return Cartesian4.clone(Cartesian4.UNIT_W, result)
      }
      if (f.z <= f.w) {
        return Cartesian4.clone(Cartesian4.UNIT_Z, result)
      }
      return Cartesian4.clone(Cartesian4.UNIT_W, result)
    }
    if (f.y <= f.z) {
      if (f.y <= f.w) {
        return Cartesian4.clone(Cartesian4.UNIT_Y, result)
      }
      return Cartesian4.clone(Cartesian4.UNIT_W, result)
    }
    if (f.z <= f.w) {
      return Cartesian4.clone(Cartesian4.UNIT_Z, result)
    }
    return Cartesian4.clone(Cartesian4.UNIT_W, result)
  }

  /**
   * 分量严格相等。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left?: Cartesian4, right?: Cartesian4): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left.x === right.x &&
        left.y === right.y &&
        left.z === right.z &&
        left.w === right.w)
    )
  }

  /**
   * 与数组片段比较。
   *
   * @param cartesian 向量
   * @param array 数组
   * @param offset 偏移
   */
  static equalsArray(cartesian: Cartesian4, array: NumberArray, offset: number): boolean {
    return (
      cartesian.x === array[offset] &&
      cartesian.y === array[offset + 1] &&
      cartesian.z === array[offset + 2] &&
      cartesian.w === array[offset + 3]
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
    left?: Cartesian4,
    right?: Cartesian4,
    relativeEpsilon?: number,
    absoluteEpsilon?: number,
  ): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        CesiumMath.equalsEpsilon(left.x, right.x, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(left.y, right.y, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(left.z, right.z, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(left.w, right.w, relativeEpsilon, absoluteEpsilon))
    )
  }

  /**
   * 把 float 打成 4 个 uint8（小端）。
   *
   * @param value 浮点
   * @param result 可选结果对象
   */
  static packFloat(value: number, result?: Cartesian4): Cartesian4 {
    Check.typeOf.number("value", value)
    if (!defined(result)) {
      result = new Cartesian4()
    }
    scratchF32Array[0] = value
    if (littleEndian) {
      result.x = scratchU8Array[0]!
      result.y = scratchU8Array[1]!
      result.z = scratchU8Array[2]!
      result.w = scratchU8Array[3]!
    } else {
      result.x = scratchU8Array[3]!
      result.y = scratchU8Array[2]!
      result.z = scratchU8Array[1]!
      result.w = scratchU8Array[0]!
    }
    return result
  }

  /**
   * 解开 packFloat。
   *
   * @param packedFloat 打包值
   */
  static unpackFloat(packedFloat: Cartesian4): number {
    Check.typeOf.object("packedFloat", packedFloat)
    if (littleEndian) {
      scratchU8Array[0] = packedFloat.x
      scratchU8Array[1] = packedFloat.y
      scratchU8Array[2] = packedFloat.z
      scratchU8Array[3] = packedFloat.w
    } else {
      scratchU8Array[0] = packedFloat.w
      scratchU8Array[1] = packedFloat.z
      scratchU8Array[2] = packedFloat.y
      scratchU8Array[3] = packedFloat.x
    }
    return scratchF32Array[0]!
  }

  /**
   * 复制本实例。
   *
   * @param result 可选结果对象
   */
  clone(result?: Cartesian4): Cartesian4 | undefined {
    return Cartesian4.clone(this, result)
  }

  /**
   * 与 `right` 相等。
   *
   * @param right 右侧
   */
  equals(right?: Cartesian4): boolean {
    return Cartesian4.equals(this, right)
  }

  /**
   * 与 `right` 在容差内相等。
   *
   * @param right 右侧
   * @param relativeEpsilon 相对容差
   * @param absoluteEpsilon 绝对容差
   */
  equalsEpsilon(right?: Cartesian4, relativeEpsilon?: number, absoluteEpsilon?: number): boolean {
    return Cartesian4.equalsEpsilon(this, right, relativeEpsilon, absoluteEpsilon)
  }

  /** `(x, y, z, w)` */
  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`
  }
}

const distanceScratch = new Cartesian4()
const lerpScratch = new Cartesian4()
const mostOrthogonalAxisScratch = new Cartesian4()

const scratchF32Array = new Float32Array(1)
const scratchU8Array = new Uint8Array(scratchF32Array.buffer)
const testU32 = new Uint32Array([0x11223344])
const testU8 = new Uint8Array(testU32.buffer)
const littleEndian = testU8[0] === 0x44
