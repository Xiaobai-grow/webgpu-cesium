/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/**
 * IAU 2006 XYS 采样。对标 Cesium `Core/Iau2006XysSample.js`。
 */
export class Iau2006XysSample {
  x: number
  y: number
  s: number

  /**
   * @param x X
   * @param y Y
   * @param s S
   */
  constructor(x: number, y: number, s: number) {
    this.x = x
    this.y = y
    this.s = s
  }
}
