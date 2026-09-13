/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：原实现依赖 urijs；此处用 WHATWG URL（Node 22 / 浏览器均可用）。
 */

import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { getUrlConstructor } from "./whatwgUrl"

/**
 * 把 relative 解析为绝对 URI。
 * 对标 Cesium `Core/getAbsoluteUri.js`。
 *
 * @param relative 相对或绝对 URI
 * @param base 基 URI，默认 `globalThis.location.href`（若存在）
 */
export function getAbsoluteUri(relative: string, base?: string): string {
  if (!defined(relative)) {
    throw new DeveloperError("relative uri is required.")
  }
  if (/^data:/i.test(relative) || /^blob:/i.test(relative)) {
    return relative
  }
  const resolvedBase =
    base ?? (globalThis as { location?: { href?: string } }).location?.href ?? "http://localhost/"
  try {
    const Url = getUrlConstructor()
    if (!Url) {
      return relative
    }
    return new Url(relative, resolvedBase).href
  } catch {
    return relative
  }
}
