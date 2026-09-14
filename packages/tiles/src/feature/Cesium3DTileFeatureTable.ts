/**
 * 批表 / 要素表。对标 Cesium `Cesium3DTileBatchTable` 数据部分。
 */
import { Cesium3DTileFeature } from "./Cesium3DTileFeature"
import type { Cesium3DTile } from "../tileset/Cesium3DTile"

/**
 * 从 batchTable JSON 建要素。
 *
 * @param tile 瓦片
 * @param batchTable 批表
 * @param count 要素数
 */
export function featuresFromBatchTable(
  tile: Cesium3DTile,
  batchTable: Record<string, unknown>,
  count: number,
): Cesium3DTileFeature[] {
  const features: Cesium3DTileFeature[] = []
  const keys = Object.keys(batchTable).filter((key) => key !== "HIERARCHY" && key !== "extensions")
  const length = Math.max(count, inferredLength(batchTable, keys))
  for (let i = 0; i < length; i++) {
    const properties: Record<string, unknown> = {}
    for (const key of keys) {
      const column = batchTable[key]
      if (Array.isArray(column)) {
        properties[key] = column[i]
      }
    }
    features.push(new Cesium3DTileFeature(tile, i, properties))
  }
  return features
}

function inferredLength(batchTable: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const column = batchTable[key]
    if (Array.isArray(column)) {
      return column.length
    }
  }
  return 0
}
