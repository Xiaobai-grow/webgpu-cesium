/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Check } from "./Check"
import { CesiumMath } from "./CesiumMath"
import { defined } from "./defined"

const removeDuplicatesEpsilon = CesiumMath.EPSILON10

/** 带 epsilon 的相等比较 */
export type EqualsEpsilonFn<T> = (left: T, right: T, epsilon: number) => boolean

/**
 * 去掉相邻重复项。对标 Cesium `Core/arrayRemoveDuplicates.js`。
 *
 * @param values 源数组
 * @param equalsEpsilon 相等比较
 * @param wrapAround 是否把首尾也当相邻
 * @param removedIndices 可选：记录被删下标
 */
export function arrayRemoveDuplicates<T>(
  values: T[] | undefined,
  equalsEpsilon: EqualsEpsilonFn<T>,
  wrapAround?: boolean,
  removedIndices?: number[],
): T[] | undefined {
  Check.defined("equalsEpsilon", equalsEpsilon)
  if (!defined(values)) {
    return undefined
  }

  const shouldWrap = wrapAround ?? false
  const storeRemovedIndices = defined(removedIndices)
  const length = values.length
  if (length < 2) {
    return values
  }

  let v0 = values[0] as T
  let cleanedValues: T[] | undefined
  let lastCleanIndex = 0
  let removedIndexLCI = -1

  for (let i = 1; i < length; ++i) {
    const v1 = values[i] as T
    if (equalsEpsilon(v0, v1, removeDuplicatesEpsilon)) {
      if (!defined(cleanedValues)) {
        cleanedValues = values.slice(0, i)
        lastCleanIndex = i - 1
        removedIndexLCI = 0
      }
      if (storeRemovedIndices) {
        removedIndices.push(i)
      }
    } else {
      if (defined(cleanedValues)) {
        cleanedValues.push(v1)
        lastCleanIndex = i
        if (storeRemovedIndices) {
          removedIndexLCI = removedIndices.length
        }
      }
      v0 = v1
    }
  }

  if (
    shouldWrap &&
    equalsEpsilon(values[0] as T, values[length - 1] as T, removeDuplicatesEpsilon)
  ) {
    if (storeRemovedIndices) {
      if (defined(cleanedValues)) {
        removedIndices.splice(removedIndexLCI, 0, lastCleanIndex)
      } else {
        removedIndices.push(length - 1)
      }
    }
    if (defined(cleanedValues)) {
      cleanedValues.length -= 1
    } else {
      cleanedValues = values.slice(0, -1)
    }
  }

  return defined(cleanedValues) ? cleanedValues : values
}
