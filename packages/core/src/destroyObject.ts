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

function returnTrue(): boolean {
  return true
}

/**
 * 销毁对象：把函数替换为抛错，`isDestroyed` 恒为 true。
 * 对标 Cesium `Core/destroyObject.js`。
 *
 * @param object 待销毁对象
 * @param message 调用已销毁方法时的报错
 */
export function destroyObject(object: object, message?: string): undefined {
  const resolved = message ?? "This object was destroyed, i.e., destroy() was called."

  function throwOnDestroyed(): never {
    throw new DeveloperError(resolved)
  }

  const record = object as Record<string, unknown>
  for (const key in record) {
    if (typeof record[key] === "function") {
      record[key] = throwOnDestroyed
    }
  }

  record.isDestroyed = returnTrue
  return undefined
}
