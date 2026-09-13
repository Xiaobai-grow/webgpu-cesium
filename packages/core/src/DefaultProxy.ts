/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Proxy } from "./Proxy"

/**
 * 把目标 URL 作为唯一 query 参数接到代理地址上。
 * 对标 Cesium `Core/DefaultProxy.js`。
 */
export class DefaultProxy extends Proxy {
  proxy: string

  /**
   * @param proxy 代理前缀
   */
  constructor(proxy: string) {
    super()
    this.proxy = proxy
  }

  override getURL(resource: string): string {
    const prefix = !this.proxy.includes("?") ? "?" : ""
    return this.proxy + prefix + encodeURIComponent(resource)
  }
}
