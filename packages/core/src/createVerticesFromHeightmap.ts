/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * Worker 入口：由 TaskProcessor 或同步调用。M2 默认走同步（见 HeightmapTerrainData.createMesh）。
 */

import { BoundingSphere } from "./BoundingSphere"
import { Cartesian3 } from "./Cartesian3"
import { Ellipsoid } from "./Ellipsoid"
import { HeightmapTessellator, type HeightmapTessellatorOptions } from "./HeightmapTessellator"
import type { HeightmapStructure } from "./heightmapStructure"
import { Rectangle } from "./Rectangle"
import { TerrainEncoding, TERRAIN_VERTEX_FLOATS } from "./TerrainEncoding"
import { TerrainMesh } from "./TerrainMesh"

/** Worker 可传输的高度图参数 */
export interface CreateVerticesFromHeightmapInput {
  heightmap: number[] | Uint8Array | Float32Array
  width: number
  height: number
  west: number
  south: number
  east: number
  north: number
  ellipsoidRadii?: [number, number, number]
  exaggeration?: number
  exaggerationRelativeHeight?: number
  skirtHeight?: number
  structure?: Partial<HeightmapStructure>
}

/** Worker 可传输的网格结果 */
export interface CreateVerticesFromHeightmapOutput {
  vertices: Float32Array
  indices: Uint16Array
  center: [number, number, number]
  vertexCount: number
  indexCount: number
  minimumHeight: number
  maximumHeight: number
}

/**
 * 从可传输参数生成网格（Worker / 同步共用）。
 *
 * @param input 高度图与矩形
 */
export function createVerticesFromHeightmap(
  input: CreateVerticesFromHeightmapInput,
): CreateVerticesFromHeightmapOutput {
  const radii = input.ellipsoidRadii
  const ellipsoid = radii ? new Ellipsoid(radii[0], radii[1], radii[2]) : Ellipsoid.WGS84
  const options: HeightmapTessellatorOptions = {
    heightmap: input.heightmap,
    width: input.width,
    height: input.height,
    rectangle: new Rectangle(input.west, input.south, input.east, input.north),
    ellipsoid,
  }
  if (input.exaggeration !== undefined) {
    options.exaggeration = input.exaggeration
  }
  if (input.exaggerationRelativeHeight !== undefined) {
    options.exaggerationRelativeHeight = input.exaggerationRelativeHeight
  }
  if (input.skirtHeight !== undefined) {
    options.skirtHeight = input.skirtHeight
  }
  if (input.structure !== undefined) {
    options.structure = input.structure
  }
  const mesh = HeightmapTessellator.computeVertices(options)
  return serializeTerrainMesh(mesh)
}

/**
 * 把 TerrainMesh 压成可 transfer 的 typed array。
 *
 * @param mesh 网格
 */
export function serializeTerrainMesh(mesh: TerrainMesh): CreateVerticesFromHeightmapOutput {
  const indices = mesh.indices instanceof Uint16Array ? mesh.indices : new Uint16Array(mesh.indices)
  return {
    vertices: mesh.vertices,
    indices,
    center: [mesh.center.x, mesh.center.y, mesh.center.z],
    vertexCount: mesh.vertexCountWithoutSkirts,
    indexCount: mesh.indexCountWithoutSkirts,
    minimumHeight: mesh.minimumHeight,
    maximumHeight: mesh.maximumHeight,
  }
}

/**
 * Worker 回传结果还原为 TerrainMesh（边索引留空，渲染不需要）。
 *
 * @param output 可传输网格
 */
export function deserializeTerrainMesh(output: CreateVerticesFromHeightmapOutput): TerrainMesh {
  const center = new Cartesian3(output.center[0], output.center[1], output.center[2])
  let maxR2 = 0
  for (let i = 0; i < output.vertices.length; i += TERRAIN_VERTEX_FLOATS) {
    const x = output.vertices[i] ?? 0
    const y = output.vertices[i + 1] ?? 0
    const z = output.vertices[i + 2] ?? 0
    maxR2 = Math.max(maxR2, x * x + y * y + z * z)
  }
  return new TerrainMesh(
    center,
    output.vertices,
    output.indices,
    output.indexCount,
    output.vertexCount,
    output.minimumHeight,
    output.maximumHeight,
    new BoundingSphere(center, Math.sqrt(maxR2)),
    undefined,
    new TerrainEncoding(center),
    [],
    [],
    [],
    [],
  )
}
