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
 * 解析 XHR `getAllResponseHeaders()` 风格的头字符串。
 * 对标 Cesium `Core/parseResponseHeaders.js`。
 *
 * @param headerString CRLF 分隔的 `Name: value`
 */
export function parseResponseHeaders(headerString?: string): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!headerString) {
    return headers
  }
  const headerPairs = headerString.split("\u000d\u000a")
  for (const headerPair of headerPairs) {
    const index = headerPair.indexOf("\u003a\u0020")
    if (index > 0) {
      headers[headerPair.substring(0, index)] = headerPair.substring(index + 2)
    }
  }
  return headers
}
