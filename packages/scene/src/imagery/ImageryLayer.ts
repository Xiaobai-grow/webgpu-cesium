/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 */

import { Imagery } from "./Imagery"
import type { ImageryProvider } from "./ImageryProvider"
import { ImageryState } from "./ImageryState"
import { TileImagery } from "./TileImagery"

export interface ImageryLayerOptions {
  alpha?: number
  brightness?: number
  contrast?: number
  show?: boolean
}

/**
 * 一层影像。
 */
export class ImageryLayer {
  imageryProvider: ImageryProvider
  alpha: number
  brightness: number
  contrast: number
  show: boolean
  readonly _imageryCache = new Map<string, Imagery>()

  /**
   * @param imageryProvider Provider
   * @param options 显示参数
   */
  constructor(imageryProvider: ImageryProvider, options?: ImageryLayerOptions) {
    this.imageryProvider = imageryProvider
    this.alpha = options?.alpha ?? 1
    this.brightness = options?.brightness ?? 1
    this.contrast = options?.contrast ?? 1
    this.show = options?.show ?? true
  }

  /**
   * 缓存键。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   */
  static getKey(x: number, y: number, level: number): string {
    return `${level}/${x}/${y}`
  }

  /**
   * 取或建 Imagery。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   */
  getImageryFromCache(x: number, y: number, level: number): Imagery {
    const key = ImageryLayer.getKey(x, y, level)
    let imagery = this._imageryCache.get(key)
    if (!imagery) {
      imagery = new Imagery(this, x, y, level)
      this._imageryCache.set(key, imagery)
    }
    return imagery
  }

  /**
   * 为地形瓦片创建 TileImagery（同方案 1:1 映射）。
   *
   * @param x 地形列
   * @param y 地形行
   * @param level 地形 LOD
   */
  createTileImagery(x: number, y: number, level: number): TileImagery | undefined {
    if (!this.show) {
      return undefined
    }
    const provider = this.imageryProvider
    if (level < provider.minimumLevel) {
      return undefined
    }
    if (provider.maximumLevel !== undefined && level > provider.maximumLevel) {
      return undefined
    }
    const imagery = this.getImageryFromCache(x, y, level)
    return new TileImagery(imagery)
  }

  /**
   * 推进一张影像的加载。
   *
   * @param imagery 影像
   */
  processImagery(imagery: Imagery): void {
    if (imagery.state !== ImageryState.UNLOADED) {
      return
    }
    imagery.state = ImageryState.TRANSITIONING
    const promised = this.imageryProvider.requestImage(imagery.x, imagery.y, imagery.level)
    if (promised === undefined) {
      imagery.state = ImageryState.UNLOADED
      return
    }
    promised
      .then((image) => {
        if (!image || this.imageryProvider.tileDiscardPolicy?.shouldDiscardImage(image)) {
          imagery.state = ImageryState.INVALID
          return
        }
        imagery.image = image
        imagery.state = ImageryState.RECEIVED
      })
      .catch(() => {
        imagery.state = ImageryState.FAILED
      })
  }
}
