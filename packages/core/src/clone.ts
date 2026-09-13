/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/**
 * 浅克隆或深克隆对象；非 object 原样返回。
 * 对标 Cesium `Core/clone.js`。
 *
 * @param object 源对象
 * @param deep 是否递归克隆，默认 false
 */
export function clone<T>(object: T, deep?: boolean): T {
  if (object === null || typeof object !== "object") {
    return object
  }

  const shouldDeep = deep ?? false
  const ctor = (object as { constructor: new () => T }).constructor
  const result = new ctor()
  const record = object as Record<string, unknown>
  const dest = result as Record<string, unknown>
  for (const propertyName in object) {
    if (Object.prototype.hasOwnProperty.call(object, propertyName)) {
      let value = record[propertyName]
      if (shouldDeep) {
        value = clone(value, shouldDeep)
      }
      dest[propertyName] = value
    }
  }
  return result
}
