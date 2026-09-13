/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 */

/** 四叉树瓦片加载状态。 */
export const QuadtreeTileLoadState = Object.freeze({
  START: 0,
  LOADING: 1,
  DONE: 2,
  FAILED: 3,
})

export type QuadtreeTileLoadStateValue =
  (typeof QuadtreeTileLoadState)[keyof typeof QuadtreeTileLoadState]
