/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { HeightmapEncoding, type HeightmapEncodingValue } from "./HeightmapEncoding"
import { HeightmapTessellator } from "./HeightmapTessellator"
import { Rectangle } from "./Rectangle"
import { TerrainData, type TerrainDataCreateMeshOptions } from "./TerrainData"
import type { TerrainMesh } from "./TerrainMesh"

/** 高度图地形数据选项 */
export interface HeightmapTerrainDataOptions {
  buffer: ArrayLike<number>
  width: number
  height: number
  childTileMask?: number
  structure?: {
    heightScale?: number
    heightOffset?: number
    elementsPerHeight?: number
    stride?: number
    elementMultiplier?: number
    isBigEndian?: boolean
  }
  waterMask?: Uint8Array
  createdByUpsampling?: boolean
  encoding?: HeightmapEncodingValue
}

/**
 * 高度图地形数据。对标 Cesium `Core/HeightmapTerrainData.js`（M2 零高度路径）。
 */
export class HeightmapTerrainData extends TerrainData {
  childTileMask: number
  waterMask: Uint8Array | undefined
  readonly width: number
  readonly height: number
  readonly buffer: ArrayLike<number>
  readonly encoding: HeightmapEncodingValue
  private readonly _createdByUpsampling: boolean

  /**
   * @param options 高度图缓冲与尺寸
   */
  constructor(options: HeightmapTerrainDataOptions) {
    super()
    this.buffer = options.buffer
    this.width = options.width
    this.height = options.height
    this.childTileMask = options.childTileMask ?? 15
    this.waterMask = options.waterMask
    this.encoding = options.encoding ?? HeightmapEncoding.NONE
    this._createdByUpsampling = options.createdByUpsampling ?? false
  }

  /**
   * 细分高度图为网格。
   *
   * @param options 瓦片坐标
   */
  createMesh(options: TerrainDataCreateMeshOptions): Promise<TerrainMesh> {
    const rectangle = options.tilingScheme.tileXYToRectangle(
      options.x,
      options.y,
      options.level,
      new Rectangle(),
    )
    const mesh = HeightmapTessellator.computeVertices({
      heightmap: this.buffer,
      width: this.width,
      height: this.height,
      rectangle,
      ellipsoid: options.tilingScheme.ellipsoid,
      exaggeration: options.exaggeration ?? 1.0,
    })
    return Promise.resolve(mesh)
  }

  /**
   * 子瓦片是否可用（椭球恒为 true）。
   */
  isChildAvailable(_thisX: number, _thisY: number, _childX: number, _childY: number): boolean {
    return true
  }

  wasCreatedByUpsampling(): boolean {
    return this._createdByUpsampling
  }
}
