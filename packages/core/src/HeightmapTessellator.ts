/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：M2 不生成裙边；高度图按 row-major、西南角为 (0, height-1) 对齐 Cesium。
 */

import { BoundingSphere } from "./BoundingSphere"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { Ellipsoid } from "./Ellipsoid"
import { type Rectangle } from "./Rectangle"
import { TerrainEncoding } from "./TerrainEncoding"
import { TERRAIN_VERTEX_FLOATS } from "./TerrainEncoding"
import { TerrainMesh } from "./TerrainMesh"

/** 细分选项 */
export interface HeightmapTessellatorOptions {
  heightmap: ArrayLike<number>
  width: number
  height: number
  rectangle: Rectangle
  ellipsoid?: Ellipsoid
  relativeToCenter?: Cartesian3
  skirtHeight?: number
  exaggeration?: number
  nativeHeightmap?: boolean
}

const cartographicScratch = new Cartographic()
const cartesianScratch = new Cartesian3()

/**
 * 从高度图生成椭球网格。对标 Cesium `Core/HeightmapTessellator.js`。
 *
 * 顶点布局：相对中心的 position(xyz) + 地理 UV。
 * 16×16 零高度：256 顶点、1350 索引（15×15 四边形 × 2 三角形 × 3）。
 */
export const HeightmapTessellator = {
  /**
   * 计算顶点数（不含裙边）。
   *
   * @param width 列数
   * @param height 行数
   */
  vertexCount(width: number, height: number): number {
    return width * height
  },

  /**
   * 计算索引数（不含裙边）。
   *
   * @param width 列数
   * @param height 行数
   */
  indexCount(width: number, height: number): number {
    return (width - 1) * (height - 1) * 6
  },

  /**
   * 生成网格。
   *
   * @param options 高度图与矩形
   */
  computeVertices(options: HeightmapTessellatorOptions): TerrainMesh {
    const width = options.width
    const height = options.height
    const rectangle = options.rectangle
    const ellipsoid = options.ellipsoid ?? Ellipsoid.default
    const heightmap = options.heightmap
    const exaggeration = options.exaggeration ?? 1.0

    const vertexCount = HeightmapTessellator.vertexCount(width, height)
    const indexCount = HeightmapTessellator.indexCount(width, height)
    const vertices = new Float32Array(vertexCount * TERRAIN_VERTEX_FLOATS)
    const indices = new Uint16Array(indexCount)

    const west = rectangle.west
    const lonSpan = rectangle.width
    const latSpan = rectangle.height

    let minHeight = Number.POSITIVE_INFINITY
    let maxHeight = Number.NEGATIVE_INFINITY
    const positions: Cartesian3[] = []

    for (let row = 0; row < height; row++) {
      // Cesium：row 0 为北
      const v = height === 1 ? 0.5 : row / (height - 1)
      const latitude = rectangle.north - latSpan * v
      for (let col = 0; col < width; col++) {
        const u = width === 1 ? 0.5 : col / (width - 1)
        const longitude = west + lonSpan * u
        const sample = heightmap[row * width + col] ?? 0
        const altitude = sample * exaggeration
        minHeight = Math.min(minHeight, altitude)
        maxHeight = Math.max(maxHeight, altitude)
        cartographicScratch.longitude = longitude
        cartographicScratch.latitude = latitude
        cartographicScratch.height = altitude
        const world = ellipsoid.cartographicToCartesian(cartographicScratch, cartesianScratch)
        positions.push(Cartesian3.clone(world, new Cartesian3()))
      }
    }

    const computedCenter = BoundingSphere.fromPoints(positions).center
    const center = options.relativeToCenter ?? Cartesian3.clone(computedCenter, new Cartesian3())

    for (let i = 0; i < vertexCount; i++) {
      const world = positions[i]!
      const col = i % width
      const row = (i / width) | 0
      const u = width === 1 ? 0.5 : col / (width - 1)
      const v = height === 1 ? 0.5 : row / (height - 1)
      const base = i * TERRAIN_VERTEX_FLOATS
      vertices[base] = world.x - center.x
      vertices[base + 1] = world.y - center.y
      vertices[base + 2] = world.z - center.z
      vertices[base + 3] = u
      vertices[base + 4] = v
    }

    // 三角形：a → c → b（先南后东），使 east×south 的叉积朝外
    let offset = 0
    for (let row = 0; row < height - 1; row++) {
      for (let col = 0; col < width - 1; col++) {
        const a = row * width + col
        const b = a + 1
        const c = a + width
        const d = c + 1
        indices[offset++] = a
        indices[offset++] = c
        indices[offset++] = b
        indices[offset++] = b
        indices[offset++] = c
        indices[offset++] = d
      }
    }

    const westIndices: number[] = []
    const eastIndices: number[] = []
    const northIndices: number[] = []
    const southIndices: number[] = []
    for (let row = height - 1; row >= 0; row--) {
      westIndices.push(row * width)
    }
    for (let row = 0; row < height; row++) {
      eastIndices.push(row * width + (width - 1))
    }
    for (let col = 0; col < width; col++) {
      northIndices.push(col)
    }
    for (let col = width - 1; col >= 0; col--) {
      southIndices.push((height - 1) * width + col)
    }

    const sphere = BoundingSphere.fromPoints(positions)
    const encoding = new TerrainEncoding(center)
    return new TerrainMesh(
      center,
      vertices,
      indices,
      indexCount,
      vertexCount,
      Number.isFinite(minHeight) ? minHeight : 0,
      Number.isFinite(maxHeight) ? maxHeight : 0,
      { center: sphere.center, radius: sphere.radius },
      undefined,
      encoding,
      westIndices,
      southIndices,
      eastIndices,
      northIndices,
    )
  },
}
