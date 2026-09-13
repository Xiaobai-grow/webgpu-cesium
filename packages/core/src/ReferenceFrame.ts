/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 常用参考系。对标 Cesium `Core/ReferenceFrame.js`。 */
export const ReferenceFrame = Object.freeze({
  FIXED: 0,
  INERTIAL: 1,
})

export type ReferenceFrameValue = (typeof ReferenceFrame)[keyof typeof ReferenceFrame]
