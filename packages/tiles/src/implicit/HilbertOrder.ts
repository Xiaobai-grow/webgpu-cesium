/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/tiles
 */

/**
 * 2D Hilbert 曲线（S2 / 隐式瓦片备用）。对标 Cesium `HilbertOrder` 子集。
 */
export const HilbertOrder = {
  /**
   * 编码。
   *
   * @param level 层
   * @param x X
   * @param y Y
   */
  encode2D(level: number, x: number, y: number): number {
    let rx: number
    let ry: number
    let d = 0
    let xx = x
    let yy = y
    for (let s = 1 << (level - 1); s > 0; s >>= 1) {
      rx = (xx & s) > 0 ? 1 : 0
      ry = (yy & s) > 0 ? 1 : 0
      d += s * s * ((3 * rx) ^ ry)
      ;({ x: xx, y: yy } = rotate(s, xx, yy, rx, ry))
    }
    return d
  },
}

function rotate(n: number, x: number, y: number, rx: number, ry: number): { x: number; y: number } {
  if (ry !== 0) {
    return { x, y }
  }
  let xx = x
  let yy = y
  if (rx === 1) {
    xx = n - 1 - xx
    yy = n - 1 - yy
  }
  return { x: yy, y: xx }
}
