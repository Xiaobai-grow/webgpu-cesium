/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import type { JulianDate } from "./JulianDate"

/**
 * 一次闰秒：TAI 领先 UTC 的累计秒数。
 * 对标 Cesium `Core/LeapSecond.js`。
 */
export class LeapSecond {
  julianDate: JulianDate
  offset: number

  /**
   * @param date 闰秒时刻（JulianDate）
   * @param offset TAI-UTC 秒
   */
  constructor(date?: JulianDate, offset?: number) {
    this.julianDate = date!
    this.offset = offset ?? 0
  }
}
