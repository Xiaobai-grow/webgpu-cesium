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
 * 单调时间戳（毫秒）。优先 performance.now()。
 * 对标 Cesium `Core/getTimestamp.js`。
 */
export function getTimestamp(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance
  if (typeof perf?.now === "function") {
    const value = perf.now()
    if (Number.isFinite(value)) {
      return value
    }
  }
  return Date.now()
}
