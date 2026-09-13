/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：原实现依赖 urijs；此处用 WHATWG URL。
 */

import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { getUrlConstructor } from "./whatwgUrl"

/**
 * 取 URI 的目录部分（去掉最后一段路径）。
 * 对标 Cesium `Core/getBaseUri.js`。
 *
 * @param uri 输入
 * @param includeQuery 是否保留 search+hash
 */
export function getBaseUri(uri: string, includeQuery?: boolean): string {
  if (!defined(uri)) {
    throw new DeveloperError("uri is required.")
  }
  try {
    const Url = getUrlConstructor()
    if (!Url) {
      const slash = uri.lastIndexOf("/")
      return slash >= 0 ? uri.slice(0, slash + 1) : ""
    }
    const url = new Url(uri, "http://localhost/")
    const path = url.pathname
    const slash = path.lastIndexOf("/")
    url.pathname = slash >= 0 ? path.slice(0, slash + 1) : "/"
    if (!includeQuery) {
      url.search = ""
      url.hash = ""
    }
    const href = url.href
    if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file:")) {
      return href
    }
    return href.replace(/^https?:\/\/localhost\//, uri.startsWith("/") ? "/" : "")
  } catch {
    const slash = uri.lastIndexOf("/")
    return slash >= 0 ? uri.slice(0, slash + 1) : ""
  }
}
