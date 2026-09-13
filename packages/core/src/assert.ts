/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { DeveloperError } from "./DeveloperError"

/**
 * 断言条件为真，失败则抛 DeveloperError，并收窄类型。
 * 对标 Cesium `Core/assert.js`。
 *
 * @param condition 条件
 * @param msg 失败文案
 */
export function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new DeveloperError(msg)
  }
}
