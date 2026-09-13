/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 */

import { Event } from "@webgpu-cesium/core"
import { ImageryLayer } from "./ImageryLayer"
import type { ImageryProvider } from "./ImageryProvider"

/**
 * 影像层列表。
 */
export class ImageryLayerCollection {
  readonly layerAdded = new Event<[ImageryLayer, number]>()
  readonly layerRemoved = new Event<[ImageryLayer, number]>()
  readonly layerMoved = new Event<[ImageryLayer, number, number]>()
  readonly layerShownOrHidden = new Event<[ImageryLayer, number, boolean]>()
  private readonly _layers: ImageryLayer[] = []

  get length(): number {
    return this._layers.length
  }

  /**
   * 按下标取层。
   *
   * @param index 下标
   */
  get(index: number): ImageryLayer | undefined {
    return this._layers[index]
  }

  /**
   * 添加层。
   *
   * @param layer 层
   * @param index 可选位置
   */
  add(layer: ImageryLayer, index?: number): void {
    if (index === undefined || index >= this._layers.length) {
      this._layers.push(layer)
    } else {
      this._layers.splice(index, 0, layer)
    }
    this.layerAdded.raiseEvent(layer, this._layers.indexOf(layer))
  }

  /**
   * 由 Provider 添加一层。
   *
   * @param provider Provider
   * @param index 位置
   */
  addImageryProvider(provider: ImageryProvider, index?: number): ImageryLayer {
    const layer = new ImageryLayer(provider)
    this.add(layer, index)
    return layer
  }

  /**
   * 移除层。
   *
   * @param layer 层
   */
  remove(layer: ImageryLayer): boolean {
    const index = this._layers.indexOf(layer)
    if (index < 0) {
      return false
    }
    this._layers.splice(index, 1)
    this.layerRemoved.raiseEvent(layer, index)
    return true
  }

  removeAll(): void {
    while (this._layers.length > 0) {
      this.remove(this._layers[0]!)
    }
  }

  [Symbol.iterator](): Iterator<ImageryLayer> {
    return this._layers[Symbol.iterator]()
  }
}
