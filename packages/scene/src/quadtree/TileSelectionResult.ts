/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 */

/** 四叉树选择结果。 */
export const TileSelectionResult = Object.freeze({
  NONE: 0,
  CULLED: 1,
  RENDERED: 2,
  REFINED: 3,
  CULLED_BUT_NEEDED: 4,
})

export type TileSelectionResultValue =
  (typeof TileSelectionResult)[keyof typeof TileSelectionResult]
