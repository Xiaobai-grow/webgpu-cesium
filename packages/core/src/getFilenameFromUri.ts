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
 * 取 URI 最后一段文件名。对标 Cesium `Core/getFilenameFromUri.js`。
 *
 * @param uri 输入
 */
export function getFilenameFromUri(uri: string): string {
  if (!defined(uri)) {
    throw new DeveloperError("uri is required.")
  }
  const path = uri.split("?")[0]?.split("#")[0] ?? uri
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))
  return slash >= 0 ? path.slice(slash + 1) : path
}
