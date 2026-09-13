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
import { DeveloperError } from "./DeveloperError"
import { oneTimeWarning } from "./oneTimeWarning"

/**
 * 记录 API 弃用警告（内部走 oneTimeWarning）。
 * 对标 Cesium `Core/deprecationWarning.js`。
 *
 * @param identifier 去重键
 * @param message 警告文案
 */
export function deprecationWarning(identifier: string, message: string): void {
  if (!defined(identifier) || !defined(message)) {
    throw new DeveloperError("identifier and message are required.")
  }
  oneTimeWarning(identifier, message)
}
