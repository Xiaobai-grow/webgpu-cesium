/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 数值型 TypedArray 联合（不含 BigInt 数组） */
export type TypedArray =
  | Float64Array
  | Float32Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | Int32Array
  | Int16Array
  | Int8Array
  | Uint8ClampedArray

/** TypedArray 构造器联合 */
export type TypedArrayConstructor =
  | Float64ArrayConstructor
  | Float32ArrayConstructor
  | Uint32ArrayConstructor
  | Uint16ArrayConstructor
  | Uint8ArrayConstructor
  | Int32ArrayConstructor
  | Int16ArrayConstructor
  | Int8ArrayConstructor
  | Uint8ClampedArrayConstructor

/** 实现 `destroy()` 的对象 */
export interface Destroyable {
  destroy: () => void
}
