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
 * 是否 blob: URI。对标 Cesium `Core/isBlobUri.js`。
 *
 * @param uri 输入
 */
export function isBlobUri(uri: string): boolean {
  if (!defined(uri)) {
    throw new DeveloperError("uri is required.")
  }
  return /^blob:/i.test(uri)
}
