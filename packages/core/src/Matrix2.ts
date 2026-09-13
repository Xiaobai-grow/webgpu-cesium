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
import { Check } from "./Check"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import type { TypedArray } from "./globalTypes"

/** pack / unpack 可用的数值数组 */
export type NumberArray = number[] | TypedArray

/**
 * 2×2 列主序矩阵；构造参数按行主序书写。
 * 对标 Cesium `Core/Matrix2.js`。
 */
export class Matrix2 implements ArrayLike<number> {
  [index: number]: number

  static packedLength = 4
  static readonly COLUMN0ROW0 = 0
  static readonly COLUMN0ROW1 = 1
  static readonly COLUMN1ROW0 = 2
  static readonly COLUMN1ROW1 = 3
  static readonly IDENTITY: Readonly<Matrix2> = Object.freeze(new Matrix2(1.0, 0.0, 0.0, 1.0))
  static readonly ZERO: Readonly<Matrix2> = Object.freeze(new Matrix2(0.0, 0.0, 0.0, 0.0))

  /**
   * @param column0Row0 列 0 行 0
   * @param column1Row0 列 1 行 0
   * @param column0Row1 列 0 行 1
   * @param column1Row1 列 1 行 1
   */
  constructor(
    column0Row0?: number,
    column1Row0?: number,
    column0Row1?: number,
    column1Row1?: number,
  ) {
    this[0] = column0Row0 ?? 0.0
    this[1] = column0Row1 ?? 0.0
    this[2] = column1Row0 ?? 0.0
    this[3] = column1Row1 ?? 0.0
  }

  /** packedLength */
  get length(): number {
    return Matrix2.packedLength
  }

  /**
   * 写入连续数组。
   *
   * @param value 源
   * @param array 目标
   * @param startingIndex 起始下标
   */
  static pack(value: Matrix2, array: NumberArray, startingIndex?: number): NumberArray {
    Check.typeOf.object("value", value)
    Check.defined("array", array)
    let i = startingIndex ?? 0
    array[i++] = value[0]!
    array[i++] = value[1]!
    array[i++] = value[2]!
    array[i] = value[3]!
    return array
  }

  /**
   * 从连续数组读出。
   *
   * @param array 源
   * @param startingIndex 起始下标
   * @param result 可选结果对象
   */
  static unpack(array: NumberArray, startingIndex?: number, result?: Matrix2): Matrix2 {
    Check.defined("array", array)
    let i = startingIndex ?? 0
    if (!defined(result)) {
      result = new Matrix2()
    }
    result[0] = array[i++]!
    result[1] = array[i++]!
    result[2] = array[i++]!
    result[3] = array[i]!
    return result
  }

