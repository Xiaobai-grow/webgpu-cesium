/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 */

import type { Imagery } from "./Imagery"

/**
 * 地形瓦片上的一层影像引用。
 */
export class TileImagery {
  readyImagery: Imagery | undefined
  loadingImagery: Imagery | undefined
  textureCoordinateRectangle: { west: number; south: number; east: number; north: number }

  /**
   * @param imagery 加载中的影像
   */
  constructor(imagery?: Imagery) {
    this.loadingImagery = imagery
    this.textureCoordinateRectangle = { west: 0, south: 0, east: 1, north: 1 }
    imagery?.addReference()
  }

  /**
   * 释放引用。
   */
  freeResources(): void {
    if (this.loadingImagery) {
      this.loadingImagery.releaseReference()
      this.loadingImagery = undefined
    }
    if (this.readyImagery) {
      this.readyImagery.releaseReference()
      this.readyImagery = undefined
    }
  }
}
