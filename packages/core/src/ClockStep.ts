/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** Clock#tick 的步进方式。对标 Cesium `Core/ClockStep.js`。 */
export const ClockStep = Object.freeze({
  TICK_DEPENDENT: 0,
  SYSTEM_CLOCK_MULTIPLIER: 1,
  SYSTEM_CLOCK: 2,
})

export type ClockStepValue = (typeof ClockStep)[keyof typeof ClockStep]
