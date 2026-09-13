/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { type Cartesian3 } from "./Cartesian3"
import type { TerrainEncoding } from "./TerrainEncoding"

/**
 * 地形网格（CPU 侧）。对标 Cesium `Core/TerrainMesh.js`。
 *
 * M2 顶点交错：position(x,y,z) + texcoord(u,v)，相对 `center`。
 */
export class TerrainMesh {
  center: Cartesian3
  vertices: Float32Array
  indices: Uint16Array | Uint32Array
  indexCountWithoutSkirts: number
  vertexCountWithoutSkirts: number
  minimumHeight: number
  maximumHeight: number
  boundingSphere3D: { center: Cartesian3; radius: number }
  occludeePointInScaledSpace: Cartesian3 | undefined
  encoding: TerrainEncoding
  westIndicesSouthToNorth: number[]
  southIndicesEastToWest: number[]
  eastIndicesNorthToSouth: number[]
  northIndicesWestToEast: number[]

  /**
   * @param center 瓦片中心（ECEF）
   * @param vertices 交错顶点
   * @param indices 索引
   * @param indexCountWithoutSkirts 不含裙边的索引数
   * @param vertexCountWithoutSkirts 不含裙边的顶点数
   * @param minimumHeight 最小高
   * @param maximumHeight 最大高
   * @param boundingSphere3D 包围球
   * @param occludeePointInScaledSpace 地平线剔除点
   * @param encoding 编码
   * @param westIndicesSouthToNorth 西边索引
   * @param southIndicesEastToWest 南边索引
   * @param eastIndicesNorthToSouth 东边索引
   * @param northIndicesWestToEast 北边索引
   */
  constructor(
    center: Cartesian3,
    vertices: Float32Array,
    indices: Uint16Array | Uint32Array,
    indexCountWithoutSkirts: number,
    vertexCountWithoutSkirts: number,
    minimumHeight: number,
    maximumHeight: number,
    boundingSphere3D: { center: Cartesian3; radius: number },
    occludeePointInScaledSpace: Cartesian3 | undefined,
    encoding: TerrainEncoding,
    westIndicesSouthToNorth: number[],
    southIndicesEastToWest: number[],
    eastIndicesNorthToSouth: number[],
    northIndicesWestToEast: number[],
  ) {
    this.center = center
    this.vertices = vertices
    this.indices = indices
    this.indexCountWithoutSkirts = indexCountWithoutSkirts
    this.vertexCountWithoutSkirts = vertexCountWithoutSkirts
    this.minimumHeight = minimumHeight
    this.maximumHeight = maximumHeight
    this.boundingSphere3D = boundingSphere3D
    this.occludeePointInScaledSpace = occludeePointInScaledSpace
    this.encoding = encoding
    this.westIndicesSouthToNorth = westIndicesSouthToNorth
    this.southIndicesEastToWest = southIndicesEastToWest
    this.eastIndicesNorthToSouth = eastIndicesNorthToSouth
    this.northIndicesWestToEast = northIndicesWestToEast
  }
}
