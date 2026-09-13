/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 物体相对视锥的位置。对标 Cesium `Core/Intersect.js`。 */
export const Intersect = Object.freeze({
  OUTSIDE: -1,
  INTERSECTING: 0,
  INSIDE: 1,
})

export type IntersectValue = (typeof Intersect)[keyof typeof Intersect]
