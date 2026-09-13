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
import { Check } from "./Check"
import { defined } from "./defined"
import { FeatureDetection } from "./FeatureDetection"
import { CesiumMath } from "./CesiumMath"
import { Matrix3 } from "./Matrix3"
import type { HeadingPitchRoll } from "./HeadingPitchRoll"
import type { TypedArray } from "./globalTypes"

/** pack / unpack 可用的数值数组 */
export type NumberArray = number[] | TypedArray

/**
 * 三维旋转四元数。
 * 对标 Cesium `Core/Quaternion.js`。
 */
export class Quaternion {
  x: number
  y: number
  z: number
  w: number

  static packedLength = 4
  static packedInterpolationLength = 3
  static readonly ZERO: Readonly<Quaternion> = Object.freeze(new Quaternion(0.0, 0.0, 0.0, 0.0))
  static readonly IDENTITY: Readonly<Quaternion> = Object.freeze(new Quaternion(0.0, 0.0, 0.0, 1.0))

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
   * 绕轴旋转。
   *
   * @param axis 轴
   * @param angle 弧度
   * @param result 可选结果对象
   */
  static fromAxisAngle(axis: Cartesian3, angle: number, result?: Quaternion): Quaternion {
    Check.typeOf.object("axis", axis)
    Check.typeOf.number("angle", angle)

    const halfAngle = angle / 2.0
    const s = Math.sin(halfAngle)
    fromAxisAngleScratch = Cartesian3.normalize(axis, fromAxisAngleScratch)

    const x = fromAxisAngleScratch.x * s
    const y = fromAxisAngleScratch.y * s
    const z = fromAxisAngleScratch.z * s
    const w = Math.cos(halfAngle)
    if (!defined(result)) {
      return new Quaternion(x, y, z, w)
    }
    result.x = x
    result.y = y
    result.z = z
    result.w = w
    return result
  }

  /**
   * 由旋转矩阵构造。
   *
   * @param matrix 旋转矩阵
   * @param result 可选结果对象
   */
  static fromRotationMatrix(matrix: Matrix3, result?: Quaternion): Quaternion {
    Check.typeOf.object("matrix", matrix)

    let root: number
    let x: number
    let y: number
    let z: number
    let w: number

    const m00 = matrix[Matrix3.COLUMN0ROW0]!
    const m11 = matrix[Matrix3.COLUMN1ROW1]!
    const m22 = matrix[Matrix3.COLUMN2ROW2]!
    const trace = m00 + m11 + m22

    if (trace > 0.0) {
      root = Math.sqrt(trace + 1.0)
      w = 0.5 * root
      root = 0.5 / root
      x = (matrix[Matrix3.COLUMN1ROW2]! - matrix[Matrix3.COLUMN2ROW1]!) * root
      y = (matrix[Matrix3.COLUMN2ROW0]! - matrix[Matrix3.COLUMN0ROW2]!) * root
      z = (matrix[Matrix3.COLUMN0ROW1]! - matrix[Matrix3.COLUMN1ROW0]!) * root
    } else {
      const next = fromRotationMatrixNext
      let i = 0
      if (m11 > m00) {
        i = 1
      }
      if (m22 > m00 && m22 > m11) {
        i = 2
      }
      const j = next[i]!
      const k = next[j]!

      root = Math.sqrt(
        matrix[Matrix3.getElementIndex(i, i)]! -
          matrix[Matrix3.getElementIndex(j, j)]! -
          matrix[Matrix3.getElementIndex(k, k)]! +
          1.0,
      )

      const quat = fromRotationMatrixQuat
      quat[i] = 0.5 * root
      root = 0.5 / root
      w = (matrix[Matrix3.getElementIndex(k, j)]! - matrix[Matrix3.getElementIndex(j, k)]!) * root
      quat[j] =
        (matrix[Matrix3.getElementIndex(j, i)]! + matrix[Matrix3.getElementIndex(i, j)]!) * root
      quat[k] =
        (matrix[Matrix3.getElementIndex(k, i)]! + matrix[Matrix3.getElementIndex(i, k)]!) * root

      x = -quat[0]!
      y = -quat[1]!
      z = -quat[2]!
    }

    if (!defined(result)) {
      return new Quaternion(x, y, z, w)
    }
    result.x = x
    result.y = y
    result.z = z
    result.w = w
    return result
  }

