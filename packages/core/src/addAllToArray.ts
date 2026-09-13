/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { defined } from "./defined"

/**
 * 把 source 全部追加到 target。对标 Cesium `Core/addAllToArray.js`。
 *
 * @param target 目标数组
 * @param source 源数组
 */
export function addAllToArray<T>(target: T[], source?: T[]): void {
  if (!defined(source)) {
    return
  }
  const sourceLength = source.length
  if (sourceLength === 0) {
    return
  }
  const targetLength = target.length
  target.length += sourceLength
  for (let i = 0; i < sourceLength; i++) {
    target[targetLength + i] = source[i] as T
  }
}