  /**
   * 展平矩阵数组。
   *
   * @param array 源
   * @param result 可选目标
   */
  static packArray(array: readonly Matrix2[], result?: NumberArray): NumberArray {
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
      Matrix2.pack(array[i]!, result, i * 4)
    }
    return result
  }

  /**
   * 从分量数组还原矩阵数组。
   *
   * @param array 分量
   * @param result 可选目标
   */
  static unpackArray(array: NumberArray, result?: Matrix2[]): Matrix2[] {
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
      result[index] = Matrix2.unpack(array, i, result[index])
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
  static fromArray(array: NumberArray, startingIndex?: number, result?: Matrix2): Matrix2 {
    return Matrix2.unpack(array, startingIndex, result)
  }

  /**
   * 复制；源未定义时返回 undefined。
   *
   * @param matrix 源
   * @param result 可选结果对象
   */
  static clone(matrix: Matrix2, result?: Matrix2): Matrix2
  static clone(matrix?: Matrix2, result?: Matrix2): Matrix2 | undefined
  static clone(matrix?: Matrix2, result?: Matrix2): Matrix2 | undefined {
    if (!defined(matrix)) {
      return undefined
    }
    if (!defined(result)) {
      return new Matrix2(matrix[0], matrix[2], matrix[1], matrix[3])
    }
    result[0] = matrix[0]!
    result[1] = matrix[1]!
    result[2] = matrix[2]!
    result[3] = matrix[3]!
    return result
  }

  /**
   * 由列主序数组构造。
   *
   * @param values 列主序
   * @param result 可选结果对象
   */
  static fromColumnMajorArray(values: NumberArray, result?: Matrix2): Matrix2 {
    Check.defined("values", values)
    return Matrix2.clone(values as unknown as Matrix2, result)
  }

  /**
   * 由行主序数组构造（存成列主序）。
   *
   * @param values 行主序
   * @param result 可选结果对象
   */
  static fromRowMajorArray(values: NumberArray, result?: Matrix2): Matrix2 {
    Check.defined("values", values)
    if (!defined(result)) {
      return new Matrix2(values[0], values[1], values[2], values[3])
    }
    result[0] = values[0]!
    result[1] = values[2]!
    result[2] = values[1]!
    result[3] = values[3]!
    return result
  }

  /**
   * 非均匀缩放矩阵。
   *
   * @param scale 缩放
   * @param result 可选结果对象
   */
  static fromScale(scale: Cartesian2, result?: Matrix2): Matrix2 {
    Check.typeOf.object("scale", scale)
    if (!defined(result)) {
      return new Matrix2(scale.x, 0.0, 0.0, scale.y)
    }
    result[0] = scale.x
    result[1] = 0.0
    result[2] = 0.0
    result[3] = scale.y
    return result
  }

  /**
   * 均匀缩放矩阵。
   *
   * @param scale 缩放
   * @param result 可选结果对象
   */
  static fromUniformScale(scale: number, result?: Matrix2): Matrix2 {
    Check.typeOf.number("scale", scale)
    if (!defined(result)) {
      return new Matrix2(scale, 0.0, 0.0, scale)
    }
    result[0] = scale
    result[1] = 0.0
    result[2] = 0.0
    result[3] = scale
    return result
  }

  /**
   * 旋转矩阵（逆时针为正）。
   *
   * @param angle 弧度
   * @param result 可选结果对象
   */
  static fromRotation(angle: number, result?: Matrix2): Matrix2 {
    Check.typeOf.number("angle", angle)
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    if (!defined(result)) {
      return new Matrix2(cosAngle, -sinAngle, sinAngle, cosAngle)
    }
    result[0] = cosAngle
    result[1] = sinAngle
    result[2] = -sinAngle
    result[3] = cosAngle
    return result
  }

  /**
   * 列主序数组。
   *
   * @param matrix 源
   * @param result 可选目标
   */
  static toArray(matrix: Matrix2, result?: number[]): number[] {
    Check.typeOf.object("matrix", matrix)
    if (!defined(result)) {
      return [matrix[0]!, matrix[1]!, matrix[2]!, matrix[3]!]
    }
    result[0] = matrix[0]!
    result[1] = matrix[1]!
    result[2] = matrix[2]!
    result[3] = matrix[3]!
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
    Check.typeOf.number.lessThanOrEquals("row", row, 1)
    Check.typeOf.number.greaterThanOrEquals("column", column, 0)
    Check.typeOf.number.lessThanOrEquals("column", column, 1)
    return column * 2 + row
  }

  /**
   * 取列。
   *
   * @param matrix 源
   * @param index 列
   * @param result 结果
   */
  static getColumn(matrix: Matrix2, index: number, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 1)
    Check.typeOf.object("result", result)
    const startIndex = index * 2
    result.x = matrix[startIndex]!
    result.y = matrix[startIndex + 1]!
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
    matrix: Matrix2,
    index: number,
    cartesian: Cartesian2,
    result: Matrix2,
  ): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 1)
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result = Matrix2.clone(matrix, result)
    const startIndex = index * 2
    result[startIndex] = cartesian.x
    result[startIndex + 1] = cartesian.y
    return result
  }

  /**
   * 取行。
   *
   * @param matrix 源
   * @param index 行
   * @param result 结果
   */
  static getRow(matrix: Matrix2, index: number, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 1)
    Check.typeOf.object("result", result)
    result.x = matrix[index]!
    result.y = matrix[index + 2]!
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
  static setRow(matrix: Matrix2, index: number, cartesian: Cartesian2, result: Matrix2): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 1)
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result = Matrix2.clone(matrix, result)
    result[index] = cartesian.x
    result[index + 2] = cartesian.y
    return result
  }

  /**
   * 替换仿射缩放。
   *
   * @param matrix 源
   * @param scale 新缩放
   * @param result 结果
   */
  static setScale(matrix: Matrix2, scale: Cartesian2, result: Matrix2): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("scale", scale)
    Check.typeOf.object("result", result)
    const existingScale = Matrix2.getScale(matrix, scaleScratch1)
    const scaleRatioX = scale.x / existingScale.x
    const scaleRatioY = scale.y / existingScale.y
    result[0] = matrix[0]! * scaleRatioX
    result[1] = matrix[1]! * scaleRatioX
    result[2] = matrix[2]! * scaleRatioY
    result[3] = matrix[3]! * scaleRatioY
    return result
  }

  /**
   * 替换均匀缩放。
   *
   * @param matrix 源
   * @param scale 新缩放
   * @param result 结果
   */
  static setUniformScale(matrix: Matrix2, scale: number, result: Matrix2): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number("scale", scale)
    Check.typeOf.object("result", result)
    const existingScale = Matrix2.getScale(matrix, scaleScratch2)
    const scaleRatioX = scale / existingScale.x
    const scaleRatioY = scale / existingScale.y
    result[0] = matrix[0]! * scaleRatioX
    result[1] = matrix[1]! * scaleRatioX
    result[2] = matrix[2]! * scaleRatioY
    result[3] = matrix[3]! * scaleRatioY
    return result
  }

  /**
   * 提取仿射缩放。
   *
   * @param matrix 源
   * @param result 结果
   */
  static getScale(matrix: Matrix2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    result.x = Cartesian2.magnitude(Cartesian2.fromElements(matrix[0]!, matrix[1]!, scratchColumn))
    result.y = Cartesian2.magnitude(Cartesian2.fromElements(matrix[2]!, matrix[3]!, scratchColumn))
    return result
  }

  /**
   * 最大列模长。
   *
   * @param matrix 源
   */
  static getMaximumScale(matrix: Matrix2): number {
    Matrix2.getScale(matrix, scaleScratch3)
    return Cartesian2.maximumComponent(scaleScratch3)
  }

  /**
   * 设置旋转（保留缩放）。
   *
   * @param matrix 源
   * @param rotation 旋转
   * @param result 结果
   */
  static setRotation(matrix: Matrix2, rotation: Matrix2, result: Matrix2): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const scale = Matrix2.getScale(matrix, scaleScratch4)
    result[0] = rotation[0]! * scale.x
    result[1] = rotation[1]! * scale.x
    result[2] = rotation[2]! * scale.y
    result[3] = rotation[3]! * scale.y
    return result
  }

  /**
   * 提取旋转。
   *
   * @param matrix 源
   * @param result 结果
   */
  static getRotation(matrix: Matrix2, result: Matrix2): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const scale = Matrix2.getScale(matrix, scaleScratch5)
    result[0] = matrix[0]! / scale.x
    result[1] = matrix[1]! / scale.x
    result[2] = matrix[2]! / scale.y
    result[3] = matrix[3]! / scale.y
    return result
  }

  /**
   * 矩阵乘。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static multiply(left: Matrix2, right: Matrix2, result: Matrix2): Matrix2 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    const column0Row0 = left[0]! * right[0]! + left[2]! * right[1]!
    const column1Row0 = left[0]! * right[2]! + left[2]! * right[3]!
    const column0Row1 = left[1]! * right[0]! + left[3]! * right[1]!
    const column1Row1 = left[1]! * right[2]! + left[3]! * right[3]!
    result[0] = column0Row0
    result[1] = column0Row1
    result[2] = column1Row0
    result[3] = column1Row1
    return result
  }

  /**
   * 矩阵加。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static add(left: Matrix2, right: Matrix2, result: Matrix2): Matrix2 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result[0] = left[0]! + right[0]!
    result[1] = left[1]! + right[1]!
    result[2] = left[2]! + right[2]!
    result[3] = left[3]! + right[3]!
    return result
  }

  /**
   * 矩阵减。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static subtract(left: Matrix2, right: Matrix2, result: Matrix2): Matrix2 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result[0] = left[0]! - right[0]!
    result[1] = left[1]! - right[1]!
    result[2] = left[2]! - right[2]!
    result[3] = left[3]! - right[3]!
    return result
  }

  /**
   * 乘列向量。
   *
   * @param matrix 矩阵
   * @param cartesian 向量
   * @param result 结果
   */
  static multiplyByVector(matrix: Matrix2, cartesian: Cartesian2, result: Cartesian2): Cartesian2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    const x = matrix[0]! * cartesian.x + matrix[2]! * cartesian.y
    const y = matrix[1]! * cartesian.x + matrix[3]! * cartesian.y
    result.x = x
    result.y = y
    return result
  }

  /**
   * 数乘。
   *
   * @param matrix 矩阵
   * @param scalar 标量
   * @param result 结果
   */
  static multiplyByScalar(matrix: Matrix2, scalar: number, result: Matrix2): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number("scalar", scalar)
    Check.typeOf.object("result", result)
    result[0] = matrix[0]! * scalar
    result[1] = matrix[1]! * scalar
    result[2] = matrix[2]! * scalar
    result[3] = matrix[3]! * scalar
    return result
  }

  /**
   * 右乘非均匀缩放。
   *
   * @param matrix 矩阵
   * @param scale 缩放
   * @param result 结果
   */
  static multiplyByScale(matrix: Matrix2, scale: Cartesian2, result: Matrix2): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("scale", scale)
    Check.typeOf.object("result", result)
    result[0] = matrix[0]! * scale.x
    result[1] = matrix[1]! * scale.x
    result[2] = matrix[2]! * scale.y
    result[3] = matrix[3]! * scale.y
    return result
  }

  /**
   * 右乘均匀缩放。
   *
   * @param matrix 矩阵
   * @param scale 缩放
   * @param result 结果
   */
  static multiplyByUniformScale(matrix: Matrix2, scale: number, result: Matrix2): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number("scale", scale)
    Check.typeOf.object("result", result)
    result[0] = matrix[0]! * scale
    result[1] = matrix[1]! * scale
    result[2] = matrix[2]! * scale
    result[3] = matrix[3]! * scale
    return result
  }

  /**
   * 取负。
   *
   * @param matrix 源
   * @param result 结果
   */
  static negate(matrix: Matrix2, result: Matrix2): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    result[0] = -matrix[0]!
    result[1] = -matrix[1]!
    result[2] = -matrix[2]!
    result[3] = -matrix[3]!
    return result
  }

  /**
   * 转置。
   *
   * @param matrix 源
   * @param result 结果
   */
  static transpose(matrix: Matrix2, result: Matrix2): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const column0Row0 = matrix[0]!
    const column0Row1 = matrix[2]!
    const column1Row0 = matrix[1]!
    const column1Row1 = matrix[3]!
    result[0] = column0Row0
    result[1] = column0Row1
    result[2] = column1Row0
    result[3] = column1Row1
    return result
  }

  /**
   * 分量绝对值。
   *
   * @param matrix 源
   * @param result 结果
   */
  static abs(matrix: Matrix2, result: Matrix2): Matrix2 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    result[0] = Math.abs(matrix[0]!)
    result[1] = Math.abs(matrix[1]!)
    result[2] = Math.abs(matrix[2]!)
    result[3] = Math.abs(matrix[3]!)
    return result
  }

  /**
   * 分量严格相等。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left?: Matrix2, right?: Matrix2): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left[0] === right[0] &&
        left[1] === right[1] &&
        left[2] === right[2] &&
        left[3] === right[3])
    )
  }

  /**
   * 与数组片段比较。
   *
   * @param matrix 矩阵
   * @param array 数组
   * @param offset 偏移
   */
  static equalsArray(matrix: Matrix2, array: NumberArray, offset: number): boolean {
    return (
      matrix[0] === array[offset]! &&
      matrix[1] === array[offset + 1]! &&
      matrix[2] === array[offset + 2]! &&
      matrix[3] === array[offset + 3]!
    )
  }

  /**
   * 绝对容差比较。
   *
   * @param left 左
   * @param right 右
   * @param epsilon 容差
   */
  static equalsEpsilon(left?: Matrix2, right?: Matrix2, epsilon?: number): boolean {
    const e = epsilon ?? 0
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Math.abs(left[0]! - right[0]!) <= e &&
        Math.abs(left[1]! - right[1]!) <= e &&
        Math.abs(left[2]! - right[2]!) <= e &&
        Math.abs(left[3]! - right[3]!) <= e)
    )
  }

  /**
   * 复制本实例。
   *
   * @param result 可选结果对象
   */
  clone(result?: Matrix2): Matrix2 | undefined {
    return Matrix2.clone(this, result)
  }

  /**
   * 与 `right` 相等。
   *
   * @param right 右侧
   */
  equals(right?: Matrix2): boolean {
    return Matrix2.equals(this, right)
  }

  /**
   * 与 `right` 在容差内相等。
   *
   * @param right 右侧
   * @param epsilon 容差
   */
  equalsEpsilon(right?: Matrix2, epsilon?: number): boolean {
    return Matrix2.equalsEpsilon(this, right, epsilon)
  }

  /**
   * 列主序写入 Float32Array，供 GPU uniform 上传。
   *
   * @param result 可选目标
   */
  toFloat32Array(result?: Float32Array): Float32Array {
    const out = result ?? new Float32Array(4)
    for (let i = 0; i < 4; ++i) {
      out[i] = this[i]!
    }
    return out
  }

  /** 按行打印 */
  toString(): string {
    return `(${this[0]}, ${this[2]})\n` + `(${this[1]}, ${this[3]})`
  }
}

const scaleScratch1 = new Cartesian2()
const scaleScratch2 = new Cartesian2()
const scratchColumn = new Cartesian2()
const scaleScratch3 = new Cartesian2()
const scaleScratch4 = new Cartesian2()
const scaleScratch5 = new Cartesian2()
