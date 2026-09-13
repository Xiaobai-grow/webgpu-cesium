/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { DeveloperError } from "./DeveloperError"

/**
 * Resource 代理基类。对标 Cesium `Core/Proxy.js`。
 */
export abstract class Proxy {
  /**
   * 把资源 URL 转成经代理的 URL。
   *
   * @param resource 原始资源
   */
  abstract getURL(resource: string): string

  /** 禁止直接实例化基类 */
  protected constructor() {
    if (new.target === Proxy) {
      DeveloperError.throwInstantiationError()
    }
  }
}
