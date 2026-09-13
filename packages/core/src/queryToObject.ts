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
 * 把 query string 解析成对象（重复键变成数组）。
 * 对标 Cesium `Core/queryToObject.js`。
 *
 * @param queryString 不含前导 `?` 亦可
 */
export function queryToObject(queryString: string): Record<string, string | string[]> {
  if (!defined(queryString)) {
    throw new DeveloperError("queryString is required.")
  }
  const result: Record<string, string | string[]> = {}
  const trimmed = queryString.startsWith("?") ? queryString.slice(1) : queryString
  if (trimmed.length === 0) {
    return result
  }
  for (const part of trimmed.split("&")) {
    if (part.length === 0) {
      continue
    }
    const eq = part.indexOf("=")
    const key = decodeURIComponent(eq >= 0 ? part.slice(0, eq) : part)
    const value = decodeURIComponent(eq >= 0 ? part.slice(eq + 1) : "")
    const existing = result[key]
    if (!defined(existing)) {
      result[key] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      result[key] = [existing, value]
    }
  }
  return result
}
