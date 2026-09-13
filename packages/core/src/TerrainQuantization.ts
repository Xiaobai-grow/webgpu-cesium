/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 地形顶点量化。对标 Cesium `Core/TerrainQuantization.js`。 */
export const TerrainQuantization = Object.freeze({
  NONE: 0,
  BITS12: 1,
})

export type TerrainQuantizationValue =
  (typeof TerrainQuantization)[keyof typeof TerrainQuantization]
