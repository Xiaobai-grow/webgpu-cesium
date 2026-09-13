/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 枚举值仍用历史 WebGL 常量以便对照 Cesium；新增 toGpuVertexFormat。
 */

import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { type TypedArray } from "./globalTypes"

/** 与 GPUVertexFormat 对齐的字符串（core 不引用 @webgpu/types） */
export type GpuVertexFormatName =
  | "uint8"
  | "uint8x2"
  | "uint8x4"
  | "sint8"
  | "sint8x2"
  | "sint8x4"
  | "unorm8"
  | "unorm8x2"
  | "unorm8x4"
  | "snorm8"
  | "snorm8x2"
  | "snorm8x4"
  | "uint16"
  | "uint16x2"
  | "uint16x4"
  | "sint16"
  | "sint16x2"
  | "sint16x4"
  | "unorm16"
  | "unorm16x2"
  | "unorm16x4"
  | "snorm16"
  | "snorm16x2"
  | "snorm16x4"
  | "float16"
  | "float16x2"
  | "float16x4"
  | "float32"
  | "float32x2"
  | "float32x3"
  | "float32x4"
  | "uint32"
  | "uint32x2"
  | "uint32x3"
  | "uint32x4"
  | "sint32"
  | "sint32x2"
  | "sint32x3"
  | "sint32x4"

export type ComponentDatatypeValue = number

/**
 * 顶点分量类型。对标 Cesium `Core/ComponentDatatype.js`。
 */
