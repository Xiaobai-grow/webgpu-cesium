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
import { DeveloperError } from "./DeveloperError"
import { CesiumMath } from "./CesiumMath"
import type { HeadingPitchRoll } from "./HeadingPitchRoll"
import type { Quaternion } from "./Quaternion"
import type { TypedArray } from "./globalTypes"

/** pack / unpack 可用的数值数组 */
export type NumberArray = number[] | TypedArray

/** 特征分解结果 */
export interface EigenDecompositionResult {
  unitary?: Matrix3 | undefined
  diagonal?: Matrix3 | undefined
}

/**
 * 3×3 列主序矩阵；构造参数按行主序书写。
 * 对标 Cesium `Core/Matrix3.js`。
 */
export class Matrix3 implements ArrayLike<number> {
  [index: number]: number

  static packedLength = 9
  static readonly COLUMN0ROW0 = 0
  static readonly COLUMN0ROW1 = 1
  static readonly COLUMN0ROW2 = 2
  static readonly COLUMN1ROW0 = 3
  static readonly COLUMN1ROW1 = 4
  static readonly COLUMN1ROW2 = 5
  static readonly COLUMN2ROW0 = 6
  static readonly COLUMN2ROW1 = 7
  static readonly COLUMN2ROW2 = 8
  static readonly IDENTITY: Readonly<Matrix3> = Object.freeze(
    new Matrix3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0),
  )
  static readonly ZERO: Readonly<Matrix3> = Object.freeze(
    new Matrix3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
  )

  /**
   * @param column0Row0 列 0 行 0
   * @param column1Row0 列 1 行 0
   * @param column2Row0 列 2 行 0
   * @param column0Row1 列 0 行 1
   * @param column1Row1 列 1 行 1
   * @param column2Row1 列 2 行 1
   * @param column0Row2 列 0 行 2
   * @param column1Row2 列 1 行 2
   * @param column2Row2 列 2 行 2
   */
  constructor(
    column0Row0?: number,
    column1Row0?: number,
    column2Row0?: number,
    column0Row1?: number,
    column1Row1?: number,
    column2Row1?: number,
    column0Row2?: number,
    column1Row2?: number,
    column2Row2?: number,
  ) {
    this[0] = column0Row0 ?? 0.0
    this[1] = column0Row1 ?? 0.0
    this[2] = column0Row2 ?? 0.0
    this[3] = column1Row0 ?? 0.0
    this[4] = column1Row1 ?? 0.0
    this[5] = column1Row2 ?? 0.0
    this[6] = column2Row0 ?? 0.0
    this[7] = column2Row1 ?? 0.0
    this[8] = column2Row2 ?? 0.0
  }

  /** packedLength */
  get length(): number {
    return Matrix3.packedLength
  }

  /**
   * 写入连续数组。
   *
   * @param value 源
   * @param array 目标
   * @param startingIndex 起始下标
   */
  static pack(value: Matrix3, array: NumberArray, startingIndex?: number): NumberArray {
    Check.typeOf.object("value", value)
    Check.defined("array", array)
    let i = startingIndex ?? 0
    array[i++] = value[0]!
    array[i++] = value[1]!
    array[i++] = value[2]!
    array[i++] = value[3]!
    array[i++] = value[4]!
    array[i++] = value[5]!
    array[i++] = value[6]!
    array[i++] = value[7]!
    array[i] = value[8]!
    return array
  }

  /**
   * 从连续数组读出。
   *
   * @param array 源
   * @param startingIndex 起始下标
   * @param result 可选结果对象
   */
  static unpack(array: NumberArray, startingIndex?: number, result?: Matrix3): Matrix3 {
    Check.defined("array", array)
    let i = startingIndex ?? 0
    if (!defined(result)) {
      result = new Matrix3()
    }
    result[0] = array[i++]!
    result[1] = array[i++]!
    result[2] = array[i++]!
    result[3] = array[i++]!
    result[4] = array[i++]!
    result[5] = array[i++]!
    result[6] = array[i++]!
    result[7] = array[i++]!
    result[8] = array[i]!
    return result
  }

  /**
   * 展平矩阵数组。
   *
   * @param array 源
   * @param result 可选目标
   */
  static packArray(array: readonly Matrix3[], result?: NumberArray): NumberArray {
    Check.defined("array", array)
    const length = array.length
    const resultLength = length * 9
    if (!defined(result)) {
      result = new Array(resultLength)
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      throw new DeveloperError(
        "If result is a typed array, it must have exactly array.length * 9 elements",
      )
    } else if (Array.isArray(result) && result.length !== resultLength) {
      result.length = resultLength
    }
    for (let i = 0; i < length; ++i) {
      Matrix3.pack(array[i]!, result, i * 9)
    }
    return result
  }

  /**
   * 从分量数组还原矩阵数组。
   *
   * @param array 分量
   * @param result 可选目标
   */
  static unpackArray(array: NumberArray, result?: Matrix3[]): Matrix3[] {
    Check.defined("array", array)
    Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 9)
    if (array.length % 9 !== 0) {
      throw new DeveloperError("array length must be a multiple of 9.")
    }
    const length = array.length
    if (!defined(result)) {
      result = new Array(length / 9)
    } else {
      result.length = length / 9
    }
    for (let i = 0; i < length; i += 9) {
      const index = i / 9
      result[index] = Matrix3.unpack(array, i, result[index])
    }
    return result
  }

  /**
   * unpack 别名。
   *
   * @param array 源
   * @param startingIndex 起始下标
   * @param result 可选结果对象
   */
  static fromArray(array: NumberArray, startingIndex?: number, result?: Matrix3): Matrix3 {
    return Matrix3.unpack(array, startingIndex, result)
  }

  /**
   * 复制；源未定义时返回 undefined。
   *
   * @param matrix 源
   * @param result 可选结果对象
   */
  static clone(matrix: Matrix3, result?: Matrix3): Matrix3
  static clone(matrix?: Matrix3, result?: Matrix3): Matrix3 | undefined
  static clone(matrix?: Matrix3, result?: Matrix3): Matrix3 | undefined {
    if (!defined(matrix)) {
      return undefined
    }
    if (!defined(result)) {
      return new Matrix3(
        matrix[0],
        matrix[3],
        matrix[6],
        matrix[1],
        matrix[4],
        matrix[7],
        matrix[2],
        matrix[5],
        matrix[8],
      )
    }
    result[0] = matrix[0]!
    result[1] = matrix[1]!
    result[2] = matrix[2]!
    result[3] = matrix[3]!
    result[4] = matrix[4]!
    result[5] = matrix[5]!
    result[6] = matrix[6]!
    result[7] = matrix[7]!
    result[8] = matrix[8]!
    return result
  }

  /**
   * 由列主序数组构造。
   *
   * @param values 列主序
   * @param result 可选结果对象
   */
  static fromColumnMajorArray(values: NumberArray, result?: Matrix3): Matrix3 {
    Check.defined("values", values)
    return Matrix3.clone(values as unknown as Matrix3, result)
  }

  /**
   * 由行主序数组构造。
   *
   * @param values 行主序
   * @param result 可选结果对象
   */
  static fromRowMajorArray(values: NumberArray, result?: Matrix3): Matrix3 {
    Check.defined("values", values)
    if (!defined(result)) {
      return new Matrix3(
        values[0],
        values[1],
        values[2],
        values[3],
        values[4],
        values[5],
        values[6],
        values[7],
        values[8],
      )
    }
    result[0] = values[0]!
    result[1] = values[3]!
    result[2] = values[6]!
    result[3] = values[1]!
    result[4] = values[4]!
    result[5] = values[7]!
    result[6] = values[2]!
    result[7] = values[5]!
    result[8] = values[8]!
    return result
  }

  /**
   * 由四元数构造旋转矩阵。
   *
   * @param quaternion 四元数
   * @param result 可选结果对象
   */
  static fromQuaternion(quaternion: Quaternion, result?: Matrix3): Matrix3 {
    Check.typeOf.object("quaternion", quaternion)
    const x2 = quaternion.x * quaternion.x
    const xy = quaternion.x * quaternion.y
    const xz = quaternion.x * quaternion.z
    const xw = quaternion.x * quaternion.w
    const y2 = quaternion.y * quaternion.y
    const yz = quaternion.y * quaternion.z
    const yw = quaternion.y * quaternion.w
    const z2 = quaternion.z * quaternion.z
    const zw = quaternion.z * quaternion.w
    const w2 = quaternion.w * quaternion.w
    const m00 = x2 - y2 - z2 + w2
    const m01 = 2.0 * (xy - zw)
    const m02 = 2.0 * (xz + yw)
    const m10 = 2.0 * (xy + zw)
    const m11 = -x2 + y2 - z2 + w2
    const m12 = 2.0 * (yz - xw)
    const m20 = 2.0 * (xz - yw)
    const m21 = 2.0 * (yz + xw)
    const m22 = -x2 - y2 + z2 + w2
    if (!defined(result)) {
      return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22)
    }
    result[0] = m00
    result[1] = m10
    result[2] = m20
    result[3] = m01
    result[4] = m11
    result[5] = m21
    result[6] = m02
    result[7] = m12
    result[8] = m22
    return result
  }

  /**
   * 由 heading / pitch / roll 构造旋转矩阵。
   *
   * @param headingPitchRoll 欧拉角
   * @param result 可选结果对象
   */
  static fromHeadingPitchRoll(headingPitchRoll: HeadingPitchRoll, result?: Matrix3): Matrix3 {
    Check.typeOf.object("headingPitchRoll", headingPitchRoll)
    const cosTheta = Math.cos(-headingPitchRoll.pitch)
    const cosPsi = Math.cos(-headingPitchRoll.heading)
    const cosPhi = Math.cos(headingPitchRoll.roll)
    const sinTheta = Math.sin(-headingPitchRoll.pitch)
    const sinPsi = Math.sin(-headingPitchRoll.heading)
    const sinPhi = Math.sin(headingPitchRoll.roll)
    const m00 = cosTheta * cosPsi
    const m01 = -cosPhi * sinPsi + sinPhi * sinTheta * cosPsi
    const m02 = sinPhi * sinPsi + cosPhi * sinTheta * cosPsi
    const m10 = cosTheta * sinPsi
    const m11 = cosPhi * cosPsi + sinPhi * sinTheta * sinPsi
    const m12 = -sinPhi * cosPsi + cosPhi * sinTheta * sinPsi
    const m20 = -sinTheta
    const m21 = sinPhi * cosTheta
    const m22 = cosPhi * cosTheta
    if (!defined(result)) {
      return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22)
    }
    result[0] = m00
    result[1] = m10
    result[2] = m20
    result[3] = m01
    result[4] = m11
    result[5] = m21
    result[6] = m02
    result[7] = m12
    result[8] = m22
    return result
  }

  /**
   * 非均匀缩放矩阵。
   *
   * @param scale 缩放
   * @param result 可选结果对象
   */
  static fromScale(scale: Cartesian3, result?: Matrix3): Matrix3 {
    Check.typeOf.object("scale", scale)
    if (!defined(result)) {
      return new Matrix3(scale.x, 0.0, 0.0, 0.0, scale.y, 0.0, 0.0, 0.0, scale.z)
    }
    result[0] = scale.x
    result[1] = 0.0
    result[2] = 0.0
    result[3] = 0.0
    result[4] = scale.y
    result[5] = 0.0
    result[6] = 0.0
    result[7] = 0.0
    result[8] = scale.z
    return result
  }

  /**
   * 均匀缩放矩阵。
   *
   * @param scale 缩放
   * @param result 可选结果对象
   */
  static fromUniformScale(scale: number, result?: Matrix3): Matrix3 {
    Check.typeOf.number("scale", scale)
    if (!defined(result)) {
      return new Matrix3(scale, 0.0, 0.0, 0.0, scale, 0.0, 0.0, 0.0, scale)
    }
    result[0] = scale
    result[1] = 0.0
    result[2] = 0.0
    result[3] = 0.0
    result[4] = scale
    result[5] = 0.0
    result[6] = 0.0
    result[7] = 0.0
    result[8] = scale
    return result
  }

  /**
   * 叉积等价矩阵。
   *
   * @param vector 左侧向量
   * @param result 可选结果对象
   */
  static fromCrossProduct(vector: Cartesian3, result?: Matrix3): Matrix3 {
    Check.typeOf.object("vector", vector)
    if (!defined(result)) {
      return new Matrix3(
        0.0,
        -vector.z,
        vector.y,
        vector.z,
        0.0,
        -vector.x,
        -vector.y,
        vector.x,
        0.0,
      )
    }
    result[0] = 0.0
    result[1] = vector.z
    result[2] = -vector.y
    result[3] = -vector.z
    result[4] = 0.0
    result[5] = vector.x
    result[6] = vector.y
    result[7] = -vector.x
    result[8] = 0.0
    return result
  }

  /**
   * 绕 X 旋转。
   *
   * @param angle 弧度
   * @param result 可选结果对象
   */
  static fromRotationX(angle: number, result?: Matrix3): Matrix3 {
    Check.typeOf.number("angle", angle)
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    if (!defined(result)) {
      return new Matrix3(1.0, 0.0, 0.0, 0.0, cosAngle, -sinAngle, 0.0, sinAngle, cosAngle)
    }
    result[0] = 1.0
    result[1] = 0.0
    result[2] = 0.0
    result[3] = 0.0
    result[4] = cosAngle
    result[5] = sinAngle
    result[6] = 0.0
    result[7] = -sinAngle
    result[8] = cosAngle
    return result
  }

  /**
   * 绕 Y 旋转。
   *
   * @param angle 弧度
   * @param result 可选结果对象
   */
  static fromRotationY(angle: number, result?: Matrix3): Matrix3 {
    Check.typeOf.number("angle", angle)
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    if (!defined(result)) {
      return new Matrix3(cosAngle, 0.0, sinAngle, 0.0, 1.0, 0.0, -sinAngle, 0.0, cosAngle)
    }
    result[0] = cosAngle
    result[1] = 0.0
    result[2] = -sinAngle
    result[3] = 0.0
    result[4] = 1.0
    result[5] = 0.0
    result[6] = sinAngle
    result[7] = 0.0
    result[8] = cosAngle
    return result
  }

  /**
   * 绕 Z 旋转。
   *
   * @param angle 弧度
   * @param result 可选结果对象
   */
  static fromRotationZ(angle: number, result?: Matrix3): Matrix3 {
    Check.typeOf.number("angle", angle)
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    if (!defined(result)) {
      return new Matrix3(cosAngle, -sinAngle, 0.0, sinAngle, cosAngle, 0.0, 0.0, 0.0, 1.0)
    }
    result[0] = cosAngle
    result[1] = sinAngle
    result[2] = 0.0
    result[3] = -sinAngle
    result[4] = cosAngle
    result[5] = 0.0
    result[6] = 0.0
    result[7] = 0.0
    result[8] = 1.0
    return result
  }

  /**
   * 列主序数组。
   *
   * @param matrix 源
   * @param result 可选目标
   */
  static toArray(matrix: Matrix3, result?: number[]): number[] {
    Check.typeOf.object("matrix", matrix)
    if (!defined(result)) {
      return [
        matrix[0]!,
        matrix[1]!,
        matrix[2]!,
        matrix[3]!,
        matrix[4]!,
        matrix[5]!,
        matrix[6]!,
        matrix[7]!,
        matrix[8]!,
      ]
    }
    result[0] = matrix[0]!
    result[1] = matrix[1]!
    result[2] = matrix[2]!
    result[3] = matrix[3]!
    result[4] = matrix[4]!
    result[5] = matrix[5]!
    result[6] = matrix[6]!
    result[7] = matrix[7]!
    result[8] = matrix[8]!
    return result
  }

  /**
   * 行列下标 → 列主序下标。
   *
   * @param column 列
   * @param row 行
   */
  static getElementIndex(column: number, row: number): number {
    Check.typeOf.number.greaterThanOrEquals("row", row, 0)
    Check.typeOf.number.lessThanOrEquals("row", row, 2)
    Check.typeOf.number.greaterThanOrEquals("column", column, 0)
    Check.typeOf.number.lessThanOrEquals("column", column, 2)
    return column * 3 + row
  }

  /**
   * 取列。
   *
   * @param matrix 源
   * @param index 列
   * @param result 结果
   */
  static getColumn(matrix: Matrix3, index: number, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 2)
    Check.typeOf.object("result", result)
    const startIndex = index * 3
    result.x = matrix[startIndex]!
    result.y = matrix[startIndex + 1]!
    result.z = matrix[startIndex + 2]!
    return result
  }

  /**
   * 设列。
   *
   * @param matrix 源
   * @param index 列
   * @param cartesian 列向量
   * @param result 结果
   */
  static setColumn(
    matrix: Matrix3,
    index: number,
    cartesian: Cartesian3,
    result: Matrix3,
  ): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 2)
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result = Matrix3.clone(matrix, result)
    const startIndex = index * 3
    result[startIndex] = cartesian.x
    result[startIndex + 1] = cartesian.y
    result[startIndex + 2] = cartesian.z
    return result
  }

  /**
   * 取行。
   *
   * @param matrix 源
   * @param index 行
   * @param result 结果
   */
  static getRow(matrix: Matrix3, index: number, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 2)
    Check.typeOf.object("result", result)
    result.x = matrix[index]!
    result.y = matrix[index + 3]!
    result.z = matrix[index + 6]!
    return result
  }

  /**
   * 设行。
   *
   * @param matrix 源
   * @param index 行
   * @param cartesian 行向量
   * @param result 结果
   */
  static setRow(matrix: Matrix3, index: number, cartesian: Cartesian3, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 2)
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result = Matrix3.clone(matrix, result)
    result[index] = cartesian.x
    result[index + 3] = cartesian.y
    result[index + 6] = cartesian.z
    return result
  }

  /**
   * 替换仿射缩放。
   *
   * @param matrix 源
   * @param scale 新缩放
   * @param result 结果
   */
  static setScale(matrix: Matrix3, scale: Cartesian3, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("scale", scale)
    Check.typeOf.object("result", result)
    const existingScale = Matrix3.getScale(matrix, scaleScratch1)
    const scaleRatioX = scale.x / existingScale.x
    const scaleRatioY = scale.y / existingScale.y
    const scaleRatioZ = scale.z / existingScale.z
    result[0] = matrix[0]! * scaleRatioX
    result[1] = matrix[1]! * scaleRatioX
    result[2] = matrix[2]! * scaleRatioX
    result[3] = matrix[3]! * scaleRatioY
    result[4] = matrix[4]! * scaleRatioY
    result[5] = matrix[5]! * scaleRatioY
    result[6] = matrix[6]! * scaleRatioZ
    result[7] = matrix[7]! * scaleRatioZ
    result[8] = matrix[8]! * scaleRatioZ
    return result
  }

  /**
   * 替换均匀缩放。
   *
   * @param matrix 源
   * @param scale 新缩放
   * @param result 结果
   */
  static setUniformScale(matrix: Matrix3, scale: number, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number("scale", scale)
    Check.typeOf.object("result", result)
    const existingScale = Matrix3.getScale(matrix, scaleScratch2)
    const scaleRatioX = scale / existingScale.x
    const scaleRatioY = scale / existingScale.y
    const scaleRatioZ = scale / existingScale.z
    result[0] = matrix[0]! * scaleRatioX
    result[1] = matrix[1]! * scaleRatioX
    result[2] = matrix[2]! * scaleRatioX
    result[3] = matrix[3]! * scaleRatioY
    result[4] = matrix[4]! * scaleRatioY
    result[5] = matrix[5]! * scaleRatioY
    result[6] = matrix[6]! * scaleRatioZ
    result[7] = matrix[7]! * scaleRatioZ
    result[8] = matrix[8]! * scaleRatioZ
    return result
  }

  /**
   * 提取仿射缩放。
   *
   * @param matrix 源
   * @param result 结果
   */
  static getScale(matrix: Matrix3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    result.x = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[0]!, matrix[1]!, matrix[2]!, scratchColumn),
    )
    result.y = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[3]!, matrix[4]!, matrix[5]!, scratchColumn),
    )
    result.z = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[6]!, matrix[7]!, matrix[8]!, scratchColumn),
    )
    return result
  }

  /**
   * 最大列模长。
   *
   * @param matrix 源
   */
  static getMaximumScale(matrix: Matrix3): number {
    Matrix3.getScale(matrix, scaleScratch3)
    return Cartesian3.maximumComponent(scaleScratch3)
  }

  /**
   * 设置旋转（保留缩放）。
   *
   * @param matrix 源
   * @param rotation 旋转
   * @param result 结果
   */
  static setRotation(matrix: Matrix3, rotation: Matrix3, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const scale = Matrix3.getScale(matrix, scaleScratch4)
    result[0] = rotation[0]! * scale.x
    result[1] = rotation[1]! * scale.x
    result[2] = rotation[2]! * scale.x
    result[3] = rotation[3]! * scale.y
    result[4] = rotation[4]! * scale.y
    result[5] = rotation[5]! * scale.y
    result[6] = rotation[6]! * scale.z
    result[7] = rotation[7]! * scale.z
    result[8] = rotation[8]! * scale.z
    return result
  }

  /**
   * 提取旋转。
   *
   * @param matrix 源
   * @param result 结果
   */
  static getRotation(matrix: Matrix3, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const scale = Matrix3.getScale(matrix, scaleScratch5)
    result[0] = matrix[0]! / scale.x
    result[1] = matrix[1]! / scale.x
    result[2] = matrix[2]! / scale.x
    result[3] = matrix[3]! / scale.y
    result[4] = matrix[4]! / scale.y
    result[5] = matrix[5]! / scale.y
    result[6] = matrix[6]! / scale.z
    result[7] = matrix[7]! / scale.z
    result[8] = matrix[8]! / scale.z
    return result
  }

  /**
   * 矩阵乘。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static multiply(left: Matrix3, right: Matrix3, result: Matrix3): Matrix3 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    const column0Row0 = left[0]! * right[0]! + left[3]! * right[1]! + left[6]! * right[2]!
    const column0Row1 = left[1]! * right[0]! + left[4]! * right[1]! + left[7]! * right[2]!
    const column0Row2 = left[2]! * right[0]! + left[5]! * right[1]! + left[8]! * right[2]!
    const column1Row0 = left[0]! * right[3]! + left[3]! * right[4]! + left[6]! * right[5]!
    const column1Row1 = left[1]! * right[3]! + left[4]! * right[4]! + left[7]! * right[5]!
    const column1Row2 = left[2]! * right[3]! + left[5]! * right[4]! + left[8]! * right[5]!
    const column2Row0 = left[0]! * right[6]! + left[3]! * right[7]! + left[6]! * right[8]!
    const column2Row1 = left[1]! * right[6]! + left[4]! * right[7]! + left[7]! * right[8]!
    const column2Row2 = left[2]! * right[6]! + left[5]! * right[7]! + left[8]! * right[8]!
    result[0] = column0Row0
    result[1] = column0Row1
    result[2] = column0Row2
    result[3] = column1Row0
    result[4] = column1Row1
    result[5] = column1Row2
    result[6] = column2Row0
    result[7] = column2Row1
    result[8] = column2Row2
    return result
  }

  /**
   * 矩阵加。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static add(left: Matrix3, right: Matrix3, result: Matrix3): Matrix3 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result[0] = left[0]! + right[0]!
    result[1] = left[1]! + right[1]!
    result[2] = left[2]! + right[2]!
    result[3] = left[3]! + right[3]!
    result[4] = left[4]! + right[4]!
    result[5] = left[5]! + right[5]!
    result[6] = left[6]! + right[6]!
    result[7] = left[7]! + right[7]!
    result[8] = left[8]! + right[8]!
    return result
  }

  /**
   * 矩阵减。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static subtract(left: Matrix3, right: Matrix3, result: Matrix3): Matrix3 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result[0] = left[0]! - right[0]!
    result[1] = left[1]! - right[1]!
    result[2] = left[2]! - right[2]!
    result[3] = left[3]! - right[3]!
    result[4] = left[4]! - right[4]!
    result[5] = left[5]! - right[5]!
    result[6] = left[6]! - right[6]!
    result[7] = left[7]! - right[7]!
    result[8] = left[8]! - right[8]!
    return result
  }

  /**
   * 乘列向量。
   *
   * @param matrix 矩阵
   * @param cartesian 向量
   * @param result 结果
   */
  static multiplyByVector(matrix: Matrix3, cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    const vX = cartesian.x
    const vY = cartesian.y
    const vZ = cartesian.z
    result.x = matrix[0]! * vX + matrix[3]! * vY + matrix[6]! * vZ
    result.y = matrix[1]! * vX + matrix[4]! * vY + matrix[7]! * vZ
    result.z = matrix[2]! * vX + matrix[5]! * vY + matrix[8]! * vZ
    return result
  }

  /**
   * 数乘。
   *
   * @param matrix 矩阵
   * @param scalar 标量
   * @param result 结果
   */
  static multiplyByScalar(matrix: Matrix3, scalar: number, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number("scalar", scalar)
    Check.typeOf.object("result", result)
    result[0] = matrix[0]! * scalar
    result[1] = matrix[1]! * scalar
    result[2] = matrix[2]! * scalar
    result[3] = matrix[3]! * scalar
    result[4] = matrix[4]! * scalar
    result[5] = matrix[5]! * scalar
    result[6] = matrix[6]! * scalar
    result[7] = matrix[7]! * scalar
    result[8] = matrix[8]! * scalar
    return result
  }

  /**
   * 右乘非均匀缩放。
   *
   * @param matrix 矩阵
   * @param scale 缩放
   * @param result 结果
   */
  static multiplyByScale(matrix: Matrix3, scale: Cartesian3, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("scale", scale)
    Check.typeOf.object("result", result)
    result[0] = matrix[0]! * scale.x
    result[1] = matrix[1]! * scale.x
    result[2] = matrix[2]! * scale.x
    result[3] = matrix[3]! * scale.y
    result[4] = matrix[4]! * scale.y
    result[5] = matrix[5]! * scale.y
    result[6] = matrix[6]! * scale.z
    result[7] = matrix[7]! * scale.z
    result[8] = matrix[8]! * scale.z
    return result
  }

  /**
   * 右乘均匀缩放。
   *
   * @param matrix 矩阵
   * @param scale 缩放
   * @param result 结果
   */
  static multiplyByUniformScale(matrix: Matrix3, scale: number, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number("scale", scale)
    Check.typeOf.object("result", result)
    result[0] = matrix[0]! * scale
    result[1] = matrix[1]! * scale
    result[2] = matrix[2]! * scale
    result[3] = matrix[3]! * scale
    result[4] = matrix[4]! * scale
    result[5] = matrix[5]! * scale
    result[6] = matrix[6]! * scale
    result[7] = matrix[7]! * scale
    result[8] = matrix[8]! * scale
    return result
  }

  /**
   * 取负。
   *
   * @param matrix 源
   * @param result 结果
   */
  static negate(matrix: Matrix3, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    result[0] = -matrix[0]!
    result[1] = -matrix[1]!
    result[2] = -matrix[2]!
    result[3] = -matrix[3]!
    result[4] = -matrix[4]!
    result[5] = -matrix[5]!
    result[6] = -matrix[6]!
    result[7] = -matrix[7]!
    result[8] = -matrix[8]!
    return result
  }

  /**
   * 转置。
   *
   * @param matrix 源
   * @param result 结果
   */
  static transpose(matrix: Matrix3, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const column0Row0 = matrix[0]!
    const column0Row1 = matrix[3]!
    const column0Row2 = matrix[6]!
    const column1Row0 = matrix[1]!
    const column1Row1 = matrix[4]!
    const column1Row2 = matrix[7]!
    const column2Row0 = matrix[2]!
    const column2Row1 = matrix[5]!
    const column2Row2 = matrix[8]!
    result[0] = column0Row0
    result[1] = column0Row1
    result[2] = column0Row2
    result[3] = column1Row0
    result[4] = column1Row1
    result[5] = column1Row2
    result[6] = column2Row0
    result[7] = column2Row1
    result[8] = column2Row2
    return result
  }

  /**
   * 对称矩阵的 Jacobi 特征分解。
   *
   * @param matrix 对称矩阵
   * @param result 可选结果
   */
  static computeEigenDecomposition(
    matrix: Matrix3,
    result?: EigenDecompositionResult,
  ): EigenDecompositionResult {
    Check.typeOf.object("matrix", matrix)
    const tolerance = CesiumMath.EPSILON20
    const maxSweeps = 10
    let count = 0
    let sweep = 0
    if (!defined(result)) {
      result = {}
    }
    const unitaryMatrix = (result.unitary = Matrix3.clone(Matrix3.IDENTITY, result.unitary))
    const diagMatrix = (result.diagonal = Matrix3.clone(matrix, result.diagonal))
    const epsilon = tolerance * computeFrobeniusNorm(diagMatrix)
    while (sweep < maxSweeps && offDiagonalFrobeniusNorm(diagMatrix) > epsilon) {
      shurDecomposition(diagMatrix, jMatrix)
      Matrix3.transpose(jMatrix, jMatrixTranspose)
      Matrix3.multiply(diagMatrix, jMatrix, diagMatrix)
      Matrix3.multiply(jMatrixTranspose, diagMatrix, diagMatrix)
      Matrix3.multiply(unitaryMatrix, jMatrix, unitaryMatrix)
      if (++count > 2) {
        ++sweep
        count = 0
      }
    }
    return result
  }

  /**
   * 分量绝对值。
   *
   * @param matrix 源
   * @param result 结果
   */
  static abs(matrix: Matrix3, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    result[0] = Math.abs(matrix[0]!)
    result[1] = Math.abs(matrix[1]!)
    result[2] = Math.abs(matrix[2]!)
    result[3] = Math.abs(matrix[3]!)
    result[4] = Math.abs(matrix[4]!)
    result[5] = Math.abs(matrix[5]!)
    result[6] = Math.abs(matrix[6]!)
    result[7] = Math.abs(matrix[7]!)
    result[8] = Math.abs(matrix[8]!)
    return result
  }

  /**
   * 行列式。
   *
   * @param matrix 源
   */
  static determinant(matrix: Matrix3): number {
    Check.typeOf.object("matrix", matrix)
    const m11 = matrix[0]!
    const m21 = matrix[3]!
    const m31 = matrix[6]!
    const m12 = matrix[1]!
    const m22 = matrix[4]!
    const m32 = matrix[7]!
    const m13 = matrix[2]!
    const m23 = matrix[5]!
    const m33 = matrix[8]!
    return (
      m11 * (m22 * m33 - m23 * m32) + m12 * (m23 * m31 - m21 * m33) + m13 * (m21 * m32 - m22 * m31)
    )
  }

  /**
   * 逆。
   *
   * @param matrix 源
   * @param result 结果
   */
  static inverse(matrix: Matrix3, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const m11 = matrix[0]!
    const m21 = matrix[1]!
    const m31 = matrix[2]!
    const m12 = matrix[3]!
    const m22 = matrix[4]!
    const m32 = matrix[5]!
    const m13 = matrix[6]!
    const m23 = matrix[7]!
    const m33 = matrix[8]!
    const determinant = Matrix3.determinant(matrix)
    if (Math.abs(determinant) <= CesiumMath.EPSILON15) {
      throw new DeveloperError("matrix is not invertible")
    }
    result[0] = m22 * m33 - m23 * m32
    result[1] = m23 * m31 - m21 * m33
    result[2] = m21 * m32 - m22 * m31
    result[3] = m13 * m32 - m12 * m33
    result[4] = m11 * m33 - m13 * m31
    result[5] = m12 * m31 - m11 * m32
    result[6] = m12 * m23 - m13 * m22
    result[7] = m13 * m21 - m11 * m23
    result[8] = m11 * m22 - m12 * m21
    return Matrix3.multiplyByScalar(result, 1.0 / determinant, result)
  }

  /**
   * 逆转置。
   *
   * @param matrix 源
   * @param result 结果
   */
  static inverseTranspose(matrix: Matrix3, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    return Matrix3.inverse(Matrix3.transpose(matrix, scratchTransposeMatrix), result)
  }

  /**
   * 分量严格相等。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left?: Matrix3, right?: Matrix3): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left[0] === right[0] &&
        left[1] === right[1] &&
        left[2] === right[2] &&
        left[3] === right[3] &&
        left[4] === right[4] &&
        left[5] === right[5] &&
        left[6] === right[6] &&
        left[7] === right[7] &&
        left[8] === right[8])
    )
  }

  /**
   * 绝对容差比较。
   *
   * @param left 左
   * @param right 右
   * @param epsilon 容差
   */
  static equalsEpsilon(left?: Matrix3, right?: Matrix3, epsilon?: number): boolean {
    const e = epsilon ?? 0
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Math.abs(left[0]! - right[0]!) <= e &&
        Math.abs(left[1]! - right[1]!) <= e &&
        Math.abs(left[2]! - right[2]!) <= e &&
        Math.abs(left[3]! - right[3]!) <= e &&
        Math.abs(left[4]! - right[4]!) <= e &&
        Math.abs(left[5]! - right[5]!) <= e &&
        Math.abs(left[6]! - right[6]!) <= e &&
        Math.abs(left[7]! - right[7]!) <= e &&
        Math.abs(left[8]! - right[8]!) <= e)
    )
  }

  /**
   * 与数组片段比较。
   *
   * @param matrix 矩阵
   * @param array 数组
   * @param offset 偏移
   */
  static equalsArray(matrix: Matrix3, array: NumberArray, offset: number): boolean {
    return (
      matrix[0] === array[offset] &&
      matrix[1] === array[offset + 1] &&
      matrix[2] === array[offset + 2] &&
      matrix[3] === array[offset + 3] &&
      matrix[4] === array[offset + 4] &&
      matrix[5] === array[offset + 5] &&
      matrix[6] === array[offset + 6] &&
      matrix[7] === array[offset + 7] &&
      matrix[8] === array[offset + 8]
    )
  }

  /**
   * 复制本实例。
   *
   * @param result 可选结果对象
   */
  clone(result?: Matrix3): Matrix3 | undefined {
    return Matrix3.clone(this, result)
  }

  /**
   * 与 `right` 相等。
   *
   * @param right 右侧
   */
  equals(right?: Matrix3): boolean {
    return Matrix3.equals(this, right)
  }

  /**
   * 与 `right` 在容差内相等。
   *
   * @param right 右侧
   * @param epsilon 容差
   */
  equalsEpsilon(right?: Matrix3, epsilon?: number): boolean {
    return Matrix3.equalsEpsilon(this, right, epsilon)
  }

  /**
   * 列主序写入 Float32Array，供 GPU uniform 上传。
   *
   * @param result 可选目标
   */
  toFloat32Array(result?: Float32Array): Float32Array {
    const out = result ?? new Float32Array(9)
    for (let i = 0; i < 9; ++i) {
      out[i] = this[i]!
    }
    return out
  }

  /** 按行打印 */
  toString(): string {
    return (
      `(${this[0]}, ${this[3]}, ${this[6]})\n` +
      `(${this[1]}, ${this[4]}, ${this[7]})\n` +
      `(${this[2]}, ${this[5]}, ${this[8]})`
    )
  }
}

