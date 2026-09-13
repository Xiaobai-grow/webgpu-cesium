/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * Worker / 同步共用：量化网格 → TerrainMesh（NONE 布局 + 裙边）。
 */

import { BoundingSphere } from "./BoundingSphere"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"
import { Ellipsoid } from "./Ellipsoid"
import { Rectangle } from "./Rectangle"
import { TerrainEncoding, TERRAIN_VERTEX_FLOATS } from "./TerrainEncoding"
import { TerrainMesh } from "./TerrainMesh"
import { VerticalExaggeration } from "./VerticalExaggeration"
import { MAX_SHORT } from "./quantizedMesh"

/** Worker 可传输输入 */
export interface CreateVerticesFromQuantizedTerrainMeshInput {
  quantizedVertices: Uint16Array
  indices: Uint16Array | Uint32Array | number[]
  minimumHeight: number
  maximumHeight: number
  west: number
  south: number
  east: number
  north: number
  westIndices: number[]
  southIndices: number[]
  eastIndices: number[]
  northIndices: number[]
  westSkirtHeight: number
  southSkirtHeight: number
  eastSkirtHeight: number
  northSkirtHeight: number
  ellipsoidRadii?: [number, number, number]
  relativeToCenter?: [number, number, number]
  exaggeration?: number
  exaggerationRelativeHeight?: number
}

const cartographicScratch = new Cartographic()
const cartesianScratch = new Cartesian3()

function sortCopy(indices: number[], compare: (a: number, b: number) => number): number[] {
  return indices.slice().sort(compare)
}

/**
 * 量化网格解码为交错顶点。对标 Cesium `Workers/createVerticesFromQuantizedTerrainMesh.js` 的 M3 子集。
 *
 * @param input 量化顶点与边
 */
