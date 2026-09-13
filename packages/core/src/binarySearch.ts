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

/** 二分查找比较器：<0 则 a<b，>0 则 a>b，0 相等 */
export type BinarySearchComparator<T, I> = (a: T, b: I) => number

/**
 * 有序数组二分查找。找不到时返回按位取反的插入点。
 * 对标 Cesium `Core/binarySearch.js`。
 *
 * @param array 已排序数组
 * @param itemToFind 目标
 * @param comparator 比较函数
 */
export function binarySearch<T, I>(
  array: ArrayLike<T>,
  itemToFind: I,
  comparator: BinarySearchComparator<T, I>,
): number {
  Check.defined("array", array)
  Check.defined("itemToFind", itemToFind)
  Check.defined("comparator", comparator)

  let low = 0
  let high = array.length - 1
  while (low <= high) {
    const i = ~~((low + high) / 2)
    const element = array[i]
    const comparison = comparator(element as T, itemToFind)
    if (comparison < 0) {
      low = i + 1
      continue
    }
    if (comparison > 0) {
      high = i - 1
      continue
    }
    return i
  }
  return ~(high + 1)
}
