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
 * IAU 定向参数（弧度）。对标 Cesium `Core/IauOrientationParameters.js`。
 */
export class IauOrientationParameters {
  rightAscension: number
  declination: number
  rotation: number
  rotationRate: number

  /**
   * @param rightAscension 赤经
   * @param declination 赤纬
   * @param rotation 绕北极旋转
   * @param rotationRate 瞬时转速
   */
  constructor(rightAscension: number, declination: number, rotation: number, rotationRate: number) {
    this.rightAscension = rightAscension
    this.declination = declination
    this.rotation = rotation
    this.rotationRate = rotationRate
  }
}
