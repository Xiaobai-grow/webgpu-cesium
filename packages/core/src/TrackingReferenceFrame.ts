/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 跟踪参考系。对标 Cesium `Core/TrackingReferenceFrame.js`。 */
export const TrackingReferenceFrame = Object.freeze({
  AUTODETECT: 0,
  ENU: 1,
  INERTIAL: 2,
  VELOCITY: 3,
})

export type TrackingReferenceFrameValue =
  (typeof TrackingReferenceFrame)[keyof typeof TrackingReferenceFrame]
