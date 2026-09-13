/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 */

/** 丢弃策略基类。 */
export abstract class TileDiscardPolicy {
  abstract shouldDiscardImage(image: unknown): boolean
}

/** 从不丢弃。 */
export class NeverTileDiscardPolicy extends TileDiscardPolicy {
  shouldDiscardImage(_image: unknown): boolean {
    return false
  }
}

/** 空图（宽高为 1 或全透明）丢弃。 */
export class DiscardEmptyTileImagePolicy extends TileDiscardPolicy {
  shouldDiscardImage(image: unknown): boolean {
    const sized = image as { width?: number; height?: number }
    return (sized.width ?? 0) <= 1 && (sized.height ?? 0) <= 1
  }
}

/** 缺图占位（与参考图逐像素比，M2 仅尺寸判断）。 */
export class DiscardMissingTileImagePolicy extends TileDiscardPolicy {
  shouldDiscardImage(image: unknown): boolean {
    return new DiscardEmptyTileImagePolicy().shouldDiscardImage(image)
  }
}
