/**
 * Globe.getHeight / pick 的纯逻辑：从四叉树瓦片插值或射线求交。
 */
import {
  BoundingSphere,
  Cartesian3,
  type Cartographic,
  IntersectionTests,
  type Ray,
  Rectangle,
  TerrainPicker,
  VerticalExaggeration,
} from "@webgpu-cesium/core"
import type { QuadtreeTile } from "../quadtree/QuadtreeTile"
import type { GlobeSurfaceTile } from "./GlobeSurfaceTile"

const hitScratch = new Cartesian3()

/**
 * 从根瓦片走到包含该点、且有 terrainData 的最细节点。
 *
 * @param roots 0 级瓦片
 * @param cartographic 经纬
 */
export function findFinestTerrainTile(
  roots: readonly QuadtreeTile[],
  cartographic: Cartographic,
): QuadtreeTile | undefined {
  let best: QuadtreeTile | undefined
  const stack = [...roots]
  while (stack.length > 0) {
    const tile = stack.pop()
    if (!tile || !Rectangle.contains(tile.rectangle, cartographic)) {
      continue
    }
    const surface = tile.data as GlobeSurfaceTile | undefined
    if (surface?.terrainData) {
      best = tile
    }
    if (tile.children) {
      stack.push(...tile.children)
    }
  }
  return best
}

/**
 * 插值地形高（米，已含垂直夸张）。无数据返回 undefined。
 *
 * @param roots 0 级瓦片
 * @param cartographic 经纬
 * @param exaggeration 垂直夸张
 * @param relativeHeight 相对高度
 */
export function getHeightFromTiles(
  roots: readonly QuadtreeTile[],
  cartographic: Cartographic,
  exaggeration = 1,
  relativeHeight = 0,
): number | undefined {
  let tile = findFinestTerrainTile(roots, cartographic)
  while (tile) {
    const surface = tile.data as GlobeSurfaceTile | undefined
    const raw = surface?.terrainData?.interpolateHeight(
      tile.rectangle,
      cartographic.longitude,
      cartographic.latitude,
    )
    if (raw !== undefined) {
      return VerticalExaggeration.getHeight(raw, exaggeration, relativeHeight)
    }
    tile = tile.parent
  }
  return undefined
}

/**
 * 射线与已渲染瓦片网格求交。
 *
 * @param tiles 本帧选中瓦片
 * @param ray 世界射线
 * @param result 可选结果
 */
export function pickFromTiles(
  tiles: readonly QuadtreeTile[],
  ray: Ray,
  result?: Cartesian3,
): Cartesian3 | undefined {
  let nearestT = Number.POSITIVE_INFINITY
  let found = false
  const closest = result ?? new Cartesian3()
  for (const tile of tiles) {
    const surface = tile.data as GlobeSurfaceTile | undefined
    const mesh = surface?.mesh
    if (!mesh) {
      continue
    }
    const sphere =
      tile.boundingRegion?.boundingSphere ??
      new BoundingSphere(mesh.boundingSphere3D.center, mesh.boundingSphere3D.radius)
    if (IntersectionTests.raySphere(ray, sphere) === undefined) {
      continue
    }
    const hit = TerrainPicker.pick(mesh, ray, true, hitScratch)
    if (hit === undefined) {
      continue
    }
    const t = Cartesian3.distance(ray.origin, hit)
    if (t < nearestT) {
      nearestT = t
      Cartesian3.clone(hit, closest)
      found = true
    }
  }
  if (!found) {
    return undefined
  }
  return closest
}
