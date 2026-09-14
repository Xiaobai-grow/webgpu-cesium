/**
 * Google Photorealistic 3D Tiles（ion 资产 2275207）。
 */
import { Cesium3DTileset, type Cesium3DTilesetOptions } from "../tileset/Cesium3DTileset"

/** Cesium ion 上的 Google Photorealistic 资产 */
export const GOOGLE_PHOTOREALISTIC_ION_ASSET_ID = 2275207

/**
 * 创建 Google Photorealistic tileset。需要 Ion.defaultAccessToken。
 *
 * @param options 选项
 */
export async function createGooglePhotorealistic3DTileset(
  options: Omit<Cesium3DTilesetOptions, "url"> = {},
): Promise<Cesium3DTileset> {
  return Cesium3DTileset.fromIonAssetId(GOOGLE_PHOTOREALISTIC_ION_ASSET_ID, options)
}
