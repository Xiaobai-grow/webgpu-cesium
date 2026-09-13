/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/scene
 */

/** 相机输入类型。对标 Cesium `Scene/CameraEventType.js`。 */
export const CameraEventType = Object.freeze({
  LEFT_DRAG: 0,
  RIGHT_DRAG: 1,
  MIDDLE_DRAG: 2,
  WHEEL: 3,
  PINCH: 4,
})

export type CameraEventTypeValue = (typeof CameraEventType)[keyof typeof CameraEventType]
