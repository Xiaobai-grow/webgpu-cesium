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
 * 用 newFunction 包装 oldFunction：先调新再调旧，this 为 obj。
 * 对标 Cesium `Core/wrapFunction.js`。
 *
 * @param obj 作为 this 的对象
 * @param oldFunction 原函数
 * @param newFunction 前置函数
 */
export function wrapFunction<T>(
  obj: T,
  oldFunction: (this: T, ...args: never[]) => unknown,
  newFunction: (this: T, ...args: never[]) => unknown,
): (this: T, ...args: never[]) => unknown {
  if (typeof oldFunction !== "function") {
    throw new DeveloperError("oldFunction is required to be a function.")
  }
  if (typeof newFunction !== "function") {
    throw new DeveloperError("oldFunction is required to be a function.")
  }
  return function wrapped(this: T, ...args: never[]): unknown {
    newFunction.apply(obj, args)
    return oldFunction.apply(obj, args)
  }
}
