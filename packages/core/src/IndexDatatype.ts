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
import { CesiumMath } from "./CesiumMath"

/** 与 GPUIndexFormat 对齐 */
export type GpuIndexFormatName = "uint16" | "uint32"

/**
 * 索引类型。对标 Cesium `Core/IndexDatatype.js`。
 */
export const IndexDatatype = {
  UNSIGNED_BYTE: 0x1401,
  UNSIGNED_SHORT: 0x1403,
  UNSIGNED_INT: 0x1405,

  getSizeInBytes(indexDatatype: number): number {
    switch (indexDatatype) {
      case IndexDatatype.UNSIGNED_BYTE:
        return Uint8Array.BYTES_PER_ELEMENT
      case IndexDatatype.UNSIGNED_SHORT:
        return Uint16Array.BYTES_PER_ELEMENT
      case IndexDatatype.UNSIGNED_INT:
        return Uint32Array.BYTES_PER_ELEMENT
      default:
        throw new DeveloperError(
          "indexDatatype is required and must be a valid IndexDatatype constant.",
        )
    }
  },

  fromSizeInBytes(sizeInBytes: number): number {
    switch (sizeInBytes) {
      case 2:
        return IndexDatatype.UNSIGNED_SHORT
      case 4:
        return IndexDatatype.UNSIGNED_INT
      case 1:
        return IndexDatatype.UNSIGNED_BYTE
      default:
        throw new DeveloperError("Size in bytes cannot be mapped to an IndexDatatype")
    }
  },

  validate(indexDatatype: number): boolean {
    return (
      defined(indexDatatype) &&
      (indexDatatype === IndexDatatype.UNSIGNED_BYTE ||
        indexDatatype === IndexDatatype.UNSIGNED_SHORT ||
        indexDatatype === IndexDatatype.UNSIGNED_INT)
    )
  },

  createTypedArray(
    numberOfVertices: number,
    indicesLengthOrArray: number | ArrayLike<number>,
  ): Uint16Array | Uint32Array {
    if (!defined(numberOfVertices)) {
      throw new DeveloperError("numberOfVertices is required.")
    }
    if (numberOfVertices >= CesiumMath.SIXTY_FOUR_KILOBYTES) {
      return new Uint32Array(indicesLengthOrArray as number)
    }
    return new Uint16Array(indicesLengthOrArray as number)
  },

  /**
   * 从 ArrayBuffer 视图创建索引数组。
   *
   * @param numberOfVertices 顶点数
   * @param sourceArray 源缓冲
   * @param byteOffset 字节偏移
   * @param length 元素个数
   */
  createTypedArrayFromArrayBuffer(
    numberOfVertices: number,
    sourceArray: ArrayBuffer,
    byteOffset: number,
    length: number,
  ): Uint16Array | Uint32Array {
    if (numberOfVertices >= CesiumMath.SIXTY_FOUR_KILOBYTES) {
      return new Uint32Array(sourceArray, byteOffset, length)
    }
    return new Uint16Array(sourceArray, byteOffset, length)
  },

  fromTypedArray(array: Uint8Array | Uint16Array | Uint32Array): number {
    if (array instanceof Uint8Array) {
      return IndexDatatype.UNSIGNED_BYTE
    }
    if (array instanceof Uint16Array) {
      return IndexDatatype.UNSIGNED_SHORT
    }
    if (array instanceof Uint32Array) {
      return IndexDatatype.UNSIGNED_INT
    }
    throw new DeveloperError("array must be a Uint8Array, Uint16Array, or Uint32Array.")
  },

  /** WebGPU 只有 uint16 / uint32；UNSIGNED_BYTE 需在上传前加宽 */
  toGpuIndexFormat(indexDatatype: number): GpuIndexFormatName {
    if (indexDatatype === IndexDatatype.UNSIGNED_INT) {
      return "uint32"
    }
    return "uint16"
  },
}

Object.freeze(IndexDatatype)
