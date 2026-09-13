/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 请求状态机。对标 Cesium `Core/RequestState.js`。 */
export const RequestState = Object.freeze({
  UNISSUED: 0,
  ISSUED: 1,
  ACTIVE: 2,
  RECEIVED: 3,
  CANCELLED: 4,
  FAILED: 5,
})

export type RequestStateValue = (typeof RequestState)[keyof typeof RequestState]
