/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 请求类别。对标 Cesium `Core/RequestType.js`。 */
export const RequestType = Object.freeze({
  TERRAIN: 0,
  IMAGERY: 1,
  TILES3D: 2,
  OTHER: 3,
})

export type RequestTypeValue = (typeof RequestType)[keyof typeof RequestType]
