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

/**
 * 眼空间近/远距离上的标量区间。对标 Cesium `Core/NearFarScalar.js`。
 */
export class NearFarScalar {
  near: number
  nearValue: number
  far: number
  farValue: number

  static packedLength = 4

  /**
   * @param near 近距
   * @param nearValue 近距取值
   * @param far 远距
   * @param farValue 远距取值
   */
  constructor(near?: number, nearValue?: number, far?: number, farValue?: number) {
    this.near = near ?? 0.0
    this.nearValue = nearValue ?? 0.0
    this.far = far ?? 1.0
    this.farValue = farValue ?? 0.0
  }

  static clone(nearFarScalar?: NearFarScalar, result?: NearFarScalar): NearFarScalar | undefined {
    if (!defined(nearFarScalar)) {
      return undefined
    }
    if (!defined(result)) {
      return new NearFarScalar(
        nearFarScalar.near,
        nearFarScalar.nearValue,
        nearFarScalar.far,
        nearFarScalar.farValue,
      )
    }
    result.near = nearFarScalar.near
    result.nearValue = nearFarScalar.nearValue
    result.far = nearFarScalar.far
    result.farValue = nearFarScalar.farValue
    return result
  }

  static pack(value: NearFarScalar, array: number[], startingIndex?: number): number[] {
    if (!defined(value)) {
      throw new DeveloperError("value is required")
    }
    if (!defined(array)) {
      throw new DeveloperError("array is required")
    }
    let i = startingIndex ?? 0
    array[i++] = value.near
    array[i++] = value.nearValue
    array[i++] = value.far
    array[i] = value.farValue
    return array
  }

  static unpack(array: number[], startingIndex?: number, result?: NearFarScalar): NearFarScalar {
    if (!defined(array)) {
      throw new DeveloperError("array is required")
    }
    let i = startingIndex ?? 0
    const dest = result ?? new NearFarScalar()
    dest.near = array[i++] ?? 0
    dest.nearValue = array[i++] ?? 0
    dest.far = array[i++] ?? 0
    dest.farValue = array[i] ?? 0
    return dest
  }

  static equals(left?: NearFarScalar, right?: NearFarScalar): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left.near === right.near &&
        left.nearValue === right.nearValue &&
        left.far === right.far &&
        left.farValue === right.farValue)
    )
  }

  clone(result?: NearFarScalar): NearFarScalar | undefined {
    return NearFarScalar.clone(this, result)
  }

  equals(right?: NearFarScalar): boolean {
    return NearFarScalar.equals(this, right)
  }
}
