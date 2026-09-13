/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** Clock 到达起止时间时的行为。对标 Cesium `Core/ClockRange.js`。 */
export const ClockRange = Object.freeze({
  UNBOUNDED: 0,
  CLAMPED: 1,
  LOOP_STOP: 2,
})

export type ClockRangeValue = (typeof ClockRange)[keyof typeof ClockRange]
