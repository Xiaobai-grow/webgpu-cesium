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

/** 标量高低位拆分结果 */
export interface EncodedScalar {
  high: number
  low: number
}

/**
 * 64 位 Cartesian3 拆成两个 32 位可加还原的分量（RTE）。
 * 对标 Cesium `Core/EncodedCartesian3.js`。
 */
export class EncodedCartesian3 {
  high: Cartesian3
  low: Cartesian3

  constructor() {
    this.high = Cartesian3.clone(Cartesian3.ZERO)
    this.low = Cartesian3.clone(Cartesian3.ZERO)
  }

  /**
   * 把一个 64 位浮点拆成 high/low。
   *
   * @param value 输入
   * @param result 可选结果
   */
  static encode(value: number, result?: EncodedScalar): EncodedScalar {
    Check.typeOf.number("value", value)
    const dest = result ?? { high: 0.0, low: 0.0 }
    if (value >= 0.0) {
      const doubleHigh = Math.floor(value / 65536.0) * 65536.0
      dest.high = doubleHigh
      dest.low = value - doubleHigh
    } else {
      const doubleHigh = Math.floor(-value / 65536.0) * 65536.0
      dest.high = -doubleHigh
      dest.low = value + doubleHigh
    }
    return dest
  }

  /**
   * high + low 还原标量（与 encode 往返）。
   *
   * @param encoded 拆分结果
   */
  static decode(encoded: EncodedScalar): number {
    return encoded.high + encoded.low
  }

  static fromCartesian(cartesian: Cartesian3, result?: EncodedCartesian3): EncodedCartesian3 {
    Check.typeOf.object("cartesian", cartesian)
    const dest = result ?? new EncodedCartesian3()
    const high = dest.high
    const low = dest.low
    EncodedCartesian3.encode(cartesian.x, scratchEncode)
    high.x = scratchEncode.high
    low.x = scratchEncode.low
    EncodedCartesian3.encode(cartesian.y, scratchEncode)
    high.y = scratchEncode.high
    low.y = scratchEncode.low
    EncodedCartesian3.encode(cartesian.z, scratchEncode)
    high.z = scratchEncode.high
    low.z = scratchEncode.low
    return dest
  }

  /**
   * 还原 Cartesian3（high + low）。
   *
   * @param encoded 拆分结果
   * @param result 可选结果
   */
  static toCartesian(encoded: EncodedCartesian3, result?: Cartesian3): Cartesian3 {
    const dest = result ?? new Cartesian3()
    dest.x = encoded.high.x + encoded.low.x
    dest.y = encoded.high.y + encoded.low.y
    dest.z = encoded.high.z + encoded.low.z
    return dest
  }

  static writeElements(
    cartesian: Cartesian3,
    cartesianArray: number[] | Float32Array,
    index: number,
  ): void {
    Check.defined("cartesianArray", cartesianArray)
    Check.typeOf.number("index", index)
    Check.typeOf.number.greaterThanOrEquals("index", index, 0)
    EncodedCartesian3.fromCartesian(cartesian, encodedP)
    const high = encodedP.high
    const low = encodedP.low
    cartesianArray[index] = high.x
    cartesianArray[index + 1] = high.y
    cartesianArray[index + 2] = high.z
    cartesianArray[index + 3] = low.x
    cartesianArray[index + 4] = low.y
    cartesianArray[index + 5] = low.z
  }
}

const scratchEncode: EncodedScalar = { high: 0.0, low: 0.0 }
const encodedP = new EncodedCartesian3()
