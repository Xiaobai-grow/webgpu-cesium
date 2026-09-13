/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * M2：仅 NONE 量化（position + uv），BITS12 / 法线 / webMercatorT 留 M3。
 */

import { Cartesian3 } from "./Cartesian3"
import { TerrainQuantization, type TerrainQuantizationValue } from "./TerrainQuantization"

/** 每个顶点的 float 数：x y z u v */
export const TERRAIN_VERTEX_FLOATS = 5
/** 字节步长 */
export const TERRAIN_VERTEX_STRIDE_BYTES = TERRAIN_VERTEX_FLOATS * 4

/**
 * 地形顶点编码描述。对标 Cesium `Core/TerrainEncoding.js` 的 M2 子集。
 */
export class TerrainEncoding {
  quantization: TerrainQuantizationValue
  center: Cartesian3
  stride: number
  hasVertexNormals: boolean
  hasWebMercatorT: boolean
  hasGeodeticSurfaceNormals: boolean

  /**
   * @param center 瓦片中心
   */
  constructor(center?: Cartesian3) {
    this.quantization = TerrainQuantization.NONE
    this.center = center ?? new Cartesian3()
    this.stride = TERRAIN_VERTEX_FLOATS
    this.hasVertexNormals = false
    this.hasWebMercatorT = false
    this.hasGeodeticSurfaceNormals = false
  }

  /** 顶点属性字节偏移 */
  readonly positionOffset = 0

  /** UV 字节偏移 */
  readonly texCoordOffset = 12
}
