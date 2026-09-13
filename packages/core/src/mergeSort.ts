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
import { DeveloperError } from "./DeveloperError"

/** 稳定归并排序比较器 */
export type MergeSortComparator<T, U = unknown> = (a: T, b: T, userDefinedObject?: U) => number

const leftScratchArray: unknown[] = []
const rightScratchArray: unknown[] = []

function merge<T, U>(
  array: T[],
  compare: MergeSortComparator<T, U>,
  userDefinedObject: U | undefined,
  start: number,
  middle: number,
  end: number,
): void {
  const leftLength = middle - start + 1
  const rightLength = end - middle
  const left = leftScratchArray as T[]
  const right = rightScratchArray as T[]

  for (let i = 0; i < leftLength; ++i) {
    left[i] = array[start + i] as T
  }
  for (let j = 0; j < rightLength; ++j) {
    right[j] = array[middle + j + 1] as T
  }

  let i = 0
  let j = 0
  for (let k = start; k <= end; ++k) {
    const leftElement = left[i]
    const rightElement = right[j]
    if (
      i < leftLength &&
      (j >= rightLength || compare(leftElement as T, rightElement as T, userDefinedObject) <= 0)
    ) {
      array[k] = leftElement as T
      ++i
    } else if (j < rightLength) {
      array[k] = rightElement as T
      ++j
    }
  }
}

function sort<T, U>(
  array: T[],
  compare: MergeSortComparator<T, U>,
  userDefinedObject: U | undefined,
  start: number,
  end: number,
): void {
  if (start >= end) {
    return
  }
  const middle = Math.floor((start + end) * 0.5)
  sort(array, compare, userDefinedObject, start, middle)
  sort(array, compare, userDefinedObject, middle + 1, end)
  merge(array, compare, userDefinedObject, start, middle, end)
}

/**
 * 稳定归并排序。对标 Cesium `Core/mergeSort.js`。
 *
 * @param array 待排序数组
 * @param comparator 比较函数
 * @param userDefinedObject 传给比较器的第三参数
 */
export function mergeSort<T, U = unknown>(
  array: T[],
  comparator: MergeSortComparator<T, U>,
  userDefinedObject?: U,
): void {
  if (!defined(array)) {
    throw new DeveloperError("array is required.")
  }
  if (!defined(comparator)) {
    throw new DeveloperError("comparator is required.")
  }

  const length = array.length
  const scratchLength = Math.ceil(length * 0.5)
  leftScratchArray.length = scratchLength
  rightScratchArray.length = scratchLength
  sort(array, comparator, userDefinedObject, 0, length - 1)
  leftScratchArray.length = 0
  rightScratchArray.length = 0
}
