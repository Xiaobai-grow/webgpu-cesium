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

/**
 * 哈希 + 数组的键值集合。对标 Cesium `Core/AssociativeArray.js`。
 */
export class AssociativeArray<T> {
  private _array: T[] = []
  private _hash: Record<string, T> = {}

  get length(): number {
    return this._array.length
  }

  get values(): T[] {
    return this._array
  }

  contains(key: string | number): boolean {
    if (typeof key !== "string" && typeof key !== "number") {
      throw new DeveloperError("key is required to be a string or number.")
    }
    return defined(this._hash[key])
  }

  set(key: string | number, value: T): void {
    if (typeof key !== "string" && typeof key !== "number") {
      throw new DeveloperError("key is required to be a string or number.")
    }
    const oldValue = this._hash[key]
    if (value !== oldValue) {
      this.remove(key)
      this._hash[key] = value
      this._array.push(value)
    }
  }

  get(key: string | number): T | undefined {
    if (typeof key !== "string" && typeof key !== "number") {
      throw new DeveloperError("key is required to be a string or number.")
    }
    return this._hash[key]
  }

  remove(key: string | number): boolean {
    if (defined(key) && typeof key !== "string" && typeof key !== "number") {
      throw new DeveloperError("key is required to be a string or number.")
    }
    const value = this._hash[key]
    const hasValue = defined(value)
    if (hasValue) {
      const array = this._array
      array.splice(array.indexOf(value), 1)
      delete this._hash[key]
    }
    return hasValue
  }

  removeAll(): void {
    if (this._array.length > 0) {
      this._hash = {}
      this._array.length = 0
    }
  }
}
