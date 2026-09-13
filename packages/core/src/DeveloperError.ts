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
 * 开发期错误：调用方违反了 API 契约（参数缺失、越界、状态不合法）。
 * 对标 Cesium `Core/DeveloperError.js`。
 */
export class DeveloperError extends Error {
  override readonly name: string = "DeveloperError"

  /**
   * @param message 错误说明；Cesium 允许省略
   */
  constructor(message?: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }

  override toString(): string {
    let str = `${this.name}: ${this.message}`
    if (defined(this.stack)) {
      str += `\n${this.stack}`
    }
    return str
  }

  /** 接口占位函数被直接调用时抛出 */
  static throwInstantiationError(): never {
    throw new DeveloperError(
      "This function defines an interface and should not be called directly.",
    )
  }
}
