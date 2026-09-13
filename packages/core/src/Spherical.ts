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

/** fromCartesian3 所需的笛卡尔子集，避免与 Cartesian3 循环依赖 */
interface Cartesian3Like {
  x: number
  y: number
  z: number
}

/**
 * 球坐标。对标 Cesium `Core/Spherical.js`。
 */
export class Spherical {
  clock: number
  cone: number
  magnitude: number

  /**
   * @param clock 时钟角（xy 平面，自 +x 向 +y）
   * @param cone 锥角（自 +z 向 -z）
   * @param magnitude 半径，默认 1
   */
  constructor(clock?: number, cone?: number, magnitude?: number) {
    this.clock = clock ?? 0.0
    this.cone = cone ?? 0.0
    this.magnitude = magnitude ?? 1.0
  }

  /**
   * Cartesian3 → 球坐标。
   *
   * @param cartesian3 源
   * @param result 可选结果对象
   */
  static fromCartesian3(cartesian3: Cartesian3Like, result?: Spherical): Spherical {
    Check.typeOf.object("cartesian3", cartesian3)
    const x = cartesian3.x
    const y = cartesian3.y
    const z = cartesian3.z
    const radialSquared = x * x + y * y
    if (!defined(result)) {
      result = new Spherical()
    }
    result.clock = Math.atan2(y, x)
    result.cone = Math.atan2(Math.sqrt(radialSquared), z)
    result.magnitude = Math.sqrt(radialSquared + z * z)
    return result
  }

  /**
   * 复制；源未定义时返回 undefined。
   *
   * @param spherical 源
   * @param result 可选结果对象
   */
  static clone(spherical: Spherical, result?: Spherical): Spherical
  static clone(spherical?: Spherical, result?: Spherical): Spherical | undefined
  static clone(spherical?: Spherical, result?: Spherical): Spherical | undefined {
    if (!defined(spherical)) {
      return undefined
    }
    if (!defined(result)) {
      return new Spherical(spherical.clock, spherical.cone, spherical.magnitude)
    }
    result.clock = spherical.clock
    result.cone = spherical.cone
    result.magnitude = spherical.magnitude
    return result
  }

  /**
   * 单位化（magnitude = 1，角不变）。
   *
   * @param spherical 源
   * @param result 可选结果对象
   */
  static normalize(spherical: Spherical, result?: Spherical): Spherical {
    Check.typeOf.object("spherical", spherical)
    if (!defined(result)) {
      return new Spherical(spherical.clock, spherical.cone, 1.0)
    }
    result.clock = spherical.clock
    result.cone = spherical.cone
    result.magnitude = 1.0
    return result
  }

  /**
   * 分量严格相等。
   *
   * @param left 左值
   * @param right 右值
   */
  static equals(left?: Spherical, right?: Spherical): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left.clock === right.clock &&
        left.cone === right.cone &&
        left.magnitude === right.magnitude)
    )
  }

  /**
   * 绝对容差比较。
   *
   * @param left 左值
   * @param right 右值
   * @param epsilon 容差
   */
  static equalsEpsilon(left?: Spherical, right?: Spherical, epsilon?: number): boolean {
    const e = epsilon ?? 0.0
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Math.abs(left.clock - right.clock) <= e &&
        Math.abs(left.cone - right.cone) <= e &&
        Math.abs(left.magnitude - right.magnitude) <= e)
    )
  }

  /**
   * 复制本实例。
   *
   * @param result 可选结果对象
   */
  clone(result?: Spherical): Spherical {
    return Spherical.clone(this, result)
  }

  /**
   * 与 `other` 相等。
   *
   * @param other 右侧
   */
  equals(other?: Spherical): boolean {
    return Spherical.equals(this, other)
  }

  /**
   * 与 `other` 在容差内相等。
   *
   * @param other 右侧
   * @param epsilon 容差
   */
  equalsEpsilon(other?: Spherical, epsilon?: number): boolean {
    return Spherical.equalsEpsilon(this, other, epsilon)
  }

  /** `(clock, cone, magnitude)` */
  toString(): string {
    return `(${this.clock}, ${this.cone}, ${this.magnitude})`
  }
}
