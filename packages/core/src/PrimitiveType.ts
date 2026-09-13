/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 数值仍用历史 WebGL 常量，便于对照 Cesium Specs；另提供 toGpuPrimitiveTopology。
 */

export type GpuPrimitiveTopology =
  "point-list" | "line-list" | "line-strip" | "triangle-list" | "triangle-strip"

/**
 * 图元拓扑。对标 Cesium `Core/PrimitiveType.js`（不引入 WebGLConstants 模块）。
 */
export const PrimitiveType = {
  POINTS: 0x0000,
  LINES: 0x0001,
  LINE_LOOP: 0x0002,
  LINE_STRIP: 0x0003,
  TRIANGLES: 0x0004,
  TRIANGLE_STRIP: 0x0005,
  TRIANGLE_FAN: 0x0006,

  isLines(primitiveType: number): boolean {
    return (
      primitiveType === PrimitiveType.LINES ||
      primitiveType === PrimitiveType.LINE_LOOP ||
      primitiveType === PrimitiveType.LINE_STRIP
    )
  },

  isTriangles(primitiveType: number): boolean {
    return (
      primitiveType === PrimitiveType.TRIANGLES ||
      primitiveType === PrimitiveType.TRIANGLE_STRIP ||
      primitiveType === PrimitiveType.TRIANGLE_FAN
    )
  },

  validate(primitiveType: number): boolean {
    return (
      primitiveType === PrimitiveType.POINTS ||
      primitiveType === PrimitiveType.LINES ||
      primitiveType === PrimitiveType.LINE_LOOP ||
      primitiveType === PrimitiveType.LINE_STRIP ||
      primitiveType === PrimitiveType.TRIANGLES ||
      primitiveType === PrimitiveType.TRIANGLE_STRIP ||
      primitiveType === PrimitiveType.TRIANGLE_FAN
    )
  },

  /**
   * 映射到 GPUPrimitiveTopology。LINE_LOOP / TRIANGLE_FAN 无直接对应，回退为 list。
   *
   * @param primitiveType Cesium 常量
   */
  toGpuPrimitiveTopology(primitiveType: number): GpuPrimitiveTopology {
    switch (primitiveType) {
      case PrimitiveType.POINTS:
        return "point-list"
      case PrimitiveType.LINES:
      case PrimitiveType.LINE_LOOP:
        return "line-list"
      case PrimitiveType.LINE_STRIP:
        return "line-strip"
      case PrimitiveType.TRIANGLE_STRIP:
        return "triangle-strip"
      default:
        return "triangle-list"
    }
  },
}

Object.freeze(PrimitiveType)
