/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/**
 * 一次闰秒：TAI 领先 UTC 的累计秒数。
 * 对标 Cesium `Core/LeapSecond.js`。
 * `julianDate` 在 JulianDate 模块落地后收窄为该类（避免循环导入）。
 */
export class LeapSecond {
  julianDate: unknown
  offset: number | undefined

  /**
   * @param date 闰秒时刻（JulianDate）
   * @param offset TAI-UTC 秒
   */
  constructor(date?: unknown, offset?: number) {
    this.julianDate = date
    this.offset = offset
  }
}
