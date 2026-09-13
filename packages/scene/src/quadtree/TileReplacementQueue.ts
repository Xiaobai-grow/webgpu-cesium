/**
 * LRU 瓦片替换队列。
 */
import type { QuadtreeTile } from "./QuadtreeTile"

/**
 * 双向链表 LRU。
 */
export class TileReplacementQueue {
  head: QuadtreeTile | undefined
  tail: QuadtreeTile | undefined
  count = 0
  maximumCount = 256

  /**
   * 标记为最近使用。
   *
   * @param tile 瓦片
   */
  markTileRendered(tile: QuadtreeTile): void {
    if (this.head === tile) {
      return
    }
    this.remove(tile)
    tile.replacementPrevious = undefined
    tile.replacementNext = this.head
    if (this.head) {
      this.head.replacementPrevious = tile
    }
    this.head = tile
    this.tail ??= tile
    this.count++
  }

  /**
   * 从链表移除。
   *
   * @param tile 瓦片
   */
  remove(tile: QuadtreeTile): void {
    const previous = tile.replacementPrevious
    const next = tile.replacementNext
    if (previous === undefined && next === undefined && this.head !== tile) {
      return
    }
    if (previous) {
      previous.replacementNext = next
    } else {
      this.head = next
    }
    if (next) {
      next.replacementPrevious = previous
    } else {
      this.tail = previous
    }
    tile.replacementPrevious = undefined
    tile.replacementNext = undefined
    this.count--
  }

  /**
   * 卸载超出上限的旧瓦片。
   *
   * @param unload 卸载回调
   */
  trimTiles(unload: (tile: QuadtreeTile) => void): void {
    let tile = this.tail
    while (tile && this.count > this.maximumCount) {
      const previous = tile.replacementPrevious
      unload(tile)
      this.remove(tile)
      tile = previous
    }
  }
}
