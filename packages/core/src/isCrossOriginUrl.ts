/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：去掉对 DOM `document.createElement("a")` 的依赖，改用 URL。
 */

import { getUrlConstructor } from "./whatwgUrl"

/**
 * 相对当前 location 是否跨源。Node 无 location 时返回 false。
 * 对标 Cesium `Core/isCrossOriginUrl.js`。
 *
 * @param url 待检测 URL
 */
export function isCrossOriginUrl(url: string): boolean {
  const location = (globalThis as { location?: { protocol?: string; host?: string } }).location
  if (!location?.protocol || !location.host) {
    return false
  }
  try {
    const Url = getUrlConstructor()
    if (!Url) {
      return false
    }
    const parsed = new Url(url, `${location.protocol}//${location.host}/`)
    return parsed.protocol !== location.protocol || parsed.host !== location.host
  } catch {
    return false
  }
}
