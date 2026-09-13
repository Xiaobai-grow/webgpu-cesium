/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：用有序数组实现 min/max 两端操作，API 对齐 Cesium；大数据量可再换 min-max heap。
 */

import { Check } from "./Check"
import { defined } from "./defined"

/** comparator(a, b) < 0 表示 a 优先级更低 */
export type DoubleEndedPriorityQueueComparator<T> = (a: T, b: T) => number

export interface DoubleEndedPriorityQueueOptions<T> {
  comparator: DoubleEndedPriorityQueueComparator<T>
  maximumLength?: number
}

/**
 * 双端优先队列。对标 Cesium `Core/DoubleEndedPriorityQueue.js`。
 */
export class DoubleEndedPriorityQueue<T> {
  private readonly _comparator: DoubleEndedPriorityQueueComparator<T>
  private _maximumLength: number | undefined
  private readonly _array: T[] = []

  /**
   * @param options 比较器与可选容量
   */
  constructor(options: DoubleEndedPriorityQueueOptions<T>) {
    Check.typeOf.object("options", options)
    Check.defined("options.comparator", options.comparator)
    this._comparator = options.comparator
    this._maximumLength = options.maximumLength
  }

  get length(): number {
    return this._array.length
  }

  get maximumLength(): number | undefined {
    return this._maximumLength
  }

  set maximumLength(value: number | undefined) {
    this._maximumLength = value
    if (defined(value)) {
      while (this._array.length > value) {
        this.removeMinimum()
      }
    }
  }

  /**
   * 插入元素；满员时丢掉最低优先级。
   *
   * @param element 元素
   */
  insert(element: T): void {
    this._array.push(element)
    this._array.sort(this._comparator)
    if (defined(this._maximumLength) && this._array.length > this._maximumLength) {
      this._array.shift()
    }
  }

  /**
   * 查看最低优先级。
   */
  peekMinimum(): T | undefined {
    return this._array[0]
  }

  /**
   * 查看最高优先级。
   */
  peekMaximum(): T | undefined {
    return this._array[this._array.length - 1]
  }

  /**
   * 弹出最低优先级。
   */
  removeMinimum(): T | undefined {
    return this._array.shift()
  }

  /**
   * 弹出最高优先级。
   */
  removeMaximum(): T | undefined {
    return this._array.pop()
  }

  /**
   * 清空。
   */
  reset(): void {
    this._array.length = 0
  }
}
