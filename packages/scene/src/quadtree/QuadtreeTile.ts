/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 */

import { type Rectangle, type TilingScheme } from "@webgpu-cesium/core"
import { QuadtreeTileLoadState, type QuadtreeTileLoadStateValue } from "./QuadtreeTileLoadState"
import { TileBoundingRegion } from "./TileBoundingRegion"
import { TileSelectionResult, type TileSelectionResultValue } from "./TileSelectionResult"

/** 挂在瓦片上的地表数据 */
export interface QuadtreeTileData {
  renderable: boolean
}

/**
 * 四叉树节点。子节点顺序：SW / SE / NW / NE。
 */
export class QuadtreeTile {
  level: number
  x: number
  y: number
  rectangle: Rectangle
  parent: QuadtreeTile | undefined
  children: QuadtreeTile[] | undefined
  state: QuadtreeTileLoadStateValue = QuadtreeTileLoadState.START
  selectionResult: TileSelectionResultValue = TileSelectionResult.NONE
  boundingRegion: TileBoundingRegion | undefined
  data: QuadtreeTileData | undefined
  replacementPrevious: QuadtreeTile | undefined
  replacementNext: QuadtreeTile | undefined

  /**
   * @param options 坐标与父节点
   */
  constructor(options: {
    level: number
    x: number
    y: number
    tilingScheme: TilingScheme
    parent?: QuadtreeTile
  }) {
    this.level = options.level
    this.x = options.x
    this.y = options.y
    this.rectangle = options.tilingScheme.tileXYToRectangle(options.x, options.y, options.level)
    this.parent = options.parent
    this.boundingRegion = new TileBoundingRegion(this.rectangle, options.tilingScheme.ellipsoid)
  }

  /**
   * 创建 0 级瓦片。
   *
   * @param tilingScheme 方案
   */
  static createLevelZeroTiles(tilingScheme: TilingScheme): QuadtreeTile[] {
    const xCount = tilingScheme.getNumberOfXTilesAtLevel(0)
    const yCount = tilingScheme.getNumberOfYTilesAtLevel(0)
    const tiles: QuadtreeTile[] = []
    for (let y = 0; y < yCount; y++) {
      for (let x = 0; x < xCount; x++) {
        tiles.push(new QuadtreeTile({ level: 0, x, y, tilingScheme }))
      }
    }
    return tiles
  }

  /**
   * 惰性创建四个子瓦片。
   *
   * @param tilingScheme 方案
   */
  ensureChildren(tilingScheme: TilingScheme): QuadtreeTile[] {
    if (this.children) {
      return this.children
    }
    const level = this.level + 1
    const x = this.x * 2
    const y = this.y * 2
    this.children = [
      new QuadtreeTile({ level, x, y: y + 1, tilingScheme, parent: this }),
      new QuadtreeTile({ level, x: x + 1, y: y + 1, tilingScheme, parent: this }),
      new QuadtreeTile({ level, x, y, tilingScheme, parent: this }),
      new QuadtreeTile({ level, x: x + 1, y, tilingScheme, parent: this }),
    ]
    return this.children
  }

  get southwestChild(): QuadtreeTile | undefined {
    return this.children?.[0]
  }

  get southeastChild(): QuadtreeTile | undefined {
    return this.children?.[1]
  }

  get northwestChild(): QuadtreeTile | undefined {
    return this.children?.[2]
  }

  get northeastChild(): QuadtreeTile | undefined {
    return this.children?.[3]
  }
}
