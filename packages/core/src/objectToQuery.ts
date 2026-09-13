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
 * 把对象编成 query string（数组值重复键）。对标 Cesium `Core/objectToQuery.js`。
 *
 * @param obj 键值表
 */
export function objectToQuery(obj: Record<string, string | string[] | undefined>): string {
  if (!defined(obj)) {
    throw new DeveloperError("obj is required.")
  }
  const parts: string[] = []
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (!defined(value)) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }
  return parts.join("&")
}