const scaleScratch1 = new Cartesian3()
const scaleScratch2 = new Cartesian3()
const scratchColumn = new Cartesian3()
const scaleScratch3 = new Cartesian3()
const scaleScratch4 = new Cartesian3()
const scaleScratch5 = new Cartesian3()
const jMatrix = new Matrix3()
const jMatrixTranspose = new Matrix3()
const scratchTransposeMatrix = new Matrix3()

/**
 * Frobenius 范数。
 *
 * @param matrix 矩阵
 */
function computeFrobeniusNorm(matrix: Matrix3): number {
  let norm = 0.0
  for (let i = 0; i < 9; ++i) {
    const temp = matrix[i]!
    norm += temp * temp
  }
  return Math.sqrt(norm)
}

const rowVal = [1, 0, 0]
const colVal = [2, 2, 1]

/**
 * 非对角 Frobenius 范数。
 *
 * @param matrix 对称矩阵
 */
function offDiagonalFrobeniusNorm(matrix: Matrix3): number {
  let norm = 0.0
  for (let i = 0; i < 3; ++i) {
    const temp = matrix[Matrix3.getElementIndex(colVal[i]!, rowVal[i]!)]!
    norm += 2.0 * temp * temp
  }
  return Math.sqrt(norm)
}

/**
 * 2×2 对称 Schur 分解辅助矩阵。
 *
 * @param matrix 对称矩阵
 * @param result 结果
 */