export const ComponentDatatype = {
  BYTE: 0x1400,
  UNSIGNED_BYTE: 0x1401,
  SHORT: 0x1402,
  UNSIGNED_SHORT: 0x1403,
  INT: 0x1404,
  UNSIGNED_INT: 0x1405,
  FLOAT: 0x1406,
  DOUBLE: 0x140a,

  getSizeInBytes(componentDatatype: number): number {
    if (!defined(componentDatatype)) {
      throw new DeveloperError("value is required.")
    }
    switch (componentDatatype) {
      case ComponentDatatype.BYTE:
        return Int8Array.BYTES_PER_ELEMENT
      case ComponentDatatype.UNSIGNED_BYTE:
        return Uint8Array.BYTES_PER_ELEMENT
      case ComponentDatatype.SHORT:
        return Int16Array.BYTES_PER_ELEMENT
      case ComponentDatatype.UNSIGNED_SHORT:
        return Uint16Array.BYTES_PER_ELEMENT
      case ComponentDatatype.INT:
        return Int32Array.BYTES_PER_ELEMENT
      case ComponentDatatype.UNSIGNED_INT:
        return Uint32Array.BYTES_PER_ELEMENT
      case ComponentDatatype.FLOAT:
        return Float32Array.BYTES_PER_ELEMENT
      case ComponentDatatype.DOUBLE:
        return Float64Array.BYTES_PER_ELEMENT
      default:
        throw new DeveloperError("componentDatatype is not a valid value.")
    }
  },

  fromTypedArray(array: TypedArray): number {
    if (array instanceof Int8Array) {
      return ComponentDatatype.BYTE
    }
    if (array instanceof Uint8Array) {
      return ComponentDatatype.UNSIGNED_BYTE
    }
    if (array instanceof Int16Array) {
      return ComponentDatatype.SHORT
    }
    if (array instanceof Uint16Array) {
      return ComponentDatatype.UNSIGNED_SHORT
    }
    if (array instanceof Int32Array) {
      return ComponentDatatype.INT
    }
    if (array instanceof Uint32Array) {
      return ComponentDatatype.UNSIGNED_INT
    }
    if (array instanceof Float32Array) {
      return ComponentDatatype.FLOAT
    }
    if (array instanceof Float64Array) {
      return ComponentDatatype.DOUBLE
    }
    throw new DeveloperError(
      "array must be an Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, or Float64Array.",
    )
  },

  validate(componentDatatype: number): boolean {
    return (
      defined(componentDatatype) &&
      (componentDatatype === ComponentDatatype.BYTE ||
        componentDatatype === ComponentDatatype.UNSIGNED_BYTE ||
        componentDatatype === ComponentDatatype.SHORT ||
        componentDatatype === ComponentDatatype.UNSIGNED_SHORT ||
        componentDatatype === ComponentDatatype.INT ||
        componentDatatype === ComponentDatatype.UNSIGNED_INT ||
        componentDatatype === ComponentDatatype.FLOAT ||
        componentDatatype === ComponentDatatype.DOUBLE)
    )
  },

  createTypedArray(
    componentDatatype: number,
    valuesOrLength: number | ArrayLike<number>,
  ): TypedArray {
    if (!defined(componentDatatype)) {
      throw new DeveloperError("componentDatatype is required.")
    }
    if (!defined(valuesOrLength)) {
      throw new DeveloperError("valuesOrLength is required.")
    }
    switch (componentDatatype) {
      case ComponentDatatype.BYTE:
        return new Int8Array(valuesOrLength as number)
      case ComponentDatatype.UNSIGNED_BYTE:
        return new Uint8Array(valuesOrLength as number)
      case ComponentDatatype.SHORT:
        return new Int16Array(valuesOrLength as number)
      case ComponentDatatype.UNSIGNED_SHORT:
        return new Uint16Array(valuesOrLength as number)
      case ComponentDatatype.INT:
        return new Int32Array(valuesOrLength as number)
      case ComponentDatatype.UNSIGNED_INT:
        return new Uint32Array(valuesOrLength as number)
      case ComponentDatatype.FLOAT:
        return new Float32Array(valuesOrLength as number)
      case ComponentDatatype.DOUBLE:
        return new Float64Array(valuesOrLength as number)
      default:
        throw new DeveloperError("componentDatatype is not a valid value.")
    }
  },

  /**
   * 映射到 GPUVertexFormat 名。DOUBLE 不能直接上传，抛错。
   *
   * @param componentDatatype 分量类型
   * @param componentsPerAttribute 1–4
   * @param normalized 整数是否按 unorm/snorm 解释
   */
  toGpuVertexFormat(
    componentDatatype: number,
    componentsPerAttribute: 1 | 2 | 3 | 4,
    normalized = false,
  ): GpuVertexFormatName {
    if (componentDatatype === ComponentDatatype.DOUBLE) {
      throw new DeveloperError(
        "DOUBLE cannot map to GPUVertexFormat; split via EncodedCartesian3 or AttributeCompression.",
      )
    }
    const suffix = componentsPerAttribute === 1 ? "" : `x${componentsPerAttribute}`
    if (componentDatatype === ComponentDatatype.FLOAT) {
      return `float32${suffix}` as GpuVertexFormatName
    }
    if (componentDatatype === ComponentDatatype.UNSIGNED_BYTE) {
      return `${normalized ? "unorm8" : "uint8"}${suffix}` as GpuVertexFormatName
    }
    if (componentDatatype === ComponentDatatype.BYTE) {
      return `${normalized ? "snorm8" : "sint8"}${suffix}` as GpuVertexFormatName
    }
    if (componentDatatype === ComponentDatatype.UNSIGNED_SHORT) {
      return `${normalized ? "unorm16" : "uint16"}${suffix}` as GpuVertexFormatName
    }
    if (componentDatatype === ComponentDatatype.SHORT) {
      return `${normalized ? "snorm16" : "sint16"}${suffix}` as GpuVertexFormatName
    }
    if (componentDatatype === ComponentDatatype.UNSIGNED_INT) {
      return `uint32${suffix}` as GpuVertexFormatName
    }
    if (componentDatatype === ComponentDatatype.INT) {
      return `sint32${suffix}` as GpuVertexFormatName
    }
    throw new DeveloperError("componentDatatype is not a valid value.")
  },
}

Object.freeze(ComponentDatatype)
