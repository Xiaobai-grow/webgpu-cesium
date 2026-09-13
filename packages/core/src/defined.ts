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
 * 判断值既不是 `undefined` 也不是 `null`，并收窄类型。
 * 与 Cesium `Core/defined.js` 语义一致。
 *
 * @param value 待检测值
 */
export function defined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}
