/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/**
 * 冻结的空对象 / 空数组，用作 options 默认值。
 * 对标 Cesium `Core/Frozen.js`。
 */
export const Frozen = {
  EMPTY_OBJECT: Object.freeze({}) as Readonly<Record<string, never>>,
  EMPTY_ARRAY: Object.freeze([]) as readonly never[],
}
