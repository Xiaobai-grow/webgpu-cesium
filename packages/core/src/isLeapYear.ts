/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { DeveloperError } from "./DeveloperError"

/**
 * 公历闰年判定。对标 Cesium `Core/isLeapYear.js`。
 *
 * @param year 年份
 */
export function isLeapYear(year: number): boolean {
  if (year === null || Number.isNaN(year)) {
    throw new DeveloperError("year is required and must be a number.")
  }
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}
