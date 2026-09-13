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
 * JulianDate 可用的时间标准。对标 Cesium `Core/TimeStandard.js`。
 */
export const TimeStandard = Object.freeze({
  UTC: 0,
  TAI: 1,
})

export type TimeStandardValue = (typeof TimeStandard)[keyof typeof TimeStandard]
