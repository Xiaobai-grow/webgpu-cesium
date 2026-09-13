/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 */

import { ImageryState, type ImageryStateValue } from "./ImageryState"
import type { ImageryLayer } from "./ImageryLayer"

/**
 * 一张影像瓦片的 CPU 状态。
 */
export class Imagery {
  imageryLayer: ImageryLayer
  x: number
  y: number
  level: number
  state: ImageryStateValue = ImageryState.UNLOADED
  image: ImageBitmap | HTMLImageElement | undefined
  textureLayer: number | undefined
  referenceCount = 0

  /**
   * @param layer 所属层
   * @param x 列
   * @param y 行
   * @param level LOD
   */
  constructor(layer: ImageryLayer, x: number, y: number, level: number) {
    this.imageryLayer = layer
    this.x = x
    this.y = y
    this.level = level
  }

  addReference(): void {
    this.referenceCount++
  }

  releaseReference(): number {
    this.referenceCount--
    return this.referenceCount
  }
}
