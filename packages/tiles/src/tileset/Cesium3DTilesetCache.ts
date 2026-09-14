/**
 * 简单 LRU：超过 maximumCacheOverflowBytes 时卸载未选中内容。
 */
import type { Cesium3DTile } from "./Cesium3DTile"

export class Cesium3DTilesetCache {
  maximumCacheOverflowBytes = 512 * 1024 * 1024
  private readonly _list: Cesium3DTile[] = []

  /**
   * 访问瓦片（移到队尾）。
   *
   * @param tile 瓦片
   */
  touch(tile: Cesium3DTile): void {
    const index = this._list.indexOf(tile)
    if (index >= 0) {
      this._list.splice(index, 1)
    }
    this._list.push(tile)
  }

  /**
   * 卸载久未使用的内容。
   *
   * @param selected 本帧选中
   * @param usedBytes 已用字节
   */
  unloadUnused(selected: ReadonlySet<Cesium3DTile>, usedBytes: number): void {
    if (usedBytes <= this.maximumCacheOverflowBytes) {
      return
    }
    for (const tile of this._list) {
      if (usedBytes <= this.maximumCacheOverflowBytes * 0.75) {
        break
      }
      if (selected.has(tile)) {
        continue
      }
      usedBytes -= tile.unloadContent()
    }
  }
}
