/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * M3：可选裙边；高度按 HeightmapStructure 解码后再做垂直夸张。
 */

import { BoundingSphere } from "./BoundingSphere"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { Ellipsoid } from "./Ellipsoid"
import {
  DEFAULT_HEIGHTMAP_STRUCTURE,
  getEncodedHeight,
  type HeightmapStructure,
  resolveHeightmapStructure,
} from "./heightmapStructure"
import { type Rectangle } from "./Rectangle"
import { TerrainEncoding } from "./TerrainEncoding"
import { TERRAIN_VERTEX_FLOATS } from "./TerrainEncoding"
import { TerrainMesh } from "./TerrainMesh"
import { VerticalExaggeration } from "./VerticalExaggeration"

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
  exaggerationRelativeHeight?: number
  structure?: Partial<HeightmapStructure>
  nativeHeightmap?: boolean
}

const cartographicScratch = new Cartographic()
const cartesianScratch = new Cartesian3()

function writeVertex(
  vertices: Float32Array,
  index: number,
  world: Cartesian3,
  center: Cartesian3,
  u: number,
  v: number,
): void {
  const base = index * TERRAIN_VERTEX_FLOATS
  vertices[base] = world.x - center.x
  vertices[base + 1] = world.y - center.y
  vertices[base + 2] = world.z - center.z
  vertices[base + 3] = u
  vertices[base + 4] = v
}

function cartesianFromSample(
  ellipsoid: Ellipsoid,
  longitude: number,
  latitude: number,
  altitude: number,
): Cartesian3 {
  cartographicScratch.longitude = longitude
  cartographicScratch.latitude = latitude
  cartographicScratch.height = altitude
  return Cartesian3.clone(
    ellipsoid.cartographicToCartesian(cartographicScratch, cartesianScratch),
    new Cartesian3(),
  )
}

/**
 * 从高度图生成椭球网格。对标 Cesium `Core/HeightmapTessellator.js`。
 *
 * 顶点布局：相对中心的 position(xyz) + 地理 UV。
 * 16×16 零高度、无裙边：256 顶点、1350 索引。
 */
export const HeightmapTessellator = {
  DEFAULT_STRUCTURE: DEFAULT_HEIGHTMAP_STRUCTURE,

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
    const structure = resolveHeightmapStructure(options.structure)
    const exaggeration = options.exaggeration ?? 1.0
    const exaggerationRelativeHeight = options.exaggerationRelativeHeight ?? 0.0
    const skirtHeight = options.skirtHeight ?? 0.0
    const hasSkirts = skirtHeight > 0

    const vertexCountWithoutSkirts = HeightmapTessellator.vertexCount(width, height)
    const indexCountWithoutSkirts = HeightmapTessellator.indexCount(width, height)
    const skirtVertexCount = hasSkirts ? 2 * (width + height) : 0
    const skirtIndexCount = hasSkirts ? (2 * (width + height) - 4) * 6 : 0
    const vertexCount = vertexCountWithoutSkirts + skirtVertexCount
    const vertices = new Float32Array(vertexCount * TERRAIN_VERTEX_FLOATS)
    const indices = new Uint16Array(indexCountWithoutSkirts + skirtIndexCount)

    const west = rectangle.west
    const lonSpan = rectangle.width
    const latSpan = rectangle.height

    let minHeight = Number.POSITIVE_INFINITY
    let maxHeight = Number.NEGATIVE_INFINITY
    const positions: Cartesian3[] = []
    const altitudes: number[] = []

    for (let row = 0; row < height; row++) {
      // Cesium：row 0 为北
      const v = height === 1 ? 0.5 : row / (height - 1)
      const latitude = rectangle.north - latSpan * v
      for (let col = 0; col < width; col++) {
        const u = width === 1 ? 0.5 : col / (width - 1)
        const longitude = west + lonSpan * u
        const encoded = getEncodedHeight(heightmap, structure, row * width + col)
        const raw = encoded * structure.heightScale + structure.heightOffset
        const altitude = VerticalExaggeration.getHeight(
          raw,
          exaggeration,
          exaggerationRelativeHeight,
        )
        minHeight = Math.min(minHeight, altitude)
        maxHeight = Math.max(maxHeight, altitude)
        const world = cartesianFromSample(ellipsoid, longitude, latitude, altitude)
        positions.push(world)
        altitudes.push(altitude)
      }
    }

    const computedCenter = BoundingSphere.fromPoints(positions).center
    const center = options.relativeToCenter ?? Cartesian3.clone(computedCenter, new Cartesian3())

    for (let i = 0; i < vertexCountWithoutSkirts; i++) {
      const world = positions[i]!
      const col = i % width
      const row = (i / width) | 0
      const u = width === 1 ? 0.5 : col / (width - 1)
      const v = height === 1 ? 0.5 : row / (height - 1)
      writeVertex(vertices, i, world, center, u, v)
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

    if (hasSkirts) {
      const edges = [westIndices, southIndices, eastIndices, northIndices]
      let skirtVertex = vertexCountWithoutSkirts
      const addSkirt = (edge: number[]): void => {
        const firstSkirt = skirtVertex
        for (let i = 0; i < edge.length; i++) {
          const src = edge[i]!
          const col = src % width
          const row = (src / width) | 0
          const u = width === 1 ? 0.5 : col / (width - 1)
          const v = height === 1 ? 0.5 : row / (height - 1)
          const longitude = west + lonSpan * u
          const latitude = rectangle.north - latSpan * v
          const altitude = (altitudes[src] ?? 0) - skirtHeight
          minHeight = Math.min(minHeight, altitude)
          const world = cartesianFromSample(ellipsoid, longitude, latitude, altitude)
          positions.push(world)
          writeVertex(vertices, skirtVertex, world, center, u, v)
          skirtVertex++
        }
        for (let i = 0; i < edge.length - 1; i++) {
          const a = edge[i]!
          const b = edge[i + 1]!
          const sa = firstSkirt + i
          const sb = firstSkirt + i + 1
          indices[offset++] = a
          indices[offset++] = sa
          indices[offset++] = b
          indices[offset++] = b
          indices[offset++] = sa
          indices[offset++] = sb
        }
      }
      for (const edge of edges) {
        addSkirt(edge)
      }
    }

    const sphere = BoundingSphere.fromPoints(positions)
    const encoding = new TerrainEncoding(center)
    return new TerrainMesh(
      center,
      vertices,
      indices,
      indexCountWithoutSkirts,
      vertexCountWithoutSkirts,
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