  /**
   * 由 heading / pitch / roll 构造。
   *
   * @param headingPitchRoll 欧拉角
   * @param result 可选结果对象
   */
  static fromHeadingPitchRoll(headingPitchRoll: HeadingPitchRoll, result?: Quaternion): Quaternion {
    Check.typeOf.object("headingPitchRoll", headingPitchRoll)

    scratchRollQuaternion = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_X,
      headingPitchRoll.roll,
      scratchHPRQuaternion,
    )
    scratchPitchQuaternion = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_Y,
      -headingPitchRoll.pitch,
      result,
    )
    result = Quaternion.multiply(
      scratchPitchQuaternion,
      scratchRollQuaternion,
      scratchPitchQuaternion,
    )
    scratchHeadingQuaternion = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_Z,
      -headingPitchRoll.heading,
      scratchHPRQuaternion,
    )
    return Quaternion.multiply(scratchHeadingQuaternion, result, result)
  }

  /**
   * 写入连续数组。
   *
   * @param value 源
   * @param array 目标
   * @param startingIndex 起始下标
   */
  static pack(value: Quaternion, array: NumberArray, startingIndex?: number): NumberArray {
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
  static unpack(array: NumberArray, startingIndex?: number, result?: Quaternion): Quaternion {
    Check.defined("array", array)

    const index = startingIndex ?? 0
    if (!defined(result)) {
      result = new Quaternion()
    }
    result.x = array[index]!
    result.y = array[index + 1]!
    result.z = array[index + 2]!
    result.w = array[index + 3]!
    return result
  }

  /**
   * 转成可插值的打包形式。
   *
   * @param packedArray 打包数组
   * @param startingIndex 首个四元数下标
   * @param lastIndex 末个四元数下标
   * @param result 可选目标
   */
  static convertPackedArrayForInterpolation(
    packedArray: NumberArray,
    startingIndex?: number,
    lastIndex?: number,
    result?: number[],
  ): void {
    const start = startingIndex ?? 0
    const last = lastIndex ?? packedArray.length

    Quaternion.unpack(packedArray, last * 4, sampledQuaternionQuaternion0Conjugate)
    Quaternion.conjugate(
      sampledQuaternionQuaternion0Conjugate,
      sampledQuaternionQuaternion0Conjugate,
    )

    for (let i = 0, len = last - start + 1; i < len; i++) {
      const offset = i * 3
      Quaternion.unpack(packedArray, (start + i) * 4, sampledQuaternionTempQuaternion)
      Quaternion.multiply(
        sampledQuaternionTempQuaternion,
        sampledQuaternionQuaternion0Conjugate,
        sampledQuaternionTempQuaternion,
      )
      if (sampledQuaternionTempQuaternion.w < 0) {
        Quaternion.negate(sampledQuaternionTempQuaternion, sampledQuaternionTempQuaternion)
      }
      Quaternion.computeAxis(sampledQuaternionTempQuaternion, sampledQuaternionAxis)
      const angle = Quaternion.computeAngle(sampledQuaternionTempQuaternion)
      if (!defined(result)) {
        result = []
      }
      result[offset] = sampledQuaternionAxis.x * angle
      result[offset + 1] = sampledQuaternionAxis.y * angle
      result[offset + 2] = sampledQuaternionAxis.z * angle
    }
  }

  /**
   * 从插值打包结果还原。
   *
   * @param array 插值数组
   * @param sourceArray 原始打包数组
   * @param firstIndex 首下标
   * @param lastIndex 末下标
   * @param result 可选结果对象
   */
  static unpackInterpolationResult(
    array: NumberArray,
    sourceArray: NumberArray,
    firstIndex?: number,
    lastIndex?: number,
    result?: Quaternion,
  ): Quaternion {
    void firstIndex
    if (!defined(result)) {
      result = new Quaternion()
    }
    const last = lastIndex ?? 0
    Cartesian3.fromArray(array, 0, sampledQuaternionRotation)
    const magnitude = Cartesian3.magnitude(sampledQuaternionRotation)
    Quaternion.unpack(sourceArray, last * 4, sampledQuaternionQuaternion0)

    if (magnitude === 0) {
      Quaternion.clone(Quaternion.IDENTITY, sampledQuaternionTempQuaternion)
    } else {
      Quaternion.fromAxisAngle(
        sampledQuaternionRotation,
        magnitude,
        sampledQuaternionTempQuaternion,
      )
    }

    return Quaternion.multiply(
      sampledQuaternionTempQuaternion,
      sampledQuaternionQuaternion0,
      result,
    )
  }

  /**
   * 复制；源未定义时返回 undefined。
   *
   * @param quaternion 源
   * @param result 可选结果对象
   */
  static clone(quaternion: Quaternion, result?: Quaternion): Quaternion
  static clone(quaternion?: Quaternion, result?: Quaternion): Quaternion | undefined
  static clone(quaternion?: Quaternion, result?: Quaternion): Quaternion | undefined {
    if (!defined(quaternion)) {
      return undefined
    }
    if (!defined(result)) {
      return new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
    }
    result.x = quaternion.x
    result.y = quaternion.y
    result.z = quaternion.z
    result.w = quaternion.w
    return result
  }

  /**
   * 共轭。
   *
   * @param quaternion 源
   * @param result 结果
   */
  static conjugate(quaternion: Quaternion, result: Quaternion): Quaternion {
    Check.typeOf.object("quaternion", quaternion)
    Check.typeOf.object("result", result)
    result.x = -quaternion.x
    result.y = -quaternion.y
    result.z = -quaternion.z
    result.w = quaternion.w
    return result
  }

  /**
   * 模长平方。
   *
   * @param quaternion 源
   */
  static magnitudeSquared(quaternion: Quaternion): number {
    Check.typeOf.object("quaternion", quaternion)
    return (
      quaternion.x * quaternion.x +
      quaternion.y * quaternion.y +
      quaternion.z * quaternion.z +
      quaternion.w * quaternion.w
    )
  }

  /**
   * 模长。
   *
   * @param quaternion 源
   */
  static magnitude(quaternion: Quaternion): number {
    return Math.sqrt(Quaternion.magnitudeSquared(quaternion))
  }

  /**
   * 单位化。
   *
   * @param quaternion 源
   * @param result 结果
   */
  static normalize(quaternion: Quaternion, result: Quaternion): Quaternion {
    Check.typeOf.object("result", result)
    const inverseMagnitude = 1.0 / Quaternion.magnitude(quaternion)
    result.x = quaternion.x * inverseMagnitude
    result.y = quaternion.y * inverseMagnitude
    result.z = quaternion.z * inverseMagnitude
    result.w = quaternion.w * inverseMagnitude
    return result
  }

  /**
   * 逆。
   *
   * @param quaternion 源
   * @param result 结果
   */
  static inverse(quaternion: Quaternion, result: Quaternion): Quaternion {
    Check.typeOf.object("result", result)
    const magnitudeSquared = Quaternion.magnitudeSquared(quaternion)
    result = Quaternion.conjugate(quaternion, result)
    return Quaternion.multiplyByScalar(result, 1.0 / magnitudeSquared, result)
  }

  /**
   * 分量加。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static add(left: Quaternion, right: Quaternion, result: Quaternion): Quaternion {
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
  static subtract(left: Quaternion, right: Quaternion, result: Quaternion): Quaternion {
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
   * 取负。
   *
   * @param quaternion 源
   * @param result 结果
   */
  static negate(quaternion: Quaternion, result: Quaternion): Quaternion {
    Check.typeOf.object("quaternion", quaternion)
    Check.typeOf.object("result", result)
    result.x = -quaternion.x
    result.y = -quaternion.y
    result.z = -quaternion.z
    result.w = -quaternion.w
    return result
  }

  /**
   * 点积。
   *
   * @param left 左
   * @param right 右
   */
  static dot(left: Quaternion, right: Quaternion): number {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    return left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w
  }

  /**
   * Hamilton 积。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static multiply(left: Quaternion, right: Quaternion, result: Quaternion): Quaternion {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)

    const leftX = left.x
    const leftY = left.y
    const leftZ = left.z
    const leftW = left.w
    const rightX = right.x
    const rightY = right.y
    const rightZ = right.z
    const rightW = right.w

    result.x = leftW * rightX + leftX * rightW + leftY * rightZ - leftZ * rightY
    result.y = leftW * rightY - leftX * rightZ + leftY * rightW + leftZ * rightX
    result.z = leftW * rightZ + leftX * rightY - leftY * rightX + leftZ * rightW
    result.w = leftW * rightW - leftX * rightX - leftY * rightY - leftZ * rightZ
    return result
  }

  /**
   * 数乘。
   *
   * @param quaternion 源
   * @param scalar 标量
   * @param result 结果
   */
  static multiplyByScalar(quaternion: Quaternion, scalar: number, result: Quaternion): Quaternion {
    Check.typeOf.object("quaternion", quaternion)
    Check.typeOf.number("scalar", scalar)
    Check.typeOf.object("result", result)
    result.x = quaternion.x * scalar
    result.y = quaternion.y * scalar
    result.z = quaternion.z * scalar
    result.w = quaternion.w * scalar
    return result
  }

  /**
   * 数除。
   *
   * @param quaternion 源
   * @param scalar 标量
   * @param result 结果
   */
  static divideByScalar(quaternion: Quaternion, scalar: number, result: Quaternion): Quaternion {
    Check.typeOf.object("quaternion", quaternion)
    Check.typeOf.number("scalar", scalar)
    Check.typeOf.object("result", result)
    result.x = quaternion.x / scalar
    result.y = quaternion.y / scalar
    result.z = quaternion.z / scalar
    result.w = quaternion.w / scalar
    return result
  }

  /**
   * 旋转轴。
   *
   * @param quaternion 源
   * @param result 结果
   */
  static computeAxis(quaternion: Quaternion, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("quaternion", quaternion)
    Check.typeOf.object("result", result)
    const w = quaternion.w
    if (Math.abs(w - 1.0) < CesiumMath.EPSILON6 || Math.abs(w + 1.0) < CesiumMath.EPSILON6) {
      result.x = 1
      result.y = 0
      result.z = 0
      return result
    }
    const scalar = 1.0 / Math.sqrt(1.0 - w * w)
    result.x = quaternion.x * scalar
    result.y = quaternion.y * scalar
    result.z = quaternion.z * scalar
    return result
  }

  /**
   * 旋转角。
   *
   * @param quaternion 源
   */
  static computeAngle(quaternion: Quaternion): number {
    Check.typeOf.object("quaternion", quaternion)
    if (Math.abs(quaternion.w - 1.0) < CesiumMath.EPSILON6) {
      return 0.0
    }
    return 2.0 * Math.acos(quaternion.w)
  }

  /**
   * 线性插值。
   *
   * @param start t=0
   * @param end t=1
   * @param t 参数
   * @param result 结果
   */
  static lerp(start: Quaternion, end: Quaternion, t: number, result: Quaternion): Quaternion {
    Check.typeOf.object("start", start)
    Check.typeOf.object("end", end)
    Check.typeOf.number("t", t)
    Check.typeOf.object("result", result)
    lerpScratch = Quaternion.multiplyByScalar(end, t, lerpScratch)
    result = Quaternion.multiplyByScalar(start, 1.0 - t, result)
    return Quaternion.add(lerpScratch, result, result)
  }

  /**
   * 球面线性插值。
   *
   * @param start t=0
   * @param end t=1
   * @param t 参数
   * @param result 结果
   */
  static slerp(start: Quaternion, end: Quaternion, t: number, result: Quaternion): Quaternion {
    Check.typeOf.object("start", start)
    Check.typeOf.object("end", end)
    Check.typeOf.number("t", t)
    Check.typeOf.object("result", result)

    let dot = Quaternion.dot(start, end)
    let r = end
    if (dot < 0.0) {
      dot = -dot
      r = slerpEndNegated = Quaternion.negate(end, slerpEndNegated)
    }
    if (1.0 - dot < CesiumMath.EPSILON6) {
      return Quaternion.lerp(start, r, t, result)
    }

    const theta = Math.acos(dot)
    slerpScaledP = Quaternion.multiplyByScalar(start, Math.sin((1 - t) * theta), slerpScaledP)
    slerpScaledR = Quaternion.multiplyByScalar(r, Math.sin(t * theta), slerpScaledR)
    result = Quaternion.add(slerpScaledP, slerpScaledR, result)
    return Quaternion.multiplyByScalar(result, 1.0 / Math.sin(theta), result)
  }

  /**
   * 对数映射到 Cartesian3。
   *
   * @param quaternion 单位四元数
   * @param result 结果
   */
  static log(quaternion: Quaternion, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("quaternion", quaternion)
    Check.typeOf.object("result", result)
    const theta = CesiumMath.acosClamped(quaternion.w)
    let thetaOverSinTheta = 0.0
    if (theta !== 0.0) {
      thetaOverSinTheta = theta / Math.sin(theta)
    }
    return Cartesian3.multiplyByScalar(
      new Cartesian3(quaternion.x, quaternion.y, quaternion.z),
      thetaOverSinTheta,
      result,
    )
  }

  /**
   * 指数映射。
   *
   * @param cartesian 轴角向量
   * @param result 结果
   */
  static exp(cartesian: Cartesian3, result: Quaternion): Quaternion {
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    const theta = Cartesian3.magnitude(cartesian)
    let sinThetaOverTheta = 0.0
    if (theta !== 0.0) {
      sinThetaOverTheta = Math.sin(theta) / theta
    }
    result.x = cartesian.x * sinThetaOverTheta
    result.y = cartesian.y * sinThetaOverTheta
    result.z = cartesian.z * sinThetaOverTheta
    result.w = Math.cos(theta)
    return result
  }

  /**
   * squad 内四边形控制点。
   *
   * @param q0 前
   * @param q1 中
   * @param q2 后
   * @param result 结果
   */
  static computeInnerQuadrangle(
    q0: Quaternion,
    q1: Quaternion,
    q2: Quaternion,
    result: Quaternion,
  ): Quaternion {
    Check.typeOf.object("q0", q0)
    Check.typeOf.object("q1", q1)
    Check.typeOf.object("q2", q2)
    Check.typeOf.object("result", result)

    const qInv = Quaternion.conjugate(q1, squadScratchQuaternion0)
    Quaternion.multiply(qInv, q2, squadScratchQuaternion1)
    const cart0 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian0)
    Quaternion.multiply(qInv, q0, squadScratchQuaternion1)
    const cart1 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian1)
    Cartesian3.add(cart0, cart1, cart0)
    Cartesian3.multiplyByScalar(cart0, 0.25, cart0)
    Cartesian3.negate(cart0, cart0)
    Quaternion.exp(cart0, squadScratchQuaternion0)
    return Quaternion.multiply(q1, squadScratchQuaternion0, result)
  }

  /**
   * 球面四边形插值。
   *
   * @param q0 起点
   * @param q1 终点
   * @param s0 内控制点
   * @param s1 内控制点
   * @param t 参数
   * @param result 结果
   */
  static squad(
    q0: Quaternion,
    q1: Quaternion,
    s0: Quaternion,
    s1: Quaternion,
    t: number,
    result: Quaternion,
  ): Quaternion {
    Check.typeOf.object("q0", q0)
    Check.typeOf.object("q1", q1)
    Check.typeOf.object("s0", s0)
    Check.typeOf.object("s1", s1)
    Check.typeOf.number("t", t)
    Check.typeOf.object("result", result)
    const slerp0 = Quaternion.slerp(q0, q1, t, squadScratchQuaternion0)
    const slerp1 = Quaternion.slerp(s0, s1, t, squadScratchQuaternion1)
    return Quaternion.slerp(slerp0, slerp1, 2.0 * t * (1.0 - t), result)
  }

  /**
   * 更快但精度约 1e-6 的 slerp。
   *
   * @param start t=0
   * @param end t=1
   * @param t 参数
   * @param result 结果
   */
  static fastSlerp(start: Quaternion, end: Quaternion, t: number, result: Quaternion): Quaternion {
    Check.typeOf.object("start", start)
    Check.typeOf.object("end", end)
    Check.typeOf.number("t", t)
    Check.typeOf.object("result", result)

    let x = Quaternion.dot(start, end)
    let sign: number
    if (x >= 0) {
      sign = 1.0
    } else {
      sign = -1.0
      x = -x
    }

    const xm1 = x - 1.0
    const d = 1.0 - t
    const sqrT = t * t
    const sqrD = d * d

    for (let i = 7; i >= 0; --i) {
      bT[i] = (u[i]! * sqrT - v[i]!) * xm1
      bD[i] = (u[i]! * sqrD - v[i]!) * xm1
    }

    const cT =
      sign *
      t *
      (1.0 +
        bT[0]! *
          (1.0 +
            bT[1]! *
              (1.0 +
                bT[2]! *
                  (1.0 +
                    bT[3]! * (1.0 + bT[4]! * (1.0 + bT[5]! * (1.0 + bT[6]! * (1.0 + bT[7]!))))))))
    const cD =
      d *
      (1.0 +
        bD[0]! *
          (1.0 +
            bD[1]! *
              (1.0 +
                bD[2]! *
                  (1.0 +
                    bD[3]! * (1.0 + bD[4]! * (1.0 + bD[5]! * (1.0 + bD[6]! * (1.0 + bD[7]!))))))))

    const temp = Quaternion.multiplyByScalar(start, cD, fastSlerpScratchQuaternion)
    Quaternion.multiplyByScalar(end, cT, result)
    return Quaternion.add(temp, result, result)
  }

  /**
   * 更快的 squad。
   *
   * @param q0 起点
   * @param q1 终点
   * @param s0 内控制点
   * @param s1 内控制点
   * @param t 参数
   * @param result 结果
   */
  static fastSquad(
    q0: Quaternion,
    q1: Quaternion,
    s0: Quaternion,
    s1: Quaternion,
    t: number,
    result: Quaternion,
  ): Quaternion {
    Check.typeOf.object("q0", q0)
    Check.typeOf.object("q1", q1)
    Check.typeOf.object("s0", s0)
    Check.typeOf.object("s1", s1)
    Check.typeOf.number("t", t)
    Check.typeOf.object("result", result)
    const slerp0 = Quaternion.fastSlerp(q0, q1, t, squadScratchQuaternion0)
    const slerp1 = Quaternion.fastSlerp(s0, s1, t, squadScratchQuaternion1)
    return Quaternion.fastSlerp(slerp0, slerp1, 2.0 * t * (1.0 - t), result)
  }

  /**
   * 分量严格相等。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left?: Quaternion, right?: Quaternion): boolean {
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
   * 绝对容差比较。
   *
   * @param left 左
   * @param right 右
   * @param epsilon 容差
   */
  static equalsEpsilon(left?: Quaternion, right?: Quaternion, epsilon?: number): boolean {
    const e = epsilon ?? 0
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Math.abs(left.x - right.x) <= e &&
        Math.abs(left.y - right.y) <= e &&
        Math.abs(left.z - right.z) <= e &&
        Math.abs(left.w - right.w) <= e)
    )
  }

  /**
   * 复制本实例。
   *
   * @param result 可选结果对象
   */
  clone(result?: Quaternion): Quaternion | undefined {
    return Quaternion.clone(this, result)
  }

  /**
   * 与 `right` 相等。
   *
   * @param right 右侧
   */
  equals(right?: Quaternion): boolean {
    return Quaternion.equals(this, right)
  }

  /**
   * 与 `right` 在容差内相等。
   *
   * @param right 右侧
   * @param epsilon 容差
   */
  equalsEpsilon(right?: Quaternion, epsilon?: number): boolean {
    return Quaternion.equalsEpsilon(this, right, epsilon)
  }

  /** `(x, y, z, w)` */
  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`
  }
}

let fromAxisAngleScratch = new Cartesian3()
const fromRotationMatrixNext = [1, 2, 0]
const fromRotationMatrixQuat = new Array<number>(3)
const scratchHPRQuaternion = new Quaternion()
let scratchHeadingQuaternion = new Quaternion()
let scratchPitchQuaternion = new Quaternion()
let scratchRollQuaternion = new Quaternion()
const sampledQuaternionAxis = new Cartesian3()
const sampledQuaternionRotation = new Cartesian3()
const sampledQuaternionTempQuaternion = new Quaternion()
const sampledQuaternionQuaternion0 = new Quaternion()
const sampledQuaternionQuaternion0Conjugate = new Quaternion()
let lerpScratch = new Quaternion()
let slerpEndNegated = new Quaternion()
let slerpScaledP = new Quaternion()
let slerpScaledR = new Quaternion()
const squadScratchCartesian0 = new Cartesian3()
const squadScratchCartesian1 = new Cartesian3()
const squadScratchQuaternion0 = new Quaternion()
const squadScratchQuaternion1 = new Quaternion()
const fastSlerpScratchQuaternion = new Quaternion()

const opmu = 1.90110745351730037
const u = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [0, 0, 0, 0, 0, 0, 0, 0]
const v = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [0, 0, 0, 0, 0, 0, 0, 0]
const bT = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [0, 0, 0, 0, 0, 0, 0, 0]
const bD = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [0, 0, 0, 0, 0, 0, 0, 0]

for (let i = 0; i < 7; ++i) {
  const s = i + 1.0
  const t = 2.0 * s + 1.0
  u[i] = 1.0 / (s * t)
  v[i] = s / t
}
u[7] = opmu / (8.0 * 17.0)
v[7] = (opmu * 8.0) / 17.0
