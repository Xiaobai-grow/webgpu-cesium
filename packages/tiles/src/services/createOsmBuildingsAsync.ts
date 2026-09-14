/**
 * Cesium OSM Buildings（ion 资产 96188）。
 */
import { Cesium3DTileset, type Cesium3DTilesetOptions } from "../tileset/Cesium3DTileset"

export const OSM_BUILDINGS_ION_ASSET_ID = 96188

/**
 * 创建 OSM Buildings tileset。需要 Ion.defaultAccessToken。
 *
 * @param options 选项
 */
export async function createOsmBuildingsAsync(
  options: Omit<Cesium3DTilesetOptions, "url"> = {},
): Promise<Cesium3DTileset> {
  return Cesium3DTileset.fromIonAssetId(OSM_BUILDINGS_ION_ASSET_ID, options)
}
