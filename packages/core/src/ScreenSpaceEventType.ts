/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 屏幕空间输入事件类型。对标 Cesium `Core/ScreenSpaceEventType.js`。 */
export const ScreenSpaceEventType = Object.freeze({
  LEFT_DOWN: 0,
  LEFT_UP: 1,
  LEFT_CLICK: 2,
  LEFT_DOUBLE_CLICK: 3,
  RIGHT_DOWN: 5,
  RIGHT_UP: 6,
  RIGHT_CLICK: 7,
  MIDDLE_DOWN: 10,
  MIDDLE_UP: 11,
  MIDDLE_CLICK: 12,
  MOUSE_MOVE: 15,
  WHEEL: 16,
  PINCH_START: 17,
  PINCH_END: 18,
  PINCH_MOVE: 19,
})

export type ScreenSpaceEventTypeValue =
  (typeof ScreenSpaceEventType)[keyof typeof ScreenSpaceEventType]
