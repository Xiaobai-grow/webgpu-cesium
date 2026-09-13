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

/**
 * 是否 data: URI。对标 Cesium `Core/isDataUri.js`。
 *
 * @param uri 输入
 */
export function isDataUri(uri: string): boolean {
  if (!defined(uri)) {
    throw new DeveloperError("uri is required.")
  }
  return /^data:/i.test(uri)
}
