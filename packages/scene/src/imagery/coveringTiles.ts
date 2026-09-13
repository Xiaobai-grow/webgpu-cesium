/**
 * 计算覆盖某经纬矩形的影像瓦片坐标。
 */
import { Rectangle, type TilingScheme } from "@webgpu-cesium/core"

/**
 * 指定 LOD 下覆盖矩形的瓦片列表（含边界）。
 *
 * @param tilingScheme 影像方案
 * @param rectangle 地形矩形
 * @param level LOD
 */
export function coveringTiles(
  tilingScheme: TilingScheme,
  rectangle: Rectangle,
  level: number,
): { x: number; y: number }[] {
  const corners = [
    Rectangle.southwest(rectangle),
    Rectangle.southeast(rectangle),
    Rectangle.northeast(rectangle),
    Rectangle.northwest(rectangle),
    Rectangle.center(rectangle),
  ]
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const corner of corners) {
    const xy = tilingScheme.positionToTileXY(corner, level)
    if (!xy) {
      continue
    }
    minX = Math.min(minX, xy.x)
    maxX = Math.max(maxX, xy.x)
    minY = Math.min(minY, xy.y)
    maxY = Math.max(maxY, xy.y)
  }
  if (!Number.isFinite(minX)) {
    return []
  }
  const xTiles = tilingScheme.getNumberOfXTilesAtLevel(level)
  const yTiles = tilingScheme.getNumberOfYTilesAtLevel(level)
  minX = Math.max(0, minX)
  maxX = Math.min(xTiles - 1, maxX)
  minY = Math.max(0, minY)
  maxY = Math.min(yTiles - 1, maxY)
  const tiles: { x: number; y: number }[] = []
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      tiles.push({ x, y })
    }
  }
  return tiles
}