export function createVerticesFromQuantizedTerrainMesh(
  input: CreateVerticesFromQuantizedTerrainMeshInput,
): TerrainMesh {
  const quantized = input.quantizedVertices
  const vertexCountWithoutSkirts = (quantized.length / 3) | 0
  const uBuffer = quantized.subarray(0, vertexCountWithoutSkirts)
  const vBuffer = quantized.subarray(vertexCountWithoutSkirts, 2 * vertexCountWithoutSkirts)
  const heightBuffer = quantized.subarray(
    2 * vertexCountWithoutSkirts,
    3 * vertexCountWithoutSkirts,
  )
  const radii = input.ellipsoidRadii
  const ellipsoid = radii ? new Ellipsoid(radii[0], radii[1], radii[2]) : Ellipsoid.WGS84
  const rectangle = new Rectangle(input.west, input.south, input.east, input.north)
  const exaggeration = input.exaggeration ?? 1.0
  const exaggerationRelativeHeight = input.exaggerationRelativeHeight ?? 0.0

  const uvs: { u: number; v: number }[] = []
  const heights: number[] = []
  const positions: Cartesian3[] = []
  let minHeight = Number.POSITIVE_INFINITY
  let maxHeight = Number.NEGATIVE_INFINITY

  for (let i = 0; i < vertexCountWithoutSkirts; ++i) {
    const u = (uBuffer[i] ?? 0) / MAX_SHORT
    const v = (vBuffer[i] ?? 0) / MAX_SHORT
    const raw = CesiumMath.lerp(
      input.minimumHeight,
      input.maximumHeight,
      (heightBuffer[i] ?? 0) / MAX_SHORT,
    )
    const height = VerticalExaggeration.getHeight(raw, exaggeration, exaggerationRelativeHeight)
    cartographicScratch.longitude = CesiumMath.lerp(rectangle.west, rectangle.east, u)
    cartographicScratch.latitude = CesiumMath.lerp(rectangle.south, rectangle.north, v)
    cartographicScratch.height = height
    const world = Cartesian3.clone(
      ellipsoid.cartographicToCartesian(cartographicScratch, cartesianScratch),
      new Cartesian3(),
    )
    uvs.push({ u, v })
    heights.push(height)
    positions.push(world)
    minHeight = Math.min(minHeight, height)
    maxHeight = Math.max(maxHeight, height)
  }

  const computedCenter = BoundingSphere.fromPoints(positions).center
  const center =
    input.relativeToCenter !== undefined
      ? new Cartesian3(
          input.relativeToCenter[0],
          input.relativeToCenter[1],
          input.relativeToCenter[2],
        )
      : computedCenter

  const westIndices = sortCopy(input.westIndices, (a, b) => (uvs[a]?.v ?? 0) - (uvs[b]?.v ?? 0))
  const southIndices = sortCopy(input.southIndices, (a, b) => (uvs[b]?.u ?? 0) - (uvs[a]?.u ?? 0))
  const eastIndices = sortCopy(input.eastIndices, (a, b) => (uvs[b]?.v ?? 0) - (uvs[a]?.v ?? 0))
  const northIndices = sortCopy(input.northIndices, (a, b) => (uvs[a]?.u ?? 0) - (uvs[b]?.u ?? 0))

  const skirtGroups = [
    { edge: westIndices, skirt: input.westSkirtHeight },
    { edge: southIndices, skirt: input.southSkirtHeight },
    { edge: eastIndices, skirt: input.eastSkirtHeight },
    { edge: northIndices, skirt: input.northSkirtHeight },
  ]
  const skirtVertexCount = skirtGroups.reduce(
    (sum, group) => sum + (group.skirt > 0 ? group.edge.length : 0),
    0,
  )
  const skirtSegmentCount = skirtGroups.reduce(
    (sum, group) => sum + (group.skirt > 0 ? Math.max(group.edge.length - 1, 0) : 0),
    0,
  )

  const sourceIndices = input.indices
  const indexCountWithoutSkirts = sourceIndices.length
  const vertices = new Float32Array(
    (vertexCountWithoutSkirts + skirtVertexCount) * TERRAIN_VERTEX_FLOATS,
  )
  const indices = new Uint16Array(indexCountWithoutSkirts + skirtSegmentCount * 6)

  for (let i = 0; i < vertexCountWithoutSkirts; i++) {
    const world = positions[i]!
    const uv = uvs[i]!
    const base = i * TERRAIN_VERTEX_FLOATS
    vertices[base] = world.x - center.x
    vertices[base + 1] = world.y - center.y
    vertices[base + 2] = world.z - center.z
    vertices[base + 3] = uv.u
    vertices[base + 4] = uv.v
  }

  for (let i = 0; i < sourceIndices.length; i++) {
    indices[i] = sourceIndices[i] ?? 0
  }

  let vertexCursor = vertexCountWithoutSkirts
  let indexCursor = indexCountWithoutSkirts
  for (const group of skirtGroups) {
    if (group.skirt <= 0 || group.edge.length === 0) {
      continue
    }
    const firstSkirt = vertexCursor
    for (const src of group.edge) {
      const uv = uvs[src]
      const height = (heights[src] ?? 0) - group.skirt
      cartographicScratch.longitude = CesiumMath.lerp(rectangle.west, rectangle.east, uv?.u ?? 0)
      cartographicScratch.latitude = CesiumMath.lerp(rectangle.south, rectangle.north, uv?.v ?? 0)
      cartographicScratch.height = height
      const world = ellipsoid.cartographicToCartesian(cartographicScratch, cartesianScratch)
      const base = vertexCursor * TERRAIN_VERTEX_FLOATS
      vertices[base] = world.x - center.x
      vertices[base + 1] = world.y - center.y
      vertices[base + 2] = world.z - center.z
      vertices[base + 3] = uv?.u ?? 0
      vertices[base + 4] = uv?.v ?? 0
      minHeight = Math.min(minHeight, height)
      vertexCursor++
    }
    for (let i = 0; i < group.edge.length - 1; i++) {
      const a = group.edge[i]!
      const b = group.edge[i + 1]!
      const sa = firstSkirt + i
      const sb = firstSkirt + i + 1
      indices[indexCursor++] = a
      indices[indexCursor++] = sa
      indices[indexCursor++] = b
      indices[indexCursor++] = b
      indices[indexCursor++] = sa
      indices[indexCursor++] = sb
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
    Number.isFinite(minHeight) ? minHeight : input.minimumHeight,
    Number.isFinite(maxHeight) ? maxHeight : input.maximumHeight,
    { center: sphere.center, radius: sphere.radius },
    undefined,
    encoding,
    westIndices,
    southIndices,
    eastIndices,
    northIndices,
  )
}
