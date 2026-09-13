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
import { Frozen } from "./Frozen"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { CesiumMath } from "./CesiumMath"
import { Matrix3 } from "./Matrix3"
import { RuntimeError } from "./RuntimeError"
import type { Quaternion } from "./Quaternion"
import type { TypedArray } from "./globalTypes"

/** pack / unpack 可用的数值数组 */
export type NumberArray = number[] | TypedArray

/** 视口，用于 NDC → window */
export interface Viewport {
  x?: number | undefined
  y?: number | undefined
  width?: number | undefined
  height?: number | undefined
}

/** fromCamera 所需的相机子集 */
export interface CameraLike {
  position: Cartesian3
  direction: Cartesian3
  up: Cartesian3
}

/** TranslationRotationScale 结构子集 */
export interface TranslationRotationScaleLike {
  translation: Cartesian3
  rotation: Quaternion
  scale: Cartesian3
}

/**
 * 4×4 列主序矩阵；构造参数按行主序书写。
 * 对标 Cesium `Core/Matrix4.js`。
 */
export class Matrix4 implements ArrayLike<number> {
  [index: number]: number

  static packedLength = 16
  static readonly COLUMN0ROW0 = 0
  static readonly COLUMN0ROW1 = 1
  static readonly COLUMN0ROW2 = 2
  static readonly COLUMN0ROW3 = 3
  static readonly COLUMN1ROW0 = 4
  static readonly COLUMN1ROW1 = 5
  static readonly COLUMN1ROW2 = 6
  static readonly COLUMN1ROW3 = 7
  static readonly COLUMN2ROW0 = 8
  static readonly COLUMN2ROW1 = 9
  static readonly COLUMN2ROW2 = 10
  static readonly COLUMN2ROW3 = 11
  static readonly COLUMN3ROW0 = 12
  static readonly COLUMN3ROW1 = 13
  static readonly COLUMN3ROW2 = 14
  static readonly COLUMN3ROW3 = 15
  static readonly IDENTITY: Readonly<Matrix4> = Object.freeze(
    new Matrix4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0),
  )
  static readonly ZERO: Readonly<Matrix4> = Object.freeze(
    new Matrix4(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
  )

  /**
   * 构造参数为行主序书写，内部按列主序存 `this[0]!..this[15]!`。
   */
  constructor(
    column0Row0?: number,
    column1Row0?: number,
    column2Row0?: number,
    column3Row0?: number,
    column0Row1?: number,
    column1Row1?: number,
    column2Row1?: number,
    column3Row1?: number,
    column0Row2?: number,
    column1Row2?: number,
    column2Row2?: number,
    column3Row2?: number,
    column0Row3?: number,
    column1Row3?: number,
    column2Row3?: number,
    column3Row3?: number,
  ) {
    this[0] = column0Row0 ?? 0.0
    this[1] = column0Row1 ?? 0.0
    this[2] = column0Row2 ?? 0.0
    this[3] = column0Row3 ?? 0.0
    this[4] = column1Row0 ?? 0.0
    this[5] = column1Row1 ?? 0.0
    this[6] = column1Row2 ?? 0.0
    this[7] = column1Row3 ?? 0.0
    this[8] = column2Row0 ?? 0.0
    this[9] = column2Row1 ?? 0.0
    this[10] = column2Row2 ?? 0.0
    this[11] = column2Row3 ?? 0.0
    this[12] = column3Row0 ?? 0.0
    this[13] = column3Row1 ?? 0.0
    this[14] = column3Row2 ?? 0.0
    this[15] = column3Row3 ?? 0.0
  }

  /** packedLength */
  get length(): number {
    return Matrix4.packedLength
  }

  /**
   * 列主序写入 Float32Array，供 GPU uniform 上传。
   *
   * @param result 可选目标
   */
  toFloat32Array(result?: Float32Array): Float32Array {
    const out = result ?? new Float32Array(16)
    for (let i = 0; i < 16; ++i) {
      out[i] = this[i]!
    }
    return out
  }

  /**
   * 写入连续数组。
   *
   * @param value 源
   * @param array 目标
   * @param startingIndex 起始下标
   */
  static pack(value: Matrix4, array: NumberArray, startingIndex?: number): NumberArray {
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
    array[i++] = value[8]!
    array[i++] = value[9]!
    array[i++] = value[10]!
    array[i++] = value[11]!
    array[i++] = value[12]!
    array[i++] = value[13]!
    array[i++] = value[14]!
    array[i] = value[15]!
    return array
  }

  /**
   * 从连续数组读出。
   *
   * @param array 源
   * @param startingIndex 起始下标
   * @param result 可选结果对象
   */
  static unpack(array: NumberArray, startingIndex?: number, result?: Matrix4): Matrix4 {
    Check.defined("array", array)
    let i = startingIndex ?? 0
    if (!defined(result)) {
      result = new Matrix4()
    }
    result[0] = array[i++]!
    result[1] = array[i++]!
    result[2] = array[i++]!
    result[3] = array[i++]!
    result[4] = array[i++]!
    result[5] = array[i++]!
    result[6] = array[i++]!
    result[7] = array[i++]!
    result[8] = array[i++]!
    result[9] = array[i++]!
    result[10] = array[i++]!
    result[11] = array[i++]!
    result[12] = array[i++]!
    result[13] = array[i++]!
    result[14] = array[i++]!
    result[15] = array[i]!
    return result
  }

  /**
   * 展平矩阵数组。
   *
   * @param array 源
   * @param result 可选目标
   */
  static packArray(array: readonly Matrix4[], result?: NumberArray): NumberArray {
    Check.defined("array", array)
    const length = array.length
    const resultLength = length * 16
    if (!defined(result)) {
      result = new Array(resultLength)
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      throw new DeveloperError(
        "If result is a typed array, it must have exactly array.length * 16 elements",
      )
    } else if (Array.isArray(result) && result.length !== resultLength) {
      result.length = resultLength
    }
    for (let i = 0; i < length; ++i) {
      Matrix4.pack(array[i]!, result, i * 16)
    }
    return result
  }

  /**
   * 从分量数组还原矩阵数组。
   *
   * @param array 分量
   * @param result 可选目标
   */
  static unpackArray(array: NumberArray, result?: Matrix4[]): Matrix4[] {
    Check.defined("array", array)
    Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 16)
    if (array.length % 16 !== 0) {
      throw new DeveloperError("array length must be a multiple of 16.")
    }
    const length = array.length
    if (!defined(result)) {
      result = new Array(length / 16)
    } else {
      result.length = length / 16
    }
    for (let i = 0; i < length; i += 16) {
      const index = i / 16
      result[index] = Matrix4.unpack(array, i, result[index])
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
  static fromArray(array: NumberArray, startingIndex?: number, result?: Matrix4): Matrix4 {
    return Matrix4.unpack(array, startingIndex, result)
  }

  /**
   * 复制；源未定义时返回 undefined。
   *
   * @param matrix 源
   * @param result 可选结果对象
   */
  static clone(matrix: Matrix4, result?: Matrix4): Matrix4
  static clone(matrix?: Matrix4, result?: Matrix4): Matrix4 | undefined
  static clone(matrix?: Matrix4, result?: Matrix4): Matrix4 | undefined {
    if (!defined(matrix)) {
      return undefined
    }
    if (!defined(result)) {
      return new Matrix4(
        matrix[0],
        matrix[4],
        matrix[8],
        matrix[12],
        matrix[1],
        matrix[5],
        matrix[9],
        matrix[13],
        matrix[2],
        matrix[6],
        matrix[10],
        matrix[14],
        matrix[3],
        matrix[7],
        matrix[11],
        matrix[15],
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
    result[9] = matrix[9]!
    result[10] = matrix[10]!
    result[11] = matrix[11]!
    result[12] = matrix[12]!
    result[13] = matrix[13]!
    result[14] = matrix[14]!
    result[15] = matrix[15]!
    return result
  }

  /**
   * 由列主序数组构造。
   *
   * @param values 列主序
   * @param result 可选结果对象
   */
  static fromColumnMajorArray(values: NumberArray, result?: Matrix4): Matrix4 {
    Check.defined("values", values)
    return Matrix4.clone(values as unknown as Matrix4, result)
  }

  /**
   * 由行主序数组构造。
   *
   * @param values 行主序
   * @param result 可选结果对象
   */
  static fromRowMajorArray(values: NumberArray, result?: Matrix4): Matrix4 {
    Check.defined("values", values)
    if (!defined(result)) {
      return new Matrix4(
        values[0],
        values[1],
        values[2],
        values[3],
        values[4],
        values[5],
        values[6],
        values[7],
        values[8],
        values[9],
        values[10],
        values[11],
        values[12],
        values[13],
        values[14],
        values[15],
      )
    }
    result[0] = values[0]!
    result[1] = values[4]!
    result[2] = values[8]!
    result[3] = values[12]!
    result[4] = values[1]!
    result[5] = values[5]!
    result[6] = values[9]!
    result[7] = values[13]!
    result[8] = values[2]!
    result[9] = values[6]!
    result[10] = values[10]!
    result[11] = values[14]!
    result[12] = values[3]!
    result[13] = values[7]!
    result[14] = values[11]!
    result[15] = values[15]!
    return result
  }

  /**
   * 由 3×3 旋转与平移构造。
   *
   * @param rotation 旋转
   * @param translation 平移
   * @param result 可选结果对象
   */
  static fromRotationTranslation(
    rotation: Matrix3,
    translation?: Cartesian3,
    result?: Matrix4,
  ): Matrix4 {
    Check.typeOf.object("rotation", rotation)
    const t = translation ?? Cartesian3.ZERO
    if (!defined(result)) {
      return new Matrix4(
        rotation[0],
        rotation[3],
        rotation[6],
        t.x,
        rotation[1],
        rotation[4],
        rotation[7],
        t.y,
        rotation[2],
        rotation[5],
        rotation[8],
        t.z,
        0.0,
        0.0,
        0.0,
        1.0,
      )
    }
    result[0] = rotation[0]!
    result[1] = rotation[1]!
    result[2] = rotation[2]!
    result[3] = 0.0
    result[4] = rotation[3]!
    result[5] = rotation[4]!
    result[6] = rotation[5]!
    result[7] = 0.0
    result[8] = rotation[6]!
    result[9] = rotation[7]!
    result[10] = rotation[8]!
    result[11] = 0.0
    result[12] = t.x
    result[13] = t.y
    result[14] = t.z
    result[15] = 1.0
    return result
  }

  /**
   * 由平移、四元数旋转与缩放构造 TRS。
   *
   * @param translation 平移
   * @param rotation 旋转
   * @param scale 缩放
   * @param result 可选结果对象
   */
  static fromTranslationQuaternionRotationScale(
    translation: Cartesian3,
    rotation: Quaternion,
    scale: Cartesian3,
    result?: Matrix4,
  ): Matrix4 {
    Check.typeOf.object("translation", translation)
    Check.typeOf.object("rotation", rotation)
    Check.typeOf.object("scale", scale)
    if (!defined(result)) {
      result = new Matrix4()
    }
    const scaleX = scale.x
    const scaleY = scale.y
    const scaleZ = scale.z
    const x2 = rotation.x * rotation.x
    const xy = rotation.x * rotation.y
    const xz = rotation.x * rotation.z
    const xw = rotation.x * rotation.w
    const y2 = rotation.y * rotation.y
    const yz = rotation.y * rotation.z
    const yw = rotation.y * rotation.w
    const z2 = rotation.z * rotation.z
    const zw = rotation.z * rotation.w
    const w2 = rotation.w * rotation.w
    const m00 = x2 - y2 - z2 + w2
    const m01 = 2.0 * (xy - zw)
    const m02 = 2.0 * (xz + yw)
    const m10 = 2.0 * (xy + zw)
    const m11 = -x2 + y2 - z2 + w2
    const m12 = 2.0 * (yz - xw)
    const m20 = 2.0 * (xz - yw)
    const m21 = 2.0 * (yz + xw)
    const m22 = -x2 - y2 + z2 + w2
    result[0] = m00 * scaleX
    result[1] = m10 * scaleX
    result[2] = m20 * scaleX
    result[3] = 0.0
    result[4] = m01 * scaleY
    result[5] = m11 * scaleY
    result[6] = m21 * scaleY
    result[7] = 0.0
    result[8] = m02 * scaleZ
    result[9] = m12 * scaleZ
    result[10] = m22 * scaleZ
    result[11] = 0.0
    result[12] = translation.x
    result[13] = translation.y
    result[14] = translation.z
    result[15] = 1.0
    return result
  }

  /**
   * 由 TRS 对象构造。
   *
   * @param translationRotationScale TRS
   * @param result 可选结果对象
   */
  static fromTranslationRotationScale(
    translationRotationScale: TranslationRotationScaleLike,
    result?: Matrix4,
  ): Matrix4 {
    Check.typeOf.object("translationRotationScale", translationRotationScale)
    return Matrix4.fromTranslationQuaternionRotationScale(
      translationRotationScale.translation,
      translationRotationScale.rotation,
      translationRotationScale.scale,
      result,
    )
  }

  /**
   * 由平移构造。
   *
   * @param translation 平移
   * @param result 可选结果对象
   */
  static fromTranslation(translation: Cartesian3, result?: Matrix4): Matrix4 {
    Check.typeOf.object("translation", translation)
    return Matrix4.fromRotationTranslation(Matrix3.IDENTITY, translation, result)
  }

  /**
   * 非均匀缩放矩阵。
   *
   * @param scale 缩放
   * @param result 可选结果对象
   */
  static fromScale(scale: Cartesian3, result?: Matrix4): Matrix4 {
    Check.typeOf.object("scale", scale)
    if (!defined(result)) {
      return new Matrix4(
        scale.x,
        0.0,
        0.0,
        0.0,
        0.0,
        scale.y,
        0.0,
        0.0,
        0.0,
        0.0,
        scale.z,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0,
      )
    }
    result[0] = scale.x
    result[1] = 0.0
    result[2] = 0.0
    result[3] = 0.0
    result[4] = 0.0
    result[5] = scale.y
    result[6] = 0.0
    result[7] = 0.0
    result[8] = 0.0
    result[9] = 0.0
    result[10] = scale.z
    result[11] = 0.0
    result[12] = 0.0
    result[13] = 0.0
    result[14] = 0.0
    result[15] = 1.0
    return result
  }

  /**
   * 均匀缩放矩阵。
   *
   * @param scale 缩放
   * @param result 可选结果对象
   */
  static fromUniformScale(scale: number, result?: Matrix4): Matrix4 {
    Check.typeOf.number("scale", scale)
    if (!defined(result)) {
      return new Matrix4(
        scale,
        0.0,
        0.0,
        0.0,
        0.0,
        scale,
        0.0,
        0.0,
        0.0,
        0.0,
        scale,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0,
      )
    }
    result[0] = scale
    result[1] = 0.0
    result[2] = 0.0
    result[3] = 0.0
    result[4] = 0.0
    result[5] = scale
    result[6] = 0.0
    result[7] = 0.0
    result[8] = 0.0
    result[9] = 0.0
    result[10] = scale
    result[11] = 0.0
    result[12] = 0.0
    result[13] = 0.0
    result[14] = 0.0
    result[15] = 1.0
    return result
  }

  /**
   * 由 3×3 旋转嵌入 4×4。
   *
   * @param rotation 旋转
   * @param result 可选结果对象
   */
  static fromRotation(rotation: Matrix3, result?: Matrix4): Matrix4 {
    Check.typeOf.object("rotation", rotation)
    if (!defined(result)) {
      result = new Matrix4()
    }
    result[0] = rotation[0]!
    result[1] = rotation[1]!
    result[2] = rotation[2]!
    result[3] = 0.0
    result[4] = rotation[3]!
    result[5] = rotation[4]!
    result[6] = rotation[5]!
    result[7] = 0.0
    result[8] = rotation[6]!
    result[9] = rotation[7]!
    result[10] = rotation[8]!
    result[11] = 0.0
    result[12] = 0.0
    result[13] = 0.0
    result[14] = 0.0
    result[15] = 1.0
    return result
  }

  /**
   * 由相机位姿构造 view 矩阵。
   *
   * @param camera 相机
   * @param result 可选结果对象
   */
  static fromCamera(camera: CameraLike, result?: Matrix4): Matrix4 {
    Check.typeOf.object("camera", camera)
    const position = camera.position
    const direction = camera.direction
    const up = camera.up
    Check.typeOf.object("camera.position", position)
    Check.typeOf.object("camera.direction", direction)
    Check.typeOf.object("camera.up", up)
    Cartesian3.normalize(direction, fromCameraF)
    Cartesian3.normalize(Cartesian3.cross(fromCameraF, up, fromCameraR), fromCameraR)
    Cartesian3.normalize(Cartesian3.cross(fromCameraR, fromCameraF, fromCameraU), fromCameraU)
    const sX = fromCameraR.x
    const sY = fromCameraR.y
    const sZ = fromCameraR.z
    const fX = fromCameraF.x
    const fY = fromCameraF.y
    const fZ = fromCameraF.z
    const uX = fromCameraU.x
    const uY = fromCameraU.y
    const uZ = fromCameraU.z
    const positionX = position.x
    const positionY = position.y
    const positionZ = position.z
    const t0 = sX * -positionX + sY * -positionY + sZ * -positionZ
    const t1 = uX * -positionX + uY * -positionY + uZ * -positionZ
    const t2 = fX * positionX + fY * positionY + fZ * positionZ
    if (!defined(result)) {
      return new Matrix4(sX, sY, sZ, t0, uX, uY, uZ, t1, -fX, -fY, -fZ, t2, 0.0, 0.0, 0.0, 1.0)
    }
    result[0] = sX
    result[1] = uX
    result[2] = -fX
    result[3] = 0.0
    result[4] = sY
    result[5] = uY
    result[6] = -fY
    result[7] = 0.0
    result[8] = sZ
    result[9] = uZ
    result[10] = -fZ
    result[11] = 0.0
    result[12] = t0
    result[13] = t1
    result[14] = t2
    result[15] = 1.0
    return result
  }

  /**
   * 透视投影（OpenGL 风格，-1..1 深度）。result 必填。
   *
   * @param fovY 纵向视场，弧度
   * @param aspectRatio 宽高比
   * @param near 近平面
   * @param far 远平面
   * @param result 结果
   */
  static computePerspectiveFieldOfView(
    fovY: number,
    aspectRatio: number,
    near: number,
    far: number,
    result: Matrix4,
  ): Matrix4 {
    Check.typeOf.number.greaterThan("fovY", fovY, 0.0)
    Check.typeOf.number.lessThan("fovY", fovY, Math.PI)
    Check.typeOf.number.greaterThan("near", near, 0.0)
    Check.typeOf.number.greaterThan("far", far, 0.0)
    Check.typeOf.object("result", result)
    const bottom = Math.tan(fovY * 0.5)
    const column1Row1 = 1.0 / bottom
    const column0Row0 = column1Row1 / aspectRatio
    const column2Row2 = (far + near) / (near - far)
    const column3Row2 = (2.0 * far * near) / (near - far)
    result[0] = column0Row0
    result[1] = 0.0
    result[2] = 0.0
    result[3] = 0.0
    result[4] = 0.0
    result[5] = column1Row1
    result[6] = 0.0
    result[7] = 0.0
    result[8] = 0.0
    result[9] = 0.0
    result[10] = column2Row2
    result[11] = -1.0
    result[12] = 0.0
    result[13] = 0.0
    result[14] = column3Row2
    result[15] = 0.0
    return result
  }

  /**
   * 离轴正交投影。
   *
   * @param left 左
   * @param right 右
   * @param bottom 下
   * @param top 上
   * @param near 近
   * @param far 远
   * @param result 结果
   */
  static computeOrthographicOffCenter(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
    result: Matrix4,
  ): Matrix4 {
    Check.typeOf.number("left", left)
    Check.typeOf.number("right", right)
    Check.typeOf.number("bottom", bottom)
    Check.typeOf.number("top", top)
    Check.typeOf.number("near", near)
    Check.typeOf.number("far", far)
    Check.typeOf.object("result", result)
    let a = 1.0 / (right - left)
    let b = 1.0 / (top - bottom)
    let c = 1.0 / (far - near)
    const tx = -(right + left) * a
    const ty = -(top + bottom) * b
    const tz = -(far + near) * c
    a *= 2.0
    b *= 2.0
    c *= -2.0
    result[0] = a
    result[1] = 0.0
    result[2] = 0.0
    result[3] = 0.0
    result[4] = 0.0
    result[5] = b
    result[6] = 0.0
    result[7] = 0.0
    result[8] = 0.0
    result[9] = 0.0
    result[10] = c
    result[11] = 0.0
    result[12] = tx
    result[13] = ty
    result[14] = tz
    result[15] = 1.0
    return result
  }

  /**
   * 离轴透视投影。
   *
   * @param left 左
   * @param right 右
   * @param bottom 下
   * @param top 上
   * @param near 近
   * @param far 远
   * @param result 结果
   */
  static computePerspectiveOffCenter(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
    result: Matrix4,
  ): Matrix4 {
    Check.typeOf.number("left", left)
    Check.typeOf.number("right", right)
    Check.typeOf.number("bottom", bottom)
    Check.typeOf.number("top", top)
    Check.typeOf.number("near", near)
    Check.typeOf.number("far", far)
    Check.typeOf.object("result", result)
    const column0Row0 = (2.0 * near) / (right - left)
    const column1Row1 = (2.0 * near) / (top - bottom)
    const column2Row0 = (right + left) / (right - left)
    const column2Row1 = (top + bottom) / (top - bottom)
    const column2Row2 = -(far + near) / (far - near)
    result[0] = column0Row0
    result[1] = 0.0
    result[2] = 0.0
    result[3] = 0.0
    result[4] = 0.0
    result[5] = column1Row1
    result[6] = 0.0
    result[7] = 0.0
    result[8] = column2Row0
    result[9] = column2Row1
    result[10] = column2Row2
    result[11] = -1.0
    result[12] = 0.0
    result[13] = 0.0
    result[14] = (-2.0 * far * near) / (far - near)
    result[15] = 0.0
    return result
  }

  /**
   * 无限远离轴透视。
   *
   * @param left 左
   * @param right 右
   * @param bottom 下
   * @param top 上
   * @param near 近
   * @param result 结果
   */
  static computeInfinitePerspectiveOffCenter(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    result: Matrix4,
  ): Matrix4 {
    Check.typeOf.number("left", left)
    Check.typeOf.number("right", right)
    Check.typeOf.number("bottom", bottom)
    Check.typeOf.number("top", top)
    Check.typeOf.number("near", near)
    Check.typeOf.object("result", result)
    result[0] = (2.0 * near) / (right - left)
    result[1] = 0.0
    result[2] = 0.0
    result[3] = 0.0
    result[4] = 0.0
    result[5] = (2.0 * near) / (top - bottom)
    result[6] = 0.0
    result[7] = 0.0
    result[8] = (right + left) / (right - left)
    result[9] = (top + bottom) / (top - bottom)
    result[10] = -1.0
    result[11] = -1.0
    result[12] = 0.0
    result[13] = 0.0
    result[14] = -2.0 * near
    result[15] = 0.0
    return result
  }

  /**
   * NDC → 窗口坐标。
   *
   * @param viewport 视口
   * @param nearDepthRange 近深度
   * @param farDepthRange 远深度
   * @param result 可选结果对象
   */
  static computeViewportTransformation(
    viewport?: Viewport,
    nearDepthRange?: number,
    farDepthRange?: number,
    result?: Matrix4,
  ): Matrix4 {
    if (!defined(result)) {
      result = new Matrix4()
    }
    const vp = viewport ?? Frozen.EMPTY_OBJECT
    const x = vp.x ?? 0.0
    const y = vp.y ?? 0.0
    const width = vp.width ?? 0.0
    const height = vp.height ?? 0.0
    const near = nearDepthRange ?? 0.0
    const far = farDepthRange ?? 1.0
    const halfWidth = width * 0.5
    const halfHeight = height * 0.5
    const halfDepth = (far - near) * 0.5
    result[0] = halfWidth
    result[1] = 0.0
    result[2] = 0.0
    result[3] = 0.0
    result[4] = 0.0
    result[5] = halfHeight
    result[6] = 0.0
    result[7] = 0.0
    result[8] = 0.0
    result[9] = 0.0
    result[10] = halfDepth
    result[11] = 0.0
    result[12] = x + halfWidth
    result[13] = y + halfHeight
    result[14] = near + halfDepth
    result[15] = 1.0
    return result
  }

  /**
   * 世界 → 观察。
   *
   * @param position 相机位置
   * @param direction 前向
   * @param up 上向
   * @param right 右向
   * @param result 结果
   */
  static computeView(
    position: Cartesian3,
    direction: Cartesian3,
    up: Cartesian3,
    right: Cartesian3,
    result: Matrix4,
  ): Matrix4 {
    Check.typeOf.object("position", position)
    Check.typeOf.object("direction", direction)
    Check.typeOf.object("up", up)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result[0] = right.x
    result[1] = up.x
    result[2] = -direction.x
    result[3] = 0.0
    result[4] = right.y
    result[5] = up.y
    result[6] = -direction.y
    result[7] = 0.0
    result[8] = right.z
    result[9] = up.z
    result[10] = -direction.z
    result[11] = 0.0
    result[12] = -Cartesian3.dot(right, position)
    result[13] = -Cartesian3.dot(up, position)
    result[14] = Cartesian3.dot(direction, position)
    result[15] = 1.0
    return result
  }

  /**
   * 列主序数组。
   *
   * @param matrix 源
   * @param result 可选目标
   */
  static toArray(matrix: Matrix4, result?: number[]): number[] {
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
        matrix[9]!,
        matrix[10]!,
        matrix[11]!,
        matrix[12]!,
        matrix[13]!,
        matrix[14]!,
        matrix[15]!,
      ]
    }
    for (let i = 0; i < 16; ++i) {
      result[i] = matrix[i]!
    }
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
    Check.typeOf.number.lessThanOrEquals("row", row, 3)
    Check.typeOf.number.greaterThanOrEquals("column", column, 0)
    Check.typeOf.number.lessThanOrEquals("column", column, 3)
    return column * 4 + row
  }

  /**
   * 取列。
   *
   * @param matrix 源
   * @param index 列
   * @param result 结果
   */
  static getColumn(matrix: Matrix4, index: number, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 3)
    Check.typeOf.object("result", result)
    const startIndex = index * 4
    result.x = matrix[startIndex]!
    result.y = matrix[startIndex + 1]!
    result.z = matrix[startIndex + 2]!
    result.w = matrix[startIndex + 3]!
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
    matrix: Matrix4,
    index: number,
    cartesian: Cartesian4,
    result: Matrix4,
  ): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 3)
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result = Matrix4.clone(matrix, result)
    const startIndex = index * 4
    result[startIndex] = cartesian.x
    result[startIndex + 1] = cartesian.y
    result[startIndex + 2] = cartesian.z
    result[startIndex + 3] = cartesian.w
    return result
  }

  /**
   * 取行。
   *
   * @param matrix 源
   * @param index 行
   * @param result 结果
   */
  static getRow(matrix: Matrix4, index: number, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 3)
    Check.typeOf.object("result", result)
    result.x = matrix[index]!
    result.y = matrix[index + 4]!
    result.z = matrix[index + 8]!
    result.w = matrix[index + 12]!
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
  static setRow(matrix: Matrix4, index: number, cartesian: Cartesian4, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    Check.typeOf.number.lessThanOrEquals("index", index, 3)
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    result = Matrix4.clone(matrix, result)
    result[index] = cartesian.x
    result[index + 4] = cartesian.y
    result[index + 8] = cartesian.z
    result[index + 12] = cartesian.w
    return result
  }

  /**
   * 替换平移（仿射）。
   *
   * @param matrix 源
   * @param translation 平移
   * @param result 结果
   */
  static setTranslation(matrix: Matrix4, translation: Cartesian3, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("translation", translation)
    Check.typeOf.object("result", result)
    result[0] = matrix[0]!
    result[1] = matrix[1]!
    result[2] = matrix[2]!
    result[3] = matrix[3]!
    result[4] = matrix[4]!
    result[5] = matrix[5]!
    result[6] = matrix[6]!
    result[7] = matrix[7]!
    result[8] = matrix[8]!
    result[9] = matrix[9]!
    result[10] = matrix[10]!
    result[11] = matrix[11]!
    result[12] = translation.x
    result[13] = translation.y
    result[14] = translation.z
    result[15] = matrix[15]!
    return result
  }

  /**
   * 替换仿射缩放。
   *
   * @param matrix 源
   * @param scale 新缩放
   * @param result 结果
   */
  static setScale(matrix: Matrix4, scale: Cartesian3, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("scale", scale)
    Check.typeOf.object("result", result)
    const existingScale = Matrix4.getScale(matrix, scaleScratch1)
    const scaleRatioX = scale.x / existingScale.x
    const scaleRatioY = scale.y / existingScale.y
    const scaleRatioZ = scale.z / existingScale.z
    result[0] = matrix[0]! * scaleRatioX
    result[1] = matrix[1]! * scaleRatioX
    result[2] = matrix[2]! * scaleRatioX
    result[3] = matrix[3]!
    result[4] = matrix[4]! * scaleRatioY
    result[5] = matrix[5]! * scaleRatioY
    result[6] = matrix[6]! * scaleRatioY
    result[7] = matrix[7]!
    result[8] = matrix[8]! * scaleRatioZ
    result[9] = matrix[9]! * scaleRatioZ
    result[10] = matrix[10]! * scaleRatioZ
    result[11] = matrix[11]!
    result[12] = matrix[12]!
    result[13] = matrix[13]!
    result[14] = matrix[14]!
    result[15] = matrix[15]!
    return result
  }

  /**
   * 替换均匀缩放。
   *
   * @param matrix 源
   * @param scale 新缩放
   * @param result 结果
   */
  static setUniformScale(matrix: Matrix4, scale: number, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number("scale", scale)
    Check.typeOf.object("result", result)
    const existingScale = Matrix4.getScale(matrix, scaleScratch2)
    const scaleRatioX = scale / existingScale.x
    const scaleRatioY = scale / existingScale.y
    const scaleRatioZ = scale / existingScale.z
    result[0] = matrix[0]! * scaleRatioX
    result[1] = matrix[1]! * scaleRatioX
    result[2] = matrix[2]! * scaleRatioX
    result[3] = matrix[3]!
    result[4] = matrix[4]! * scaleRatioY
    result[5] = matrix[5]! * scaleRatioY
    result[6] = matrix[6]! * scaleRatioY
    result[7] = matrix[7]!
    result[8] = matrix[8]! * scaleRatioZ
    result[9] = matrix[9]! * scaleRatioZ
    result[10] = matrix[10]! * scaleRatioZ
    result[11] = matrix[11]!
    result[12] = matrix[12]!
    result[13] = matrix[13]!
    result[14] = matrix[14]!
    result[15] = matrix[15]!
    return result
  }

  /**
   * 提取仿射缩放。
   *
   * @param matrix 源
   * @param result 结果
   */
  static getScale(matrix: Matrix4, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    result.x = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[0]!, matrix[1]!, matrix[2]!, scratchColumn),
    )
    result.y = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[4]!, matrix[5]!, matrix[6]!, scratchColumn),
    )
    result.z = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[8]!, matrix[9]!, matrix[10]!, scratchColumn),
    )
    return result
  }

  /**
   * 最大列模长。
   *
   * @param matrix 源
   */
  static getMaximumScale(matrix: Matrix4): number {
    Matrix4.getScale(matrix, scaleScratch3)
    return Cartesian3.maximumComponent(scaleScratch3)
  }

  /**
   * 设置旋转（保留缩放与平移）。
   *
   * @param matrix 源
   * @param rotation 旋转
   * @param result 结果
   */
  static setRotation(matrix: Matrix4, rotation: Matrix3, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const scale = Matrix4.getScale(matrix, scaleScratch4)
    result[0] = rotation[0]! * scale.x
    result[1] = rotation[1]! * scale.x
    result[2] = rotation[2]! * scale.x
    result[3] = matrix[3]!
    result[4] = rotation[3]! * scale.y
    result[5] = rotation[4]! * scale.y
    result[6] = rotation[5]! * scale.y
    result[7] = matrix[7]!
    result[8] = rotation[6]! * scale.z
    result[9] = rotation[7]! * scale.z
    result[10] = rotation[8]! * scale.z
    result[11] = matrix[11]!
    result[12] = matrix[12]!
    result[13] = matrix[13]!
    result[14] = matrix[14]!
    result[15] = matrix[15]!
    return result
  }

  /**
   * 提取 3×3 旋转（去缩放）。
   *
   * @param matrix 源
   * @param result 结果
   */
  static getRotation(matrix: Matrix4, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const scale = Matrix4.getScale(matrix, scaleScratch5)
    result[0] = matrix[0]! / scale.x
    result[1] = matrix[1]! / scale.x
    result[2] = matrix[2]! / scale.x
    result[3] = matrix[4]! / scale.y
    result[4] = matrix[5]! / scale.y
    result[5] = matrix[6]! / scale.y
    result[6] = matrix[8]! / scale.z
    result[7] = matrix[9]! / scale.z
    result[8] = matrix[10]! / scale.z
    return result
  }

  /**
   * 矩阵乘。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static multiply(left: Matrix4, right: Matrix4, result: Matrix4): Matrix4 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    const left0 = left[0]!
    const left1 = left[1]!
    const left2 = left[2]!
    const left3 = left[3]!
    const left4 = left[4]!
    const left5 = left[5]!
    const left6 = left[6]!
    const left7 = left[7]!
    const left8 = left[8]!
    const left9 = left[9]!
    const left10 = left[10]!
    const left11 = left[11]!
    const left12 = left[12]!
    const left13 = left[13]!
    const left14 = left[14]!
    const left15 = left[15]!
    const right0 = right[0]!
    const right1 = right[1]!
    const right2 = right[2]!
    const right3 = right[3]!
    const right4 = right[4]!
    const right5 = right[5]!
    const right6 = right[6]!
    const right7 = right[7]!
    const right8 = right[8]!
    const right9 = right[9]!
    const right10 = right[10]!
    const right11 = right[11]!
    const right12 = right[12]!
    const right13 = right[13]!
    const right14 = right[14]!
    const right15 = right[15]!
    result[0] = left0 * right0 + left4 * right1 + left8 * right2 + left12 * right3
    result[1] = left1 * right0 + left5 * right1 + left9 * right2 + left13 * right3
    result[2] = left2 * right0 + left6 * right1 + left10 * right2 + left14 * right3
    result[3] = left3 * right0 + left7 * right1 + left11 * right2 + left15 * right3
    result[4] = left0 * right4 + left4 * right5 + left8 * right6 + left12 * right7
    result[5] = left1 * right4 + left5 * right5 + left9 * right6 + left13 * right7
    result[6] = left2 * right4 + left6 * right5 + left10 * right6 + left14 * right7
    result[7] = left3 * right4 + left7 * right5 + left11 * right6 + left15 * right7
    result[8] = left0 * right8 + left4 * right9 + left8 * right10 + left12 * right11
    result[9] = left1 * right8 + left5 * right9 + left9 * right10 + left13 * right11
    result[10] = left2 * right8 + left6 * right9 + left10 * right10 + left14 * right11
    result[11] = left3 * right8 + left7 * right9 + left11 * right10 + left15 * right11
    result[12] = left0 * right12 + left4 * right13 + left8 * right14 + left12 * right15
    result[13] = left1 * right12 + left5 * right13 + left9 * right14 + left13 * right15
    result[14] = left2 * right12 + left6 * right13 + left10 * right14 + left14 * right15
    result[15] = left3 * right12 + left7 * right13 + left11 * right14 + left15 * right15
    return result
  }

  /**
   * 矩阵加。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static add(left: Matrix4, right: Matrix4, result: Matrix4): Matrix4 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    for (let i = 0; i < 16; ++i) {
      result[i] = left[i]! + right[i]!
    }
    return result
  }

  /**
   * 矩阵减。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static subtract(left: Matrix4, right: Matrix4, result: Matrix4): Matrix4 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    for (let i = 0; i < 16; ++i) {
      result[i] = left[i]! - right[i]!
    }
    return result
  }

  /**
   * 仿射变换相乘（底行假定 [0,0,0,1]）。
   *
   * @param left 左
   * @param right 右
   * @param result 结果
   */
  static multiplyTransformation(left: Matrix4, right: Matrix4, result: Matrix4): Matrix4 {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    const left0 = left[0]!
    const left1 = left[1]!
    const left2 = left[2]!
    const left4 = left[4]!
    const left5 = left[5]!
    const left6 = left[6]!
    const left8 = left[8]!
    const left9 = left[9]!
    const left10 = left[10]!
    const left12 = left[12]!
    const left13 = left[13]!
    const left14 = left[14]!
    const right0 = right[0]!
    const right1 = right[1]!
    const right2 = right[2]!
    const right4 = right[4]!
    const right5 = right[5]!
    const right6 = right[6]!
    const right8 = right[8]!
    const right9 = right[9]!
    const right10 = right[10]!
    const right12 = right[12]!
    const right13 = right[13]!
    const right14 = right[14]!
    result[0] = left0 * right0 + left4 * right1 + left8 * right2
    result[1] = left1 * right0 + left5 * right1 + left9 * right2
    result[2] = left2 * right0 + left6 * right1 + left10 * right2
    result[3] = 0.0
    result[4] = left0 * right4 + left4 * right5 + left8 * right6
    result[5] = left1 * right4 + left5 * right5 + left9 * right6
    result[6] = left2 * right4 + left6 * right5 + left10 * right6
    result[7] = 0.0
    result[8] = left0 * right8 + left4 * right9 + left8 * right10
    result[9] = left1 * right8 + left5 * right9 + left9 * right10
    result[10] = left2 * right8 + left6 * right9 + left10 * right10
    result[11] = 0.0
    result[12] = left0 * right12 + left4 * right13 + left8 * right14 + left12
    result[13] = left1 * right12 + left5 * right13 + left9 * right14 + left13
    result[14] = left2 * right12 + left6 * right13 + left10 * right14 + left14
    result[15] = 1.0
    return result
  }

  /**
   * 仿射矩阵右乘 3×3 旋转。
   *
   * @param matrix 左
   * @param rotation 旋转
   * @param result 结果
   */
  static multiplyByMatrix3(matrix: Matrix4, rotation: Matrix3, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("rotation", rotation)
    Check.typeOf.object("result", result)
    const left0 = matrix[0]!
    const left1 = matrix[1]!
    const left2 = matrix[2]!
    const left4 = matrix[4]!
    const left5 = matrix[5]!
    const left6 = matrix[6]!
    const left8 = matrix[8]!
    const left9 = matrix[9]!
    const left10 = matrix[10]!
    const right0 = rotation[0]!
    const right1 = rotation[1]!
    const right2 = rotation[2]!
    const right4 = rotation[3]!
    const right5 = rotation[4]!
    const right6 = rotation[5]!
    const right8 = rotation[6]!
    const right9 = rotation[7]!
    const right10 = rotation[8]!
    result[0] = left0 * right0 + left4 * right1 + left8 * right2
    result[1] = left1 * right0 + left5 * right1 + left9 * right2
    result[2] = left2 * right0 + left6 * right1 + left10 * right2
    result[3] = 0.0
    result[4] = left0 * right4 + left4 * right5 + left8 * right6
    result[5] = left1 * right4 + left5 * right5 + left9 * right6
    result[6] = left2 * right4 + left6 * right5 + left10 * right6
    result[7] = 0.0
    result[8] = left0 * right8 + left4 * right9 + left8 * right10
    result[9] = left1 * right8 + left5 * right9 + left9 * right10
    result[10] = left2 * right8 + left6 * right9 + left10 * right10
    result[11] = 0.0
    result[12] = matrix[12]!
    result[13] = matrix[13]!
    result[14] = matrix[14]!
    result[15] = matrix[15]!
    return result
  }

  /**
   * 仿射矩阵右乘平移。
   *
   * @param matrix 左
   * @param translation 平移
   * @param result 结果
   */
  static multiplyByTranslation(matrix: Matrix4, translation: Cartesian3, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("translation", translation)
    Check.typeOf.object("result", result)
    const x = translation.x
    const y = translation.y
    const z = translation.z
    result[0] = matrix[0]!
    result[1] = matrix[1]!
    result[2] = matrix[2]!
    result[3] = matrix[3]!
    result[4] = matrix[4]!
    result[5] = matrix[5]!
    result[6] = matrix[6]!
    result[7] = matrix[7]!
    result[8] = matrix[8]!
    result[9] = matrix[9]!
    result[10] = matrix[10]!
    result[11] = matrix[11]!
    result[12] = x * matrix[0]! + y * matrix[4]! + z * matrix[8]! + matrix[12]!
    result[13] = x * matrix[1]! + y * matrix[5]! + z * matrix[9]! + matrix[13]!
    result[14] = x * matrix[2]! + y * matrix[6]! + z * matrix[10]! + matrix[14]!
    result[15] = matrix[15]!
    return result
  }

  /**
   * 仿射矩阵右乘非均匀缩放。
   *
   * @param matrix 左
   * @param scale 缩放
   * @param result 结果
   */
  static multiplyByScale(matrix: Matrix4, scale: Cartesian3, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("scale", scale)
    Check.typeOf.object("result", result)
    const scaleX = scale.x
    const scaleY = scale.y
    const scaleZ = scale.z
    if (scaleX === 1.0 && scaleY === 1.0 && scaleZ === 1.0) {
      return Matrix4.clone(matrix, result)
    }
    result[0] = scaleX * matrix[0]!
    result[1] = scaleX * matrix[1]!
    result[2] = scaleX * matrix[2]!
    result[3] = matrix[3]!
    result[4] = scaleY * matrix[4]!
    result[5] = scaleY * matrix[5]!
    result[6] = scaleY * matrix[6]!
    result[7] = matrix[7]!
    result[8] = scaleZ * matrix[8]!
    result[9] = scaleZ * matrix[9]!
    result[10] = scaleZ * matrix[10]!
    result[11] = matrix[11]!
    result[12] = matrix[12]!
    result[13] = matrix[13]!
    result[14] = matrix[14]!
    result[15] = matrix[15]!
    return result
  }

  /**
   * 右乘均匀缩放。
   *
   * @param matrix 左
   * @param scale 缩放
   * @param result 结果
   */
  static multiplyByUniformScale(matrix: Matrix4, scale: number, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number("scale", scale)
    Check.typeOf.object("result", result)
    result[0] = matrix[0]! * scale
    result[1] = matrix[1]! * scale
    result[2] = matrix[2]! * scale
    result[3] = matrix[3]!
    result[4] = matrix[4]! * scale
    result[5] = matrix[5]! * scale
    result[6] = matrix[6]! * scale
    result[7] = matrix[7]!
    result[8] = matrix[8]! * scale
    result[9] = matrix[9]! * scale
    result[10] = matrix[10]! * scale
    result[11] = matrix[11]!
    result[12] = matrix[12]!
    result[13] = matrix[13]!
    result[14] = matrix[14]!
    result[15] = matrix[15]!
    return result
  }

  /**
   * 乘 Cartesian4。
   *
   * @param matrix 矩阵
   * @param cartesian 向量
   * @param result 结果
   */
  static multiplyByVector(matrix: Matrix4, cartesian: Cartesian4, result: Cartesian4): Cartesian4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    const vX = cartesian.x
    const vY = cartesian.y
    const vZ = cartesian.z
    const vW = cartesian.w
    result.x = matrix[0]! * vX + matrix[4]! * vY + matrix[8]! * vZ + matrix[12]! * vW
    result.y = matrix[1]! * vX + matrix[5]! * vY + matrix[9]! * vZ + matrix[13]! * vW
    result.z = matrix[2]! * vX + matrix[6]! * vY + matrix[10]! * vZ + matrix[14]! * vW
    result.w = matrix[3]! * vX + matrix[7]! * vY + matrix[11]! * vZ + matrix[15]! * vW
    return result
  }

  /**
   * 乘方向（w=0）。
   *
   * @param matrix 矩阵
   * @param cartesian 方向
   * @param result 结果
   */
  static multiplyByPointAsVector(
    matrix: Matrix4,
    cartesian: Cartesian3,
    result: Cartesian3,
  ): Cartesian3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    const vX = cartesian.x
    const vY = cartesian.y
    const vZ = cartesian.z
    result.x = matrix[0]! * vX + matrix[4]! * vY + matrix[8]! * vZ
    result.y = matrix[1]! * vX + matrix[5]! * vY + matrix[9]! * vZ
    result.z = matrix[2]! * vX + matrix[6]! * vY + matrix[10]! * vZ
    return result
  }

  /**
   * 乘点（w=1）。
   *
   * @param matrix 矩阵
   * @param cartesian 点
   * @param result 结果
   */
  static multiplyByPoint(matrix: Matrix4, cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("cartesian", cartesian)
    Check.typeOf.object("result", result)
    const vX = cartesian.x
    const vY = cartesian.y
    const vZ = cartesian.z
    result.x = matrix[0]! * vX + matrix[4]! * vY + matrix[8]! * vZ + matrix[12]!
    result.y = matrix[1]! * vX + matrix[5]! * vY + matrix[9]! * vZ + matrix[13]!
    result.z = matrix[2]! * vX + matrix[6]! * vY + matrix[10]! * vZ + matrix[14]!
    return result
  }

  /**
   * 数乘。
   *
   * @param matrix 矩阵
   * @param scalar 标量
   * @param result 结果
   */
  static multiplyByScalar(matrix: Matrix4, scalar: number, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.number("scalar", scalar)
    Check.typeOf.object("result", result)
    for (let i = 0; i < 16; ++i) {
      result[i] = matrix[i]! * scalar
    }
    return result
  }

  /**
   * 取负。
   *
   * @param matrix 源
   * @param result 结果
   */
  static negate(matrix: Matrix4, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    for (let i = 0; i < 16; ++i) {
      result[i] = -matrix[i]!
    }
    return result
  }

  /**
   * 转置。
   *
   * @param matrix 源
   * @param result 结果
   */
  static transpose(matrix: Matrix4, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const matrix1 = matrix[1]!
    const matrix2 = matrix[2]!
    const matrix3 = matrix[3]!
    const matrix6 = matrix[6]!
    const matrix7 = matrix[7]!
    const matrix11 = matrix[11]!
    result[0] = matrix[0]!
    result[1] = matrix[4]!
    result[2] = matrix[8]!
    result[3] = matrix[12]!
    result[4] = matrix1
    result[5] = matrix[5]!
    result[6] = matrix[9]!
    result[7] = matrix[13]!
    result[8] = matrix2
    result[9] = matrix6
    result[10] = matrix[10]!
    result[11] = matrix[14]!
    result[12] = matrix3
    result[13] = matrix7
    result[14] = matrix11
    result[15] = matrix[15]!
    return result
  }

  /**
   * 分量绝对值。
   *
   * @param matrix 源
   * @param result 结果
   */
  static abs(matrix: Matrix4, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    for (let i = 0; i < 16; ++i) {
      result[i] = Math.abs(matrix[i]!)
    }
    return result
  }

  /**
   * 分量严格相等（先比平移）。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left?: Matrix4, right?: Matrix4): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left[12] === right[12] &&
        left[13] === right[13] &&
        left[14] === right[14] &&
        left[0] === right[0] &&
        left[1] === right[1] &&
        left[2] === right[2] &&
        left[4] === right[4] &&
        left[5] === right[5] &&
        left[6] === right[6] &&
        left[8] === right[8] &&
        left[9] === right[9] &&
        left[10] === right[10] &&
        left[3] === right[3] &&
        left[7] === right[7] &&
        left[11] === right[11] &&
        left[15] === right[15])
    )
  }

  /**
   * 绝对容差比较。
   *
   * @param left 左
   * @param right 右
   * @param epsilon 容差
   */
  static equalsEpsilon(left?: Matrix4, right?: Matrix4, epsilon?: number): boolean {
    const e = epsilon ?? 0
    if (left === right) {
      return true
    }
    if (!defined(left) || !defined(right)) {
      return false
    }
    for (let i = 0; i < 16; ++i) {
      if (Math.abs(left[i]! - right[i]!) > e) {
        return false
      }
    }
    return true
  }

  /**
   * 提取平移。
   *
   * @param matrix 源
   * @param result 结果
   */
  static getTranslation(matrix: Matrix4, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    result.x = matrix[12]!
    result.y = matrix[13]!
    result.z = matrix[14]!
    return result
  }

  /**
   * 提取左上 3×3。
   *
   * @param matrix 源
   * @param result 结果
   */
  static getMatrix3(matrix: Matrix4, result: Matrix3): Matrix3 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    result[0] = matrix[0]!
    result[1] = matrix[1]!
    result[2] = matrix[2]!
    result[3] = matrix[4]!
    result[4] = matrix[5]!
    result[5] = matrix[6]!
    result[6] = matrix[8]!
    result[7] = matrix[9]!
    result[8] = matrix[10]!
    return result
  }

  /**
   * Cramer 求逆；零行列式且为零缩放仿射时走特殊分支。
   *
   * @param matrix 源
   * @param result 结果
   */
  static inverse(matrix: Matrix4, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const src0 = matrix[0]!
    const src1 = matrix[4]!
    const src2 = matrix[8]!
    const src3 = matrix[12]!
    const src4 = matrix[1]!
    const src5 = matrix[5]!
    const src6 = matrix[9]!
    const src7 = matrix[13]!
    const src8 = matrix[2]!
    const src9 = matrix[6]!
    const src10 = matrix[10]!
    const src11 = matrix[14]!
    const src12 = matrix[3]!
    const src13 = matrix[7]!
    const src14 = matrix[11]!
    const src15 = matrix[15]!
    let tmp0 = src10 * src15
    let tmp1 = src11 * src14
    let tmp2 = src9 * src15
    let tmp3 = src11 * src13
    let tmp4 = src9 * src14
    let tmp5 = src10 * src13
    let tmp6 = src8 * src15
    let tmp7 = src11 * src12
    let tmp8 = src8 * src14
    let tmp9 = src10 * src12
    let tmp10 = src8 * src13
    let tmp11 = src9 * src12
    const dst0 = tmp0 * src5 + tmp3 * src6 + tmp4 * src7 - (tmp1 * src5 + tmp2 * src6 + tmp5 * src7)
    const dst1 = tmp1 * src4 + tmp6 * src6 + tmp9 * src7 - (tmp0 * src4 + tmp7 * src6 + tmp8 * src7)
    const dst2 =
      tmp2 * src4 + tmp7 * src5 + tmp10 * src7 - (tmp3 * src4 + tmp6 * src5 + tmp11 * src7)
    const dst3 =
      tmp5 * src4 + tmp8 * src5 + tmp11 * src6 - (tmp4 * src4 + tmp9 * src5 + tmp10 * src6)
    const dst4 = tmp1 * src1 + tmp2 * src2 + tmp5 * src3 - (tmp0 * src1 + tmp3 * src2 + tmp4 * src3)
    const dst5 = tmp0 * src0 + tmp7 * src2 + tmp8 * src3 - (tmp1 * src0 + tmp6 * src2 + tmp9 * src3)
    const dst6 =
      tmp3 * src0 + tmp6 * src1 + tmp11 * src3 - (tmp2 * src0 + tmp7 * src1 + tmp10 * src3)
    const dst7 =
      tmp4 * src0 + tmp9 * src1 + tmp10 * src2 - (tmp5 * src0 + tmp8 * src1 + tmp11 * src2)
    tmp0 = src2 * src7
    tmp1 = src3 * src6
    tmp2 = src1 * src7
    tmp3 = src3 * src5
    tmp4 = src1 * src6
    tmp5 = src2 * src5
    tmp6 = src0 * src7
    tmp7 = src3 * src4
    tmp8 = src0 * src6
    tmp9 = src2 * src4
    tmp10 = src0 * src5
    tmp11 = src1 * src4
    const dst8 =
      tmp0 * src13 + tmp3 * src14 + tmp4 * src15 - (tmp1 * src13 + tmp2 * src14 + tmp5 * src15)
    const dst9 =
      tmp1 * src12 + tmp6 * src14 + tmp9 * src15 - (tmp0 * src12 + tmp7 * src14 + tmp8 * src15)
    const dst10 =
      tmp2 * src12 + tmp7 * src13 + tmp10 * src15 - (tmp3 * src12 + tmp6 * src13 + tmp11 * src15)
    const dst11 =
      tmp5 * src12 + tmp8 * src13 + tmp11 * src14 - (tmp4 * src12 + tmp9 * src13 + tmp10 * src14)
    const dst12 =
      tmp2 * src10 + tmp5 * src11 + tmp1 * src9 - (tmp4 * src11 + tmp0 * src9 + tmp3 * src10)
    const dst13 =
      tmp8 * src11 + tmp0 * src8 + tmp7 * src10 - (tmp6 * src10 + tmp9 * src11 + tmp1 * src8)
    const dst14 =
      tmp6 * src9 + tmp11 * src11 + tmp3 * src8 - (tmp10 * src11 + tmp2 * src8 + tmp7 * src9)
    const dst15 =
      tmp10 * src10 + tmp4 * src8 + tmp9 * src9 - (tmp8 * src9 + tmp11 * src10 + tmp5 * src8)
    let det = src0 * dst0 + src1 * dst1 + src2 * dst2 + src3 * dst3
    if (Math.abs(det) < CesiumMath.EPSILON21) {
      if (
        Matrix3.equalsEpsilon(
          Matrix4.getMatrix3(matrix, scratchInverseRotation),
          scratchMatrix3Zero,
          CesiumMath.EPSILON7,
        ) &&
        Cartesian4.equals(Matrix4.getRow(matrix, 3, scratchBottomRow), scratchExpectedBottomRow)
      ) {
        result[0] = 0.0
        result[1] = 0.0
        result[2] = 0.0
        result[3] = 0.0
        result[4] = 0.0
        result[5] = 0.0
        result[6] = 0.0
        result[7] = 0.0
        result[8] = 0.0
        result[9] = 0.0
        result[10] = 0.0
        result[11] = 0.0
        result[12] = -matrix[12]!
        result[13] = -matrix[13]!
        result[14] = -matrix[14]!
        result[15] = 1.0
        return result
      }
      throw new RuntimeError("matrix is not invertible because its determinate is zero.")
    }
    det = 1.0 / det
    result[0] = dst0 * det
    result[1] = dst1 * det
    result[2] = dst2 * det
    result[3] = dst3 * det
    result[4] = dst4 * det
    result[5] = dst5 * det
    result[6] = dst6 * det
    result[7] = dst7 * det
    result[8] = dst8 * det
    result[9] = dst9 * det
    result[10] = dst10 * det
    result[11] = dst11 * det
    result[12] = dst12 * det
    result[13] = dst13 * det
    result[14] = dst14 * det
    result[15] = dst15 * det
    return result
  }

  /**
   * 刚体变换求逆。
   *
   * @param matrix 源
   * @param result 结果
   */
  static inverseTransformation(matrix: Matrix4, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    const matrix0 = matrix[0]!
    const matrix1 = matrix[1]!
    const matrix2 = matrix[2]!
    const matrix4 = matrix[4]!
    const matrix5 = matrix[5]!
    const matrix6 = matrix[6]!
    const matrix8 = matrix[8]!
    const matrix9 = matrix[9]!
    const matrix10 = matrix[10]!
    const vX = matrix[12]!
    const vY = matrix[13]!
    const vZ = matrix[14]!
    result[0] = matrix0
    result[1] = matrix4
    result[2] = matrix8
    result[3] = 0.0
    result[4] = matrix1
    result[5] = matrix5
    result[6] = matrix9
    result[7] = 0.0
    result[8] = matrix2
    result[9] = matrix6
    result[10] = matrix10
    result[11] = 0.0
    result[12] = -matrix0 * vX - matrix1 * vY - matrix2 * vZ
    result[13] = -matrix4 * vX - matrix5 * vY - matrix6 * vZ
    result[14] = -matrix8 * vX - matrix9 * vY - matrix10 * vZ
    result[15] = 1.0
    return result
  }

  /**
   * 逆转置。
   *
   * @param matrix 源
   * @param result 结果
   */
  static inverseTranspose(matrix: Matrix4, result: Matrix4): Matrix4 {
    Check.typeOf.object("matrix", matrix)
    Check.typeOf.object("result", result)
    return Matrix4.inverse(Matrix4.transpose(matrix, scratchTransposeMatrix), result)
  }

  /**
   * 与数组片段比较。
   *
   * @param matrix 矩阵
   * @param array 数组
   * @param offset 偏移
   */
  static equalsArray(matrix: Matrix4, array: NumberArray, offset: number): boolean {
    for (let i = 0; i < 16; ++i) {
      if (matrix[i] !== array[offset + i]) {
        return false
      }
    }
    return true
  }

  /**
   * 复制本实例。
   *
   * @param result 可选结果对象
   */
  clone(result?: Matrix4): Matrix4 | undefined {
    return Matrix4.clone(this, result)
  }

  /**
   * 与 `right` 相等。
   *
   * @param right 右侧
   */
  equals(right?: Matrix4): boolean {
    return Matrix4.equals(this, right)
  }

  /**
   * 与 `right` 在容差内相等。
   *
   * @param right 右侧
   * @param epsilon 容差
   */
  equalsEpsilon(right?: Matrix4, epsilon?: number): boolean {
    return Matrix4.equalsEpsilon(this, right, epsilon)
  }

  /** 按行打印 */
  toString(): string {
    return (
      `(${this[0]!}, ${this[4]!}, ${this[8]!}, ${this[12]!})\n` +
      `(${this[1]!}, ${this[5]!}, ${this[9]!}, ${this[13]!})\n` +
      `(${this[2]!}, ${this[6]!}, ${this[10]!}, ${this[14]!})\n` +
      `(${this[3]!}, ${this[7]!}, ${this[11]!}, ${this[15]!})`
    )
  }
}

const fromCameraF = new Cartesian3()
const fromCameraR = new Cartesian3()
const fromCameraU = new Cartesian3()
const scaleScratch1 = new Cartesian3()
const scaleScratch2 = new Cartesian3()
const scratchColumn = new Cartesian3()
const scaleScratch3 = new Cartesian3()
const scaleScratch4 = new Cartesian3()
const scaleScratch5 = new Cartesian3()
const scratchInverseRotation = new Matrix3()
const scratchMatrix3Zero = new Matrix3()
const scratchBottomRow = new Cartesian4()
const scratchExpectedBottomRow = new Cartesian4(0.0, 0.0, 0.0, 1.0)
const scratchTransposeMatrix = new Matrix4()
