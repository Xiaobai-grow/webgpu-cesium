/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 闭区间 [start, stop]。对标 Cesium `Core/Interval.js`。 */
export class Interval {
  start: number
  stop: number

  /**
   * @param start 起点
   * @param stop 终点
   */
  constructor(start?: number, stop?: number) {
    this.start = start ?? 0.0
    this.stop = stop ?? 0.0
  }
}
