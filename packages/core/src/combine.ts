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
 * 合并两个对象到新对象；同名属性以第一个为准。
 * 对标 Cesium `Core/combine.js`。
 *
 * @param object1 左侧对象
 * @param object2 右侧对象
 * @param deep 是否递归合并 object 值，默认 false
 */
export function combine(
  object1?: object,
  object2?: object,
  deep?: boolean,
): Record<string, unknown> {
  const shouldDeep = deep ?? false
  const result: Record<string, unknown> = {}

  const object1Defined = defined(object1)
  const object2Defined = defined(object2)
  if (object1Defined) {
    const left = object1 as Record<string, unknown>
    const right = object2Defined ? (object2 as Record<string, unknown>) : undefined
    for (const property in left) {
      if (Object.prototype.hasOwnProperty.call(left, property)) {
        const object1Value = left[property]
        if (
          right &&
          shouldDeep &&
          typeof object1Value === "object" &&
          Object.prototype.hasOwnProperty.call(right, property)
        ) {
          const object2Value = right[property]
          if (typeof object2Value === "object") {
            result[property] = combine(object1Value!, object2Value!, shouldDeep)
          } else {
            result[property] = object1Value
          }
        } else {
          result[property] = object1Value
        }
      }
    }
  }
  if (object2Defined) {
    const right = object2 as Record<string, unknown>
    for (const property in right) {
      if (
        Object.prototype.hasOwnProperty.call(right, property) &&
        !Object.prototype.hasOwnProperty.call(result, property)
      ) {
        result[property] = right[property]
      }
    }
  }
  return result
}
