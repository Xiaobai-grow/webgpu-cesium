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

/**
 * 运行期错误：由环境或数据导致、调用方应准备捕获。
 * 对标 Cesium `Core/RuntimeError.js`。
 */
export class RuntimeError extends Error {
  override readonly name: string = "RuntimeError"

  /**
   * @param message 错误说明；Cesium 允许省略
   * @param options 标准 `ErrorOptions`（如 `cause`），供 rhi 等调用方使用
   */
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options)
    Object.setPrototypeOf(this, new.target.prototype)
  }

  override toString(): string {
    let str = `${this.name}: ${this.message}`
    if (defined(this.stack)) {
      str += `\n${this.stack}`
    }
    return str
  }
}
