/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { CesiumMath } from "./CesiumMath"
import type { Quaternion } from "./Quaternion"

/**
 * heading / pitch / roll（弧度）。
 * heading 绕 -z，pitch 绕 -y，roll 绕 +x。
 * 对标 Cesium `Core/HeadingPitchRoll.js`。
 */
export class HeadingPitchRoll {
  heading: number
  pitch: number
  roll: number

  /**
   * @param heading 航向，弧度
   * @param pitch 俯仰，弧度
   * @param roll 滚转，弧度
   */
  constructor(heading?: number, pitch?: number, roll?: number) {
    this.heading = heading ?? 0.0
    this.pitch = pitch ?? 0.0
    this.roll = roll ?? 0.0
  }

  /**
   * 由四元数求欧拉角（与 Wikipedia 四元数↔欧拉角转换一致）。
   *
   * @param quaternion 源四元数
   * @param result 可选结果对象
   */
  static fromQuaternion(quaternion: Quaternion, result?: HeadingPitchRoll): HeadingPitchRoll {
    if (!defined(quaternion)) {
      throw new DeveloperError("quaternion is required")
    }
    if (!defined(result)) {
      result = new HeadingPitchRoll()
    }
    const test = 2 * (quaternion.w * quaternion.y - quaternion.z * quaternion.x)
    const denominatorRoll = 1 - 2 * (quaternion.x * quaternion.x + quaternion.y * quaternion.y)
    const numeratorRoll = 2 * (quaternion.w * quaternion.x + quaternion.y * quaternion.z)
    const denominatorHeading = 1 - 2 * (quaternion.y * quaternion.y + quaternion.z * quaternion.z)
    const numeratorHeading = 2 * (quaternion.w * quaternion.z + quaternion.x * quaternion.y)
    result.heading = -Math.atan2(numeratorHeading, denominatorHeading)
    result.roll = Math.atan2(numeratorRoll, denominatorRoll)
    result.pitch = -CesiumMath.asinClamped(test)
    return result
  }

  /**
   * 由角度（度）构造。
   *
   * @param heading 航向，度
   * @param pitch 俯仰，度
   * @param roll 滚转，度
   * @param result 可选结果对象
   */
  static fromDegrees(
    heading: number,
    pitch: number,
    roll: number,
    result?: HeadingPitchRoll,
  ): HeadingPitchRoll {
    if (!defined(heading)) {
      throw new DeveloperError("heading is required")
    }
    if (!defined(pitch)) {
      throw new DeveloperError("pitch is required")
    }
    if (!defined(roll)) {
      throw new DeveloperError("roll is required")
    }
    if (!defined(result)) {
      result = new HeadingPitchRoll()
    }
    result.heading = heading * CesiumMath.RADIANS_PER_DEGREE
    result.pitch = pitch * CesiumMath.RADIANS_PER_DEGREE
    result.roll = roll * CesiumMath.RADIANS_PER_DEGREE
    return result
  }

  /**
   * 复制；源未定义时返回 undefined。
   *
   * @param headingPitchRoll 源
   * @param result 可选结果对象
   */
  static clone(headingPitchRoll: HeadingPitchRoll, result?: HeadingPitchRoll): HeadingPitchRoll
  static clone(
    headingPitchRoll?: HeadingPitchRoll,
    result?: HeadingPitchRoll,
  ): HeadingPitchRoll | undefined
  static clone(
    headingPitchRoll?: HeadingPitchRoll,
    result?: HeadingPitchRoll,
  ): HeadingPitchRoll | undefined {
    if (!defined(headingPitchRoll)) {
      return undefined
    }
    if (!defined(result)) {
      return new HeadingPitchRoll(
        headingPitchRoll.heading,
        headingPitchRoll.pitch,
        headingPitchRoll.roll,
      )
    }
    result.heading = headingPitchRoll.heading
    result.pitch = headingPitchRoll.pitch
    result.roll = headingPitchRoll.roll
    return result
  }

  /**
   * 分量严格相等。
   *
   * @param left 左值
   * @param right 右值
   */
  static equals(left?: HeadingPitchRoll, right?: HeadingPitchRoll): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left.heading === right.heading &&
        left.pitch === right.pitch &&
        left.roll === right.roll)
    )
  }

  /**
   * 相对 / 绝对容差比较。
   *
   * @param left 左值
   * @param right 右值
   * @param relativeEpsilon 相对容差
   * @param absoluteEpsilon 绝对容差
   */
  static equalsEpsilon(
    left?: HeadingPitchRoll,
    right?: HeadingPitchRoll,
    relativeEpsilon?: number,
    absoluteEpsilon?: number,
  ): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        CesiumMath.equalsEpsilon(left.heading, right.heading, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(left.pitch, right.pitch, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(left.roll, right.roll, relativeEpsilon, absoluteEpsilon))
    )
  }

  /**
   * 复制本实例。
   *
   * @param result 可选结果对象
   */
  clone(result?: HeadingPitchRoll): HeadingPitchRoll | undefined {
    return HeadingPitchRoll.clone(this, result)
  }

  /**
   * 与 `right` 分量相等。
   *
   * @param right 右侧
   */
  equals(right?: HeadingPitchRoll): boolean {
    return HeadingPitchRoll.equals(this, right)
  }

  /**
   * 与 `right` 在容差内相等。
   *
   * @param right 右侧
   * @param relativeEpsilon 相对容差
   * @param absoluteEpsilon 绝对容差
   */
  equalsEpsilon(
    right?: HeadingPitchRoll,
    relativeEpsilon?: number,
    absoluteEpsilon?: number,
  ): boolean {
    return HeadingPitchRoll.equalsEpsilon(this, right, relativeEpsilon, absoluteEpsilon)
  }

  /** `(heading, pitch, roll)`，弧度 */
  toString(): string {
    return `(${this.heading}, ${this.pitch}, ${this.roll})`
  }
}
