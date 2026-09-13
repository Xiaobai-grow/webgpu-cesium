/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 遮挡可见性。对标 Cesium `Core/Visibility.js`。 */
export const Visibility = Object.freeze({
  NONE: -1,
  PARTIAL: 0,
  FULL: 1,
})

export type VisibilityValue = (typeof Visibility)[keyof typeof Visibility]
