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
import { Frozen } from "./Frozen"

/** VertexFormat 构造选项 */
export interface VertexFormatOptions {
  position?: boolean
  normal?: boolean
  st?: boolean
  bitangent?: boolean
  tangent?: boolean
  color?: boolean
}

/**
 * 顶点属性开关。对标 Cesium `Core/VertexFormat.js`。
 */
export class VertexFormat {
  position: boolean
  normal: boolean
  st: boolean
  bitangent: boolean
  tangent: boolean
  color: boolean

  static packedLength = 6

  /**
   * @param options 各属性是否启用
   */
  constructor(options?: VertexFormatOptions) {
    const resolved = options ?? Frozen.EMPTY_OBJECT
    this.position = resolved.position ?? false
    this.normal = resolved.normal ?? false
    this.st = resolved.st ?? false
    this.bitangent = resolved.bitangent ?? false
    this.tangent = resolved.tangent ?? false
    this.color = resolved.color ?? false
  }

  static POSITION_ONLY = Object.freeze(new VertexFormat({ position: true }))
  static POSITION_AND_NORMAL = Object.freeze(new VertexFormat({ position: true, normal: true }))
  static POSITION_NORMAL_AND_ST = Object.freeze(
    new VertexFormat({ position: true, normal: true, st: true }),
  )
  static POSITION_AND_ST = Object.freeze(new VertexFormat({ position: true, st: true }))
  static POSITION_AND_COLOR = Object.freeze(new VertexFormat({ position: true, color: true }))
  static ALL = Object.freeze(
    new VertexFormat({
      position: true,
      normal: true,
      st: true,
      tangent: true,
      bitangent: true,
    }),
  )
  static DEFAULT = VertexFormat.POSITION_NORMAL_AND_ST

  static pack(value: VertexFormat, array: number[], startingIndex?: number): number[] {
    if (!defined(value)) {
      throw new DeveloperError("value is required")
    }
    if (!defined(array)) {
      throw new DeveloperError("array is required")
    }
    let i = startingIndex ?? 0
    array[i++] = value.position ? 1.0 : 0.0
    array[i++] = value.normal ? 1.0 : 0.0
    array[i++] = value.st ? 1.0 : 0.0
    array[i++] = value.tangent ? 1.0 : 0.0
    array[i++] = value.bitangent ? 1.0 : 0.0
    array[i] = value.color ? 1.0 : 0.0
    return array
  }

  static unpack(array: number[], startingIndex?: number, result?: VertexFormat): VertexFormat {
    if (!defined(array)) {
      throw new DeveloperError("array is required")
    }
    let i = startingIndex ?? 0
    const dest = result ?? new VertexFormat()
    dest.position = array[i++] === 1.0
    dest.normal = array[i++] === 1.0
    dest.st = array[i++] === 1.0
    dest.tangent = array[i++] === 1.0
    dest.bitangent = array[i++] === 1.0
    dest.color = array[i] === 1.0
    return dest
  }

  static clone(vertexFormat?: VertexFormat, result?: VertexFormat): VertexFormat | undefined {
    if (!defined(vertexFormat)) {
      return undefined
    }
    const dest = result ?? new VertexFormat()
    dest.position = vertexFormat.position
    dest.normal = vertexFormat.normal
    dest.st = vertexFormat.st
    dest.tangent = vertexFormat.tangent
    dest.bitangent = vertexFormat.bitangent
    dest.color = vertexFormat.color
    return dest
  }
}
