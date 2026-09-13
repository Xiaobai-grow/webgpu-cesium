/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 插值越界时的外推方式。对标 Cesium `Core/ExtrapolationType.js`。 */
export const ExtrapolationType = Object.freeze({
  NONE: 0,
  HOLD: 1,
  EXTRAPOLATE: 2,
})

export type ExtrapolationTypeValue = (typeof ExtrapolationType)[keyof typeof ExtrapolationType]
