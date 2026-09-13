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
import { defined } from "./defined"

/** 堆比较器：<0 则 a 排在更低下标（更高优先级） */
export type HeapComparator<T> = (a: T, b: T) => number

export interface HeapOptions<T> {
  comparator: HeapComparator<T>
}

function swap<T>(array: T[], a: number, b: number): void {
  const temp = array[a] as T
  array[a] = array[b] as T
  array[b] = temp
}

/**
 * 数组堆。对标 Cesium `Core/Heap.js`。
 */
export class Heap<T> {
  private readonly _comparator: HeapComparator<T>
  private readonly _array: T[] = []
  private _length = 0
  private _maximumLength: number | undefined

  /**
   * @param options.comparator 比较器
   */
  constructor(options: HeapOptions<T>) {
    Check.typeOf.object("options", options)
    Check.defined("options.comparator", options.comparator)
    this._comparator = options.comparator
  }

  get length(): number {
    return this._length
  }

  get internalArray(): T[] {
    return this._array
  }

  get maximumLength(): number | undefined {
    return this._maximumLength
  }

  set maximumLength(value: number) {
    Check.typeOf.number.greaterThanOrEquals("maximumLength", value, 0)
    const originalLength = this._length
    if (value < originalLength) {
      const array = this._array
      for (let i = value; i < originalLength; ++i) {
        array[i] = undefined as T
      }
      this._length = value
      array.length = value
    }
    this._maximumLength = value
  }

  get comparator(): HeapComparator<T> {
    return this._comparator
  }

  /**
   * 预分配内部数组长度。
   */
  reserve(length?: number): void {
    this._array.length = length ?? this._length
  }

  /**
   * 从 index 起向下堆化。
   */
  heapify(index?: number): void {
    let current = index ?? 0
    const length = this._length
    const comparator = this._comparator
    const array = this._array
    let inserting = true

    while (inserting) {
      const right = 2 * (current + 1)
      const left = right - 1
      let candidate = current
      if (left < length && comparator(array[left] as T, array[current] as T) < 0) {
        candidate = left
      }
      if (right < length && comparator(array[right] as T, array[candidate] as T) < 0) {
        candidate = right
      }
      if (candidate !== current) {
        swap(array, candidate, current)
        current = candidate
      } else {
        inserting = false
      }
    }
  }

  /** 重新建堆 */
  resort(): void {
    const length = this._length
    for (let i = Math.ceil(length / 2); i >= 0; --i) {
      this.heapify(i)
    }
  }

  /**
   * 插入元素。超过 maximumLength 时挤掉最低优先级元素并返回它。
   */
  insert(element: T): T | undefined {
    Check.defined("element", element)
    const array = this._array
    const comparator = this._comparator
    const maximumLength = this._maximumLength

    let index = this._length++
    if (index < array.length) {
      array[index] = element
    } else {
      array.push(element)
    }

    while (index !== 0) {
      const parent = Math.floor((index - 1) / 2)
      if (comparator(array[index] as T, array[parent] as T) < 0) {
        swap(array, index, parent)
        index = parent
      } else {
        break
      }
    }

    if (defined(maximumLength) && this._length > maximumLength) {
      const removed = array[maximumLength]
      this._length = maximumLength
      return removed
    }
    return undefined
  }

  /**
   * 弹出指定下标（默认堆顶）。
   */
  pop(index?: number): T | undefined {
    const resolved = index ?? 0
    if (this._length === 0) {
      return undefined
    }
    Check.typeOf.number.lessThan("index", resolved, this._length)
    const array = this._array
    const root = array[resolved]
    swap(array, resolved, --this._length)
    this.heapify(resolved)
    array[this._length] = undefined as T
    return root
  }
}
