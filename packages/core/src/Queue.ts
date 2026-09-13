/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 队列比较器 */
export type QueueComparator<T> = (a: T, b: T) => number

/**
 * 尾入头出队列。对标 Cesium `Core/Queue.js`。
 */
export class Queue<T> {
  private _array: T[] = []
  private _offset = 0
  private _length = 0

  get length(): number {
    return this._length
  }

  enqueue(item: T): void {
    this._array.push(item)
    this._length++
  }

  dequeue(): T | undefined {
    if (this._length === 0) {
      return undefined
    }
    const array = this._array
    let offset = this._offset
    const item = array[offset]
    array[offset] = undefined as T
    offset++
    if (offset > 10 && offset * 2 > array.length) {
      this._array = array.slice(offset)
      offset = 0
    }
    this._offset = offset
    this._length--
    return item
  }

  peek(): T | undefined {
    if (this._length === 0) {
      return undefined
    }
    return this._array[this._offset]
  }

  contains(item: T): boolean {
    return this._array.includes(item)
  }

  clear(): void {
    this._array.length = 0
    this._offset = 0
    this._length = 0
  }

  sort(compareFunction: QueueComparator<T>): void {
    if (this._offset > 0) {
      this._array = this._array.slice(this._offset)
      this._offset = 0
    }
    this._array.sort(compareFunction)
  }
}
