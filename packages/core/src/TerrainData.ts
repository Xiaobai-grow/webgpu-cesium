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

import type { TilingScheme } from "./TilingScheme"

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
  exaggerationRelativeHeight?: number
  skirtHeight?: number
  throttle?: boolean
}

/**
 * 地形数据基类。对标 Cesium `Core/TerrainData.js`。
 */
export abstract class TerrainData {
  /** Worker 异步网格创建的并发上限 */
  static maximumAsynchronousTasks = 5

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
   * 指定经纬处的地形高（米）。无法插值时返回 undefined（需先 createMesh）。
   *
   * @param rectangle 本瓦片矩形
   * @param longitude 经度
   * @param latitude 纬度
   */
  abstract interpolateHeight(
    rectangle: Rectangle,
    longitude: number,
    latitude: number,
  ): number | undefined

  /**
   * 上采样给直接子瓦片。网格未创建时返回 undefined。
   *
   * @param tilingScheme 方案
   * @param thisX 本列
   * @param thisY 本行
   * @param thisLevel 本 LOD
   * @param descendantX 子列
   * @param descendantY 子行
   * @param descendantLevel 子 LOD
   */
  upsample(
    _tilingScheme: TilingScheme,
    _thisX: number,
    _thisY: number,
    _thisLevel: number,
    _descendantX: number,
    _descendantY: number,
    _descendantLevel: number,
  ): Promise<TerrainData> | undefined {
    return undefined
  }

  /**
   * 指定子瓦片是否可用。
   *
   * @param thisX 本瓦片 x
   * @param thisY 本瓦片 y
   * @param childX 子瓦片 x
   * @param childY 子瓦片 y
   */
  abstract isChildAvailable(thisX: number, thisY: number, childX: number, childY: number): boolean

  /** 是否由上采样得到 */
  abstract wasCreatedByUpsampling(): boolean
}
