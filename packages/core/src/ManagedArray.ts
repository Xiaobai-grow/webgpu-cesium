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

/**
 * 可手动管理逻辑长度的数组包装。对标 Cesium `Core/ManagedArray.js`。
 */
export class ManagedArray<T> {
  private _array: T[]
  private _length: number

  /**
   * @param length 初始逻辑长度
   */
  constructor(length?: number) {
    const resolved = length ?? 0
    this._array = new Array<T>(resolved)
    this._length = resolved
  }

  get length(): number {
    return this._length
  }

  set length(length: number) {
    Check.typeOf.number.greaterThanOrEquals("length", length, 0)
    const array = this._array
    const originalLength = this._length
    if (length < originalLength) {
      for (let i = length; i < originalLength; ++i) {
        array[i] = undefined as T
      }
    } else if (length > array.length) {
      array.length = length
    }
    this._length = length
  }

  get values(): T[] {
    return this._array
  }

  get(index: number): T | undefined {
    Check.typeOf.number.lessThan("index", index, this._array.length)
    return this._array[index]
  }

  set(index: number, element: T): void {
    Check.typeOf.number("index", index)
    if (index >= this._length) {
      this.length = index + 1
    }
    this._array[index] = element
  }

  peek(): T | undefined {
    return this._array[this._length - 1]
  }

  push(element: T): void {
    const index = this.length++
    this._array[index] = element
  }

  pop(): T | undefined {
    if (this._length === 0) {
      return undefined
    }
    const element = this._array[this._length - 1]
    this.length = this._length - 1
    return element
  }

  reserve(length: number): void {
    Check.typeOf.number.greaterThanOrEquals("length", length, 0)
    if (length > this._array.length) {
      this._array.length = length
    }
  }

  resize(length: number): void {
    Check.typeOf.number.greaterThanOrEquals("length", length, 0)
    this.length = length
  }

  trim(length?: number): void {
    this._array.length = length ?? this._length
  }
}
