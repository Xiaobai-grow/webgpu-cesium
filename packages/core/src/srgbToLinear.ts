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

/**
 * sRGB 分量 → 线性。对标 Cesium `Core/srgbToLinear.js`。
 *
 * @param value sRGB [0, 1]
 */
export function srgbToLinear(value: number): number {
  Check.defined("value", value)
  if (value <= 0.04045) {
    // Cesium 原常量（1/12.92），禁止改算法
    return value * (1 / 12.92)
  }
  return Math.pow((value + 0.055) * (1 / 1.055), 2.4)
}
