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

import { Ellipsoid } from "./Ellipsoid"
import { HeightmapTessellator, type HeightmapTessellatorOptions } from "./HeightmapTessellator"
import { Rectangle } from "./Rectangle"
import type { TerrainMesh } from "./TerrainMesh"

/** Worker 可传输的高度图参数 */
export interface CreateVerticesFromHeightmapInput {
  heightmap: number[] | Uint8Array
  width: number
  height: number
  west: number
  south: number
  east: number
  north: number
  ellipsoidRadii?: [number, number, number]
  exaggeration?: number
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
