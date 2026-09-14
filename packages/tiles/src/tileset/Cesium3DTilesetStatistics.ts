/**
 * 3D Tiles 统计。对标 Cesium `Cesium3DTilesetStatistics`。
 */
export class Cesium3DTilesetStatistics {
  numberOfTilesSelected = 0
  numberOfTilesWithContentReady = 0
  numberOfPendingRequests = 0
  numberOfTilesProcessing = 0
  geometryByteLength = 0
  texturesByteLength = 0
  selectedTileCount = 0

  reset(): void {
    this.numberOfTilesSelected = 0
    this.numberOfPendingRequests = 0
    this.selectedTileCount = 0
  }
}
