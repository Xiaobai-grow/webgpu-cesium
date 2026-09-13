/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import type { Ellipsoid } from "./Ellipsoid"
import type { Rectangle } from "./Rectangle"
import type { TerrainMesh } from "./TerrainMesh"

/** createMesh 选项 */
export interface TerrainDataCreateMeshOptions {
  tilingScheme: {
    ellipsoid: Ellipsoid
    tileXYToRectangle: (x: number, y: number, level: number, result?: Rectangle) => Rectangle
  }
  x: number
  y: number
  level: number
  exaggeration?: number
}

/**
 * 地形数据基类。对标 Cesium `Core/TerrainData.js`。
 */
export abstract class TerrainData {
  /** 子瓦片是否都可用（椭球地形恒为 true） */
  abstract childTileMask: number

  /** 是否含水面掩码 */
  abstract waterMask: Uint8Array | undefined

  /**
   * 生成网格。
   *
   * @param options 瓦片坐标与方案
   */
  abstract createMesh(options: TerrainDataCreateMeshOptions): Promise<TerrainMesh>

  /**
   * 指定子瓦片是否可用。
   *
   * @param thisX 本瓦片 x
   * @param thisY 本瓦片 y
   * @param childX 子瓦片 x
   * @param childY 子瓦片 y
   */
  abstract isChildAvailable(thisX: number, thisY: number, childX: number, childY: number): boolean

  /** 是否可上采样（M2 椭球路径为 false） */
  abstract wasCreatedByUpsampling(): boolean
}
