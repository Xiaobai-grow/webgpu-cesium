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
 * Morton（Z-order）编解码。对标 Cesium `Core/MortonOrder.js` 子集。
 */
export const MortonOrder = {
  /**
   * 2D 编码。
   *
   * @param x X
   * @param y Y
   */
  encode2D(x: number, y: number): number {
    return splitBy2(x) | (splitBy2(y) << 1)
  },

  /**
   * 2D 解码。
   *
   * @param key Morton
   */
  decode2D(key: number): { x: number; y: number } {
    return { x: compactBy2(key), y: compactBy2(key >> 1) }
  },

  /**
   * 3D 编码。
   *
   * @param x X
   * @param y Y
   * @param z Z
   */
  encode3D(x: number, y: number, z: number): number {
    return splitBy3(x) | (splitBy3(y) << 1) | (splitBy3(z) << 2)
  },

  /**
   * 3D 解码。
   *
   * @param key Morton
   */
  decode3D(key: number): { x: number; y: number; z: number } {
    return { x: compactBy3(key), y: compactBy3(key >> 1), z: compactBy3(key >> 2) }
  },
}

function splitBy2(value: number): number {
  let x = value & 0xffff
  x = (x | (x << 8)) & 0x00ff00ff
  x = (x | (x << 4)) & 0x0f0f0f0f
  x = (x | (x << 2)) & 0x33333333
  x = (x | (x << 1)) & 0x55555555
  return x
}

function compactBy2(value: number): number {
  let x = value & 0x55555555
  x = (x | (x >> 1)) & 0x33333333
  x = (x | (x >> 2)) & 0x0f0f0f0f
  x = (x | (x >> 4)) & 0x00ff00ff
  x = (x | (x >> 8)) & 0x0000ffff
  return x
}

function splitBy3(value: number): number {
  let x = value & 0x3ff
  x = (x | (x << 16)) & 0x030000ff
  x = (x | (x << 8)) & 0x0300f00f
  x = (x | (x << 4)) & 0x030c30c3
  x = (x | (x << 2)) & 0x09249249
  return x
}

function compactBy3(value: number): number {
  let x = value & 0x09249249
  x = (x | (x >> 2)) & 0x030c30c3
  x = (x | (x >> 4)) & 0x0300f00f
  x = (x | (x >> 8)) & 0x030000ff
  x = (x | (x >> 16)) & 0x000003ff
  return x
}
