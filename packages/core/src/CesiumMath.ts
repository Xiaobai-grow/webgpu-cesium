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
import { MersenneTwister } from "./MersenneTwister"

/** `smoothDamp` 的可复用结果对象 */
export interface SmoothDampResult {
  value: number
  velocity: number
}

const factorials = [1]

let randomNumberGenerator = new MersenneTwister()

/**
 * 数学函数与常量。导出名 `CesiumMath`（Cesium 源文件为 `Math.js`）。
 * 对标 Cesium `Core/Math.js`。
 */
export const CesiumMath = {
  EPSILON1: 0.1,
  EPSILON2: 0.01,
  EPSILON3: 0.001,
  EPSILON4: 0.0001,
  EPSILON5: 0.00001,
  EPSILON6: 0.000001,
  EPSILON7: 0.0000001,
  EPSILON8: 0.00000001,
  EPSILON9: 0.000000001,
  EPSILON10: 0.0000000001,
  EPSILON11: 0.00000000001,
  EPSILON12: 0.000000000001,
  EPSILON13: 0.0000000000001,
  EPSILON14: 0.00000000000001,
  EPSILON15: 0.000000000000001,
  EPSILON16: 0.0000000000000001,
  EPSILON17: 0.00000000000000001,
  EPSILON18: 0.000000000000000001,
  EPSILON19: 0.0000000000000000001,
  EPSILON20: 0.00000000000000000001,
  EPSILON21: 0.000000000000000000001,
  GRAVITATIONALPARAMETER: 3.986004418e14,
  SOLAR_RADIUS: 6.955e8,
  LUNAR_RADIUS: 1737400.0,
  SIXTY_FOUR_KILOBYTES: 64 * 1024,
  FOUR_GIGABYTES: 4 * 1024 * 1024 * 1024,
  PI: Math.PI,
  ONE_OVER_PI: 1.0 / Math.PI,
  PI_OVER_TWO: Math.PI / 2.0,
  PI_OVER_THREE: Math.PI / 3.0,
  PI_OVER_FOUR: Math.PI / 4.0,
  PI_OVER_SIX: Math.PI / 6.0,
  THREE_PI_OVER_TWO: (3.0 * Math.PI) / 2.0,
  TWO_PI: 2.0 * Math.PI,
  ONE_OVER_TWO_PI: 1.0 / (2.0 * Math.PI),
  RADIANS_PER_DEGREE: Math.PI / 180.0,
  DEGREES_PER_RADIAN: 180.0 / Math.PI,
  RADIANS_PER_ARCSECOND: Math.PI / 180.0 / 3600.0,

  sign: Math.sign,
  sinh: Math.sinh,
  cosh: Math.cosh,
  cbrt: Math.cbrt,
  log2: Math.log2,

  /**
   * 正数或 0 返回 1，负数返回 -1。
   *
   * @param value 输入
   */
  signNotZero(value: number): number {
    return value < 0.0 ? -1.0 : 1.0
  },

  /**
   * [-1, 1] → SNORM [0, rangeMaximum]。
   *
   * @param value 标量
   * @param rangeMaximum 默认 255
   */
  toSNorm(value: number, rangeMaximum?: number): number {
    const max = rangeMaximum ?? 255
    return Math.round((CesiumMath.clamp(value, -1.0, 1.0) * 0.5 + 0.5) * max)
  },

  /**
   * SNORM → [-1, 1]。
   *
   * @param value SNORM
   * @param rangeMaximum 默认 255
   */
  fromSNorm(value: number, rangeMaximum?: number): number {
    const max = rangeMaximum ?? 255
    return (CesiumMath.clamp(value, 0.0, max) / max) * 2.0 - 1.0
  },

  /**
   * 把 [rangeMinimum, rangeMaximum] 线性映射到 [0, 1]。
   */
  normalize(value: number, rangeMinimum: number, rangeMaximum: number): number {
    const span = Math.max(rangeMaximum - rangeMinimum, 0.0)
    return span === 0.0 ? 0.0 : CesiumMath.clamp((value - rangeMinimum) / span, 0.0, 1.0)
  },

  /**
   * 线性插值。
   *
   * @param p 起点
   * @param q 终点
   * @param time 一般在 [0, 1]
   */
  lerp(p: number, q: number, time: number): number {
    return (1.0 - time) * p + time * q
  },

  /**
   * 弹簧阻尼平滑（Game Programming Gems 4）。
   */
  smoothDamp(
    p: number,
    q: number,
    velocity: number,
    deltaTime = 0.0,
    maximumSpeed = Number.POSITIVE_INFINITY,
    smoothTime = 0.0001,
    result: SmoothDampResult = { value: 0, velocity: 0 },
  ): SmoothDampResult {
    Check.typeOf.number("p", p)
    Check.typeOf.number("q", q)
    Check.typeOf.number("velocity", velocity)
    Check.typeOf.number.greaterThanOrEquals("deltaTime", deltaTime, 0.0)
    Check.typeOf.number.greaterThanOrEquals("maximumSpeed", maximumSpeed, 0.0)
    Check.typeOf.number.greaterThanOrEquals("smoothTime", smoothTime, 0.0001)
    Check.typeOf.object("result", result)

    const safeSmoothTime = Math.max(0.0001, smoothTime)
    const omega = 2.0 / safeSmoothTime
    const x = omega * deltaTime
    const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x)
    const maxChange = maximumSpeed * safeSmoothTime
    let change = p - q
    change = CesiumMath.clamp(change, -maxChange, maxChange)
    const target = p - change
    const temp = (velocity + omega * change) * deltaTime
    const nextVelocity = (velocity - omega * temp) * exp
    result.value = target + (change + temp) * exp
    result.velocity = nextVelocity
    return result
  },

  /**
   * 度 → 弧度。
   *
   * @param degrees 角度
   */
  toRadians(degrees: number): number {
    if (!defined(degrees)) {
      throw new DeveloperError("degrees is required.")
    }
    return degrees * CesiumMath.RADIANS_PER_DEGREE
  },

  /**
   * 弧度 → 度。
   *
   * @param radians 弧度
   */
  toDegrees(radians: number): number {
    if (!defined(radians)) {
      throw new DeveloperError("radians is required.")
    }
    return radians * CesiumMath.DEGREES_PER_RADIAN
  },

  /**
   * 经度归一化到 [-π, π)。
   *
   * @param angle 弧度
   */
  convertLongitudeRange(angle: number): number {
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.")
    }
    const twoPi = CesiumMath.TWO_PI
    const simplified = angle - Math.floor(angle / twoPi) * twoPi
    if (simplified < -Math.PI) {
      return simplified + twoPi
    }
    if (simplified >= Math.PI) {
      return simplified - twoPi
    }
    return simplified
  },

  /**
   * 纬度夹紧到 [-π/2, π/2]。
   *
   * @param angle 弧度
   */
  clampToLatitudeRange(angle: number): number {
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.")
    }
    return CesiumMath.clamp(angle, -1 * CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO)
  },

  /**
   * 等价角落在 [-π, π]。
   *
   * @param angle 弧度
   */
  negativePiToPi(angle: number): number {
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.")
    }
    if (angle >= -CesiumMath.PI && angle <= CesiumMath.PI) {
      return angle
    }
    return CesiumMath.zeroToTwoPi(angle + CesiumMath.PI) - CesiumMath.PI
  },

  /**
   * 等价角落在 [0, 2π]。
   *
   * @param angle 弧度
   */
  zeroToTwoPi(angle: number): number {
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.")
    }
    if (angle >= 0 && angle <= CesiumMath.TWO_PI) {
      return angle
    }
    const mod = CesiumMath.mod(angle, CesiumMath.TWO_PI)
    if (Math.abs(mod) < CesiumMath.EPSILON14 && Math.abs(angle) > CesiumMath.EPSILON14) {
      return CesiumMath.TWO_PI
    }
    return mod
  },

  /**
   * 对负数也正确的取模。
   *
   * @param m 被除数
   * @param n 除数
   */
  mod(m: number, n: number): number {
    if (!defined(m)) {
      throw new DeveloperError("m is required.")
    }
    if (!defined(n)) {
      throw new DeveloperError("n is required.")
    }
    if (n === 0.0) {
      throw new DeveloperError("divisor cannot be 0.")
    }
    if (CesiumMath.sign(m) === CesiumMath.sign(n) && Math.abs(m) < Math.abs(n)) {
      return m
    }
    return ((m % n) + n) % n
  },

  /**
   * 绝对或相对容差比较。
   *
   * @param left 左值
   * @param right 右值
   * @param relativeEpsilon 相对容差，默认 0
   * @param absoluteEpsilon 绝对容差，默认等于相对容差
   */
  equalsEpsilon(
    left: number,
    right: number,
    relativeEpsilon?: number,
    absoluteEpsilon?: number,
  ): boolean {
    if (!defined(left)) {
      throw new DeveloperError("left is required.")
    }
    if (!defined(right)) {
      throw new DeveloperError("right is required.")
    }
    const rel = relativeEpsilon ?? 0.0
    const abs = absoluteEpsilon ?? rel
    const absDiff = Math.abs(left - right)
    return absDiff <= abs || absDiff <= rel * Math.max(Math.abs(left), Math.abs(right))
  },

  lessThan(left: number, right: number, absoluteEpsilon: number): boolean {
    if (!defined(left)) {
      throw new DeveloperError("first is required.")
    }
    if (!defined(right)) {
      throw new DeveloperError("second is required.")
    }
    if (!defined(absoluteEpsilon)) {
      throw new DeveloperError("absoluteEpsilon is required.")
    }
    return left - right < -absoluteEpsilon
  },

  lessThanOrEquals(left: number, right: number, absoluteEpsilon: number): boolean {
    if (!defined(left)) {
      throw new DeveloperError("first is required.")
    }
    if (!defined(right)) {
      throw new DeveloperError("second is required.")
    }
    if (!defined(absoluteEpsilon)) {
      throw new DeveloperError("absoluteEpsilon is required.")
    }
    return left - right < absoluteEpsilon
  },

  greaterThan(left: number, right: number, absoluteEpsilon: number): boolean {
    if (!defined(left)) {
      throw new DeveloperError("first is required.")
    }
    if (!defined(right)) {
      throw new DeveloperError("second is required.")
    }
    if (!defined(absoluteEpsilon)) {
      throw new DeveloperError("absoluteEpsilon is required.")
    }
    return left - right > absoluteEpsilon
  },

  greaterThanOrEquals(left: number, right: number, absoluteEpsilon: number): boolean {
    if (!defined(left)) {
      throw new DeveloperError("first is required.")
    }
    if (!defined(right)) {
      throw new DeveloperError("second is required.")
    }
    if (!defined(absoluteEpsilon)) {
      throw new DeveloperError("absoluteEpsilon is required.")
    }
    return left - right > -absoluteEpsilon
  },

  /**
   * 阶乘（带缓存）。
   *
   * @param n 非负整数
   */
  factorial(n: number): number {
    if (typeof n !== "number" || n < 0) {
      throw new DeveloperError("A number greater than or equal to 0 is required.")
    }
    const length = factorials.length
    if (n >= length) {
      let sum = factorials[length - 1] ?? 1
      for (let i = length; i <= n; i++) {
        const next = sum * i
        factorials.push(next)
        sum = next
      }
    }
    return factorials[n] ?? Number.NaN
  },

  /**
   * 自增并在超过 maximum 时回到 minimum。
   */
  incrementWrap(n: number, maximumValue: number, minimumValue?: number): number {
    const min = minimumValue ?? 0.0
    if (!defined(n)) {
      throw new DeveloperError("n is required.")
    }
    if (maximumValue <= min) {
      throw new DeveloperError("maximumValue must be greater than minimumValue.")
    }
    let next = n + 1
    if (next > maximumValue) {
      next = min
    }
    return next
  },

  isPowerOfTwo(n: number): boolean {
    if (typeof n !== "number" || n < 0 || n > 4294967295) {
      throw new DeveloperError("A number between 0 and (2^32)-1 is required.")
    }
    return n !== 0 && (n & (n - 1)) === 0
  },

  nextPowerOfTwo(n: number): number {
    if (typeof n !== "number" || n < 0 || n > 2147483648) {
      throw new DeveloperError("A number between 0 and 2^31 is required.")
    }
    let v = n - 1
    v |= v >> 1
    v |= v >> 2
    v |= v >> 4
    v |= v >> 8
    v |= v >> 16
    return v + 1
  },

  previousPowerOfTwo(n: number): number {
    if (typeof n !== "number" || n < 0 || n > 4294967295) {
      throw new DeveloperError("A number between 0 and (2^32)-1 is required.")
    }
    let v = n
    v |= v >> 1
    v |= v >> 2
    v |= v >> 4
    v |= v >> 8
    v |= v >> 16
    v |= v >> 32
    v = (v >>> 0) - (v >>> 1)
    return v
  },

  /**
   * 夹紧到 [min, max]。
   *
   * @param value 值
   * @param min 下界
   * @param max 上界
   */
  clamp(value: number, min: number, max: number): number {
    Check.typeOf.number("value", value)
    Check.typeOf.number("min", min)
    Check.typeOf.number("max", max)
    return value < min ? min : value > max ? max : value
  },

  /**
   * 设置 Mersenne Twister 种子。
   *
   * @param seed 整数种子
   */
  setRandomNumberSeed(seed: number): void {
    if (!defined(seed)) {
      throw new DeveloperError("seed is required.")
    }
    randomNumberGenerator = new MersenneTwister(seed)
  },

  /** [0, 1) 随机数 */
  nextRandomNumber(): number {
    return randomNumberGenerator.random()
  },

  randomBetween(min: number, max: number): number {
    return CesiumMath.nextRandomNumber() * (max - min) + min
  },

  acosClamped(value: number): number {
    if (!defined(value)) {
      throw new DeveloperError("value is required.")
    }
    return Math.acos(CesiumMath.clamp(value, -1.0, 1.0))
  },

  asinClamped(value: number): number {
    if (!defined(value)) {
      throw new DeveloperError("value is required.")
    }
    return Math.asin(CesiumMath.clamp(value, -1.0, 1.0))
  },

  chordLength(angle: number, radius: number): number {
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.")
    }
    if (!defined(radius)) {
      throw new DeveloperError("radius is required.")
    }
    return 2.0 * radius * Math.sin(angle * 0.5)
  },

  logBase(number: number, base: number): number {
    if (!defined(number)) {
      throw new DeveloperError("number is required.")
    }
    if (!defined(base)) {
      throw new DeveloperError("base is required.")
    }
    return Math.log(number) / Math.log(base)
  },

  /** 与 Cesium fog.glsl 一致的雾因子 */
  fog(distanceToCamera: number, density: number): number {
    const scalar = distanceToCamera * density
    return 1.0 - Math.exp(-(scalar * scalar))
  },

  /**
   * [-1, 1] 上的快速 atan 近似。
   *
   * @param x 输入
   */
  fastApproximateAtan(x: number): number {
    Check.typeOf.number("x", x)
    return x * (-0.1784 * Math.abs(x) - 0.0663 * x * x + 1.0301)
  },

  /**
   * 任意输入的快速 atan2 近似。
   *
   * @param x x
   * @param y y
   */
  fastApproximateAtan2(x: number, y: number): number {
    Check.typeOf.number("x", x)
    Check.typeOf.number("y", y)
    let t = Math.abs(x)
    let opposite = Math.abs(y)
    const adjacent = Math.max(t, opposite)
    opposite = Math.min(t, opposite)
    const oppositeOverAdjacent = opposite / adjacent
    if (Number.isNaN(oppositeOverAdjacent)) {
      throw new DeveloperError("either x or y must be nonzero")
    }
    t = CesiumMath.fastApproximateAtan(oppositeOverAdjacent)
    t = Math.abs(y) > Math.abs(x) ? CesiumMath.PI_OVER_TWO - t : t
    t = x < 0.0 ? CesiumMath.PI - t : t
    t = y < 0.0 ? -t : t
    return t
  },
}

/** 兼容 `import { Math as CesiumMath }` 的别名需求：同时导出 Math 名 */
export { CesiumMath as Math }
