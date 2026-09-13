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
 * 把数组均分成若干子数组。对标 Cesium `Core/subdivideArray.js`。
 *
 * @param array 源数组
 * @param numberOfArrays 份数
 */
export function subdivideArray<T>(array: T[], numberOfArrays: number): T[][] {
  if (!defined(array)) {
    throw new DeveloperError("array is required.")
  }
  if (!defined(numberOfArrays) || numberOfArrays < 1) {
    throw new DeveloperError("numberOfArrays must be greater than 0.")
  }

  const result: T[][] = []
  const len = array.length
  let i = 0
  let remaining = numberOfArrays
  while (i < len) {
    const size = Math.ceil((len - i) / remaining--)
    result.push(array.slice(i, i + size))
    i += size
  }
  return result
}