function shurDecomposition(matrix: Matrix3, result: Matrix3): Matrix3 {
  const tolerance = CesiumMath.EPSILON15
  let maxDiagonal = 0.0
  let rotAxis = 1
  for (let i = 0; i < 3; ++i) {
    const temp = Math.abs(matrix[Matrix3.getElementIndex(colVal[i]!, rowVal[i]!)]!)
    if (temp > maxDiagonal) {
      rotAxis = i
      maxDiagonal = temp
    }
  }
  let c = 1.0
  let s = 0.0
  const p = rowVal[rotAxis]!
  const q = colVal[rotAxis]!
  if (Math.abs(matrix[Matrix3.getElementIndex(q, p)]!) > tolerance) {
    const qq = matrix[Matrix3.getElementIndex(q, q)]!
    const pp = matrix[Matrix3.getElementIndex(p, p)]!
    const qp = matrix[Matrix3.getElementIndex(q, p)]!
    const tau = (qq - pp) / 2.0 / qp
    let t: number
    if (tau < 0.0) {
      t = -1.0 / (-tau + Math.sqrt(1.0 + tau * tau))
    } else {
      t = 1.0 / (tau + Math.sqrt(1.0 + tau * tau))
    }
    c = 1.0 / Math.sqrt(1.0 + t * t)
    s = t * c
  }
  result = Matrix3.clone(Matrix3.IDENTITY, result)
  result[Matrix3.getElementIndex(p, p)] = c
  result[Matrix3.getElementIndex(q, q)] = c
  result[Matrix3.getElementIndex(q, p)] = s
  result[Matrix3.getElementIndex(p, q)] = -s
  return result
}
