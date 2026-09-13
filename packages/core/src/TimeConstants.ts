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
 * 时间换算常量。对标 Cesium `Core/TimeConstants.js`。
 */
export const TimeConstants = Object.freeze({
  SECONDS_PER_MILLISECOND: 0.001,
  SECONDS_PER_MINUTE: 60.0,
  MINUTES_PER_HOUR: 60.0,
  HOURS_PER_DAY: 24.0,
  SECONDS_PER_HOUR: 3600.0,
  MINUTES_PER_DAY: 1440.0,
  SECONDS_PER_DAY: 86400.0,
  DAYS_PER_JULIAN_CENTURY: 36525.0,
  PICOSECOND: 0.000000001,
  MODIFIED_JULIAN_DATE_DIFFERENCE: 2400000.5,
})
