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
 * 若 URL 不以 `/` 结尾则补上。对标 Cesium `Core/appendForwardSlash.js`。
 *
 * @param url 原始 URL
 */
export function appendForwardSlash(url: string): string {
  if (url.length === 0 || !url.endsWith("/")) {
    return `${url}/`
  }
  return url
}
