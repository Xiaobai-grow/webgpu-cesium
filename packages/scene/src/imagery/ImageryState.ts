/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 */

/** 影像瓦片状态。 */
export const ImageryState = Object.freeze({
  UNLOADED: 0,
  TRANSITIONING: 1,
  RECEIVED: 2,
  TEXTURE_LOADED: 3,
  READY: 4,
  FAILED: 5,
  INVALID: 6,
  PLACEHOLDER: 7,
})

export type ImageryStateValue = (typeof ImageryState)[keyof typeof ImageryState]
