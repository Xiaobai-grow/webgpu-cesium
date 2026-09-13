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
 * 把错误对象格式化成 `name: message\\nstack`。
 * 对标 Cesium `Core/formatError.js`。
 *
 * @param object 任意抛出值
 */
export function formatError(object: unknown): string {
  if (typeof object === "object" && object !== null) {
    const record = object as {
      name?: unknown
      message?: unknown
      stack?: unknown
      toString?: () => string
    }
    const name = record.name
    const message = record.message
    let result: string
    if (defined(name) && defined(message)) {
      result = `${String(name)}: ${String(message)}`
    } else if (
      typeof record.toString === "function" &&
      record.toString !== Object.prototype.toString
    ) {
      result = record.toString()
    } else {
      result = defined(message) ? String(message) : "Error"
    }
    if (defined(record.stack)) {
      result += `\n${String(record.stack)}`
    }
    return result
  }
  return String(object)
}
