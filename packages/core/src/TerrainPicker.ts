/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：不做增量 BVH，对当前网格做射线–三角形遍历（M3 瓦片顶点数可接受）。
 */

import { Cartesian3 } from "./Cartesian3"
import { IntersectionTests } from "./IntersectionTests"
import type { Ray } from "./Ray"
import { TERRAIN_VERTEX_FLOATS } from "./TerrainEncoding"
import type { TerrainMesh } from "./TerrainMesh"

const p0 = new Cartesian3()
const p1 = new Cartesian3()
const p2 = new Cartesian3()
const hitScratch = new Cartesian3()

function readWorld(mesh: TerrainMesh, index: number, result: Cartesian3): Cartesian3 {
  const base = index * TERRAIN_VERTEX_FLOATS
  result.x = (mesh.vertices[base] ?? 0) + mesh.center.x
  result.y = (mesh.vertices[base + 1] ?? 0) + mesh.center.y
  result.z = (mesh.vertices[base + 2] ?? 0) + mesh.center.z
  return result
}

/**
 * 地形网格拾取。对标 Cesium `Core/TerrainPicker.js` 的求交语义。
 */
export const TerrainPicker = {
  /**
   * 射线与网格求交，返回最近交点。
   *
   * @param mesh 网格
   * @param ray 世界射线
   * @param cullBackFaces 是否剔除背面
   * @param result 可选结果
   */
  pick(
    mesh: TerrainMesh,
    ray: Ray,
    cullBackFaces = true,
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    const indices = mesh.indices
    let nearestT = Number.POSITIVE_INFINITY
    let found = false
    for (let i = 0; i < indices.length; i += 3) {
      readWorld(mesh, indices[i] ?? 0, p0)
      readWorld(mesh, indices[i + 1] ?? 0, p1)
      readWorld(mesh, indices[i + 2] ?? 0, p2)
      const hit = IntersectionTests.rayTriangle(ray, p0, p1, p2, cullBackFaces, hitScratch)
      if (hit === undefined) {
        continue
      }
      const t = Cartesian3.distance(ray.origin, hit)
      if (t < nearestT) {
        nearestT = t
        Cartesian3.clone(hit, result ?? hitScratch)
        found = true
      }
    }
    if (!found) {
      return undefined
    }
    return result ?? Cartesian3.clone(hitScratch, new Cartesian3())
  },
}
