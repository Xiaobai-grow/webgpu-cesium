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
 * 一次 EOP 采样。对标 Cesium `Core/EarthOrientationParametersSample.js`。
 */
export class EarthOrientationParametersSample {
  xPoleWander: number
  yPoleWander: number
  xPoleOffset: number
  yPoleOffset: number
  ut1MinusUtc: number

  /**
   * @param xPoleWander X 极移，弧度
   * @param yPoleWander Y 极移，弧度
   * @param xPoleOffset CIP X 偏移，弧度
   * @param yPoleOffset CIP Y 偏移，弧度
   * @param ut1MinusUtc UT1-UTC，秒
   */
  constructor(
    xPoleWander: number,
    yPoleWander: number,
    xPoleOffset: number,
    yPoleOffset: number,
    ut1MinusUtc: number,
  ) {
    this.xPoleWander = xPoleWander
    this.yPoleWander = yPoleWander
    this.xPoleOffset = xPoleOffset
    this.yPoleOffset = yPoleOffset
    this.ut1MinusUtc = ut1MinusUtc
  }
}
