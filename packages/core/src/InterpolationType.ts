/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** glTF 动画插值类型。对标 Cesium `Core/InterpolationType.js`。 */
export const InterpolationType = Object.freeze({
  STEP: 0,
  LINEAR: 1,
  CUBICSPLINE: 2,
})

export type InterpolationTypeValue = (typeof InterpolationType)[keyof typeof InterpolationType]
