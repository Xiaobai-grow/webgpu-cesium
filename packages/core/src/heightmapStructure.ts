/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { CesiumMath } from "./CesiumMath"
import type { Rectangle } from "./Rectangle"

/** 高度图缓冲结构。对标 Cesium HeightmapTessellator.DEFAULT_STRUCTURE */
export interface HeightmapStructure {
  heightScale: number
  heightOffset: number
  elementsPerHeight: number
  stride: number
  elementMultiplier: number
  isBigEndian: boolean
  lowestEncodedHeight?: number
  highestEncodedHeight?: number
}

/** 默认：每采样 1 个元素，米为单位 */
export const DEFAULT_HEIGHTMAP_STRUCTURE: HeightmapStructure = Object.freeze({
  heightScale: 1.0,
  heightOffset: 0.0,
  elementsPerHeight: 1,
  stride: 1,
  elementMultiplier: 256.0,
  isBigEndian: false,
})

/**
 * 合并用户结构与默认值。
 *
 * @param structure 可选覆盖
 */
export function resolveHeightmapStructure(
  structure?: Partial<HeightmapStructure>,
): HeightmapStructure {
  const defaults = DEFAULT_HEIGHTMAP_STRUCTURE
  if (structure === undefined) {
    return defaults
  }
  const resolved: HeightmapStructure = {
    heightScale: structure.heightScale ?? defaults.heightScale,
    heightOffset: structure.heightOffset ?? defaults.heightOffset,
    elementsPerHeight: structure.elementsPerHeight ?? defaults.elementsPerHeight,
    stride: structure.stride ?? defaults.stride,
    elementMultiplier: structure.elementMultiplier ?? defaults.elementMultiplier,
    isBigEndian: structure.isBigEndian ?? defaults.isBigEndian,
  }
  if (structure.lowestEncodedHeight !== undefined) {
    resolved.lowestEncodedHeight = structure.lowestEncodedHeight
  }
  if (structure.highestEncodedHeight !== undefined) {
    resolved.highestEncodedHeight = structure.highestEncodedHeight
  }
  return resolved
}

/**
 * 按结构读取一个高度采样（未乘 scale / offset）。
 *
 * @param buffer 高度缓冲
 * @param structure 结构
 * @param index 采样下标
 */
export function getEncodedHeight(
  buffer: ArrayLike<number>,
  structure: HeightmapStructure,
  index: number,
): number {
  const { elementsPerHeight, elementMultiplier, stride, isBigEndian } = structure
  let height = 0
  const start = index * stride
  if (isBigEndian) {
    for (let i = 0; i < elementsPerHeight; i++) {
      height = height * elementMultiplier + (buffer[start + i] ?? 0)
    }
  } else {
    for (let i = elementsPerHeight - 1; i >= 0; i--) {
      height = height * elementMultiplier + (buffer[start + i] ?? 0)
    }
  }
  return height
}

/**
 * 写入一个高度采样（已是编码值）。
 *
 * @param buffer 可写缓冲
 * @param structure 结构
 * @param index 采样下标
 * @param height 编码高度
 */
export function setEncodedHeight(
  buffer: Record<number, number>,
  structure: HeightmapStructure,
  index: number,
  height: number,
): void {
  const { elementsPerHeight, elementMultiplier, stride, isBigEndian } = structure
  let divisor = Math.pow(elementMultiplier, elementsPerHeight - 1)
  let remainder = height
  const start = index * stride
  if (isBigEndian) {
    for (let i = 0; i < elementsPerHeight; i++) {
      buffer[start + i] = Math.floor(remainder / divisor)
      remainder = remainder % divisor
      divisor /= elementMultiplier
    }
  } else {
    for (let i = elementsPerHeight - 1; i >= 0; i--) {
      buffer[start + i] = Math.floor(remainder / divisor)
      remainder = remainder % divisor
      divisor /= elementMultiplier
    }
  }
}

/**
 * 双线性插值高度图（row 0 为北）。返回乘 scale 加 offset 后的米。
 *
 * @param buffer 高度缓冲
 * @param structure 结构
 * @param rectangle 瓦片矩形
 * @param width 列
 * @param height 行
 * @param longitude 经度
 * @param latitude 纬度
 */
export function interpolateHeightmapSample(
  buffer: ArrayLike<number>,
  structure: HeightmapStructure,
  rectangle: Rectangle,
  width: number,
  height: number,
  longitude: number,
  latitude: number,
): number {
  const fromWest = ((longitude - rectangle.west) * (width - 1)) / (rectangle.east - rectangle.west)
  const fromSouth =
    ((latitude - rectangle.south) * (height - 1)) / (rectangle.north - rectangle.south)

  let westInteger = fromWest | 0
  let eastInteger = westInteger + 1
  if (eastInteger >= width) {
    eastInteger = width - 1
    westInteger = Math.max(0, width - 2)
  }

  let southInteger = fromSouth | 0
  let northInteger = southInteger + 1
  if (northInteger >= height) {
    northInteger = height - 1
    southInteger = Math.max(0, height - 2)
  }

  const dx = fromWest - westInteger
  const dy = fromSouth - southInteger

  // 缓冲 row 0 为北：把「自南向北」下标翻成行号
  southInteger = height - 1 - southInteger
  northInteger = height - 1 - northInteger

  const southwest = getEncodedHeight(buffer, structure, southInteger * width + westInteger)
  const southeast = getEncodedHeight(buffer, structure, southInteger * width + eastInteger)
  const northwest = getEncodedHeight(buffer, structure, northInteger * width + westInteger)
  const northeast = getEncodedHeight(buffer, structure, northInteger * width + eastInteger)

  const encoded = CesiumMath.lerp(
    CesiumMath.lerp(southwest, southeast, dx),
    CesiumMath.lerp(northwest, northeast, dx),
    dy,
  )
  return encoded * structure.heightScale + structure.heightOffset
}

/**
 * 子瓦片 childTileMask 位：SW=1 SE=2 NW=4 NE=8。
 *
 * @param childTileMask 掩码
 * @param thisX 父 x
 * @param thisY 父 y
 * @param childX 子 x
 * @param childY 子 y
 */
export function isHeightmapChildAvailable(
  childTileMask: number,
  thisX: number,
  thisY: number,
  childX: number,
  childY: number,
): boolean {
  let bitNumber = 2
  if (childX !== thisX * 2) {
    ++bitNumber
  }
  if (childY !== thisY * 2) {
    bitNumber -= 2
  }
  return (childTileMask & (1 << bitNumber)) !== 0
}
