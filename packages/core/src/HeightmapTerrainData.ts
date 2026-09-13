/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import {
  deserializeTerrainMesh,
  type CreateVerticesFromHeightmapInput,
  type CreateVerticesFromHeightmapOutput,
} from "./createVerticesFromHeightmap"
import { DeveloperError } from "./DeveloperError"
import { HeightmapEncoding, type HeightmapEncodingValue } from "./HeightmapEncoding"
import { HeightmapTessellator } from "./HeightmapTessellator"
import {
  interpolateHeightmapSample,
  isHeightmapChildAvailable,
  resolveHeightmapStructure,
  setEncodedHeight,
  type HeightmapStructure,
} from "./heightmapStructure"
import { Rectangle } from "./Rectangle"
import { TerrainData, type TerrainDataCreateMeshOptions } from "./TerrainData"
import type { TerrainMesh } from "./TerrainMesh"
import { getHeightmapTaskProcessor } from "./terrainTaskProcessors"
import type { TilingScheme } from "./TilingScheme"

/** 高度图地形数据选项 */
export interface HeightmapTerrainDataOptions {
  buffer: ArrayLike<number>
  width: number
  height: number
  childTileMask?: number
  structure?: Partial<HeightmapStructure>
  waterMask?: Uint8Array
  createdByUpsampling?: boolean
  encoding?: HeightmapEncodingValue
}

/**
 * 高度图地形数据。对标 Cesium `Core/HeightmapTerrainData.js`。
 */
export class HeightmapTerrainData extends TerrainData {
  childTileMask: number
  waterMask: Uint8Array | undefined
  readonly width: number
  readonly height: number
  readonly buffer: ArrayLike<number>
  readonly encoding: HeightmapEncodingValue
  readonly structure: HeightmapStructure
  private readonly _createdByUpsampling: boolean
  private _mesh: TerrainMesh | undefined

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
    this.structure = resolveHeightmapStructure(options.structure)
    this._createdByUpsampling = options.createdByUpsampling ?? false
  }

  /**
   * 细分高度图为网格。
   *
   * @param options 瓦片坐标
   */
  createMesh(options: TerrainDataCreateMeshOptions): Promise<TerrainMesh> {
    if (this._mesh) {
      return Promise.resolve(this._mesh)
    }
    const rectangle = options.tilingScheme.tileXYToRectangle(
      options.x,
      options.y,
      options.level,
      new Rectangle(),
    )
    const exaggeration = options.exaggeration ?? 1.0
    const exaggerationRelativeHeight = options.exaggerationRelativeHeight ?? 0.0
    const skirtHeight = options.skirtHeight ?? 0.0
    const processor = getHeightmapTaskProcessor()
    if (processor !== undefined && options.throttle !== false) {
      const radii = options.tilingScheme.ellipsoid.radii
      const input: CreateVerticesFromHeightmapInput = {
        heightmap: copyHeightmapForWorker(this.buffer),
        width: this.width,
        height: this.height,
        west: rectangle.west,
        south: rectangle.south,
        east: rectangle.east,
        north: rectangle.north,
        ellipsoidRadii: [radii.x, radii.y, radii.z],
        exaggeration,
        exaggerationRelativeHeight,
        skirtHeight,
        structure: this.structure,
      }
      const scheduled = processor.scheduleTask(input)
      if (scheduled !== undefined) {
        return scheduled.then((output) => {
          const mesh = deserializeTerrainMesh(output as CreateVerticesFromHeightmapOutput)
          this._mesh = mesh
          return mesh
        })
      }
    }
    const mesh = HeightmapTessellator.computeVertices({
      heightmap: this.buffer,
      width: this.width,
      height: this.height,
      rectangle,
      ellipsoid: options.tilingScheme.ellipsoid,
      exaggeration,
      exaggerationRelativeHeight,
      skirtHeight,
      structure: this.structure,
    })
    this._mesh = mesh
    return Promise.resolve(mesh)
  }

  /**
   * 双线性插值高度。LERC 未解码且无网格时返回 undefined。
   *
   * @param rectangle 瓦片矩形
   * @param longitude 经度
   * @param latitude 纬度
   */
  interpolateHeight(rectangle: Rectangle, longitude: number, latitude: number): number | undefined {
    if (this.encoding === HeightmapEncoding.LERC && this._mesh === undefined) {
      return undefined
    }
    return interpolateHeightmapSample(
      this.buffer,
      this.structure,
      rectangle,
      this.width,
      this.height,
      longitude,
      latitude,
    )
  }

  /**
   * 上采样给直接子瓦片。
   *
   * @param tilingScheme 方案
   * @param thisX 本列
   * @param thisY 本行
   * @param thisLevel 本 LOD
   * @param descendantX 子列
   * @param descendantY 子行
   * @param descendantLevel 子 LOD
   */
  override upsample(
    tilingScheme: TilingScheme,
    thisX: number,
    thisY: number,
    thisLevel: number,
    descendantX: number,
    descendantY: number,
    descendantLevel: number,
  ): Promise<TerrainData> | undefined {
    const levelDifference = descendantLevel - thisLevel
    if (levelDifference > 1) {
      throw new DeveloperError(
        "Upsampling through more than one level at a time is not currently supported.",
      )
    }
    const width = this.width
    const height = this.height
    const sourceRectangle = tilingScheme.tileXYToRectangle(thisX, thisY, thisLevel)
    const destinationRectangle = tilingScheme.tileXYToRectangle(
      descendantX,
      descendantY,
      descendantLevel,
    )
    const stride = this.structure.stride
    const heights = new Float32Array(width * height * stride)

    for (let j = 0; j < height; ++j) {
      const latitude =
        destinationRectangle.north -
        (destinationRectangle.north - destinationRectangle.south) * (j / Math.max(height - 1, 1))
      for (let i = 0; i < width; ++i) {
        const longitude =
          destinationRectangle.west +
          (destinationRectangle.east - destinationRectangle.west) * (i / Math.max(width - 1, 1))
        const sample = this.interpolateHeight(sourceRectangle, longitude, latitude) ?? 0
        const encoded = (sample - this.structure.heightOffset) / this.structure.heightScale
        const lowest = this.structure.lowestEncodedHeight
        const highest = this.structure.highestEncodedHeight
        let clamped = encoded
        if (lowest !== undefined) {
          clamped = Math.max(clamped, lowest)
        }
        if (highest !== undefined) {
          clamped = Math.min(clamped, highest)
        }
        setEncodedHeight(heights, this.structure, j * width + i, clamped)
      }
    }

    return Promise.resolve(
      new HeightmapTerrainData({
        buffer: heights,
        width,
        height,
        childTileMask: 0,
        structure: this.structure,
        createdByUpsampling: true,
      }),
    )
  }

  /**
   * 子瓦片是否可用。
   *
   * @param thisX 本列
   * @param thisY 本行
   * @param childX 子列
   * @param childY 子行
   */
  isChildAvailable(thisX: number, thisY: number, childX: number, childY: number): boolean {
    return isHeightmapChildAvailable(this.childTileMask, thisX, thisY, childX, childY)
  }

  wasCreatedByUpsampling(): boolean {
    return this._createdByUpsampling
  }
}

/**
 * 给 Worker 的高度图拷贝（不 transfer 原缓冲）。
 *
 * @param buffer 原高度图
 */
function copyHeightmapForWorker(buffer: ArrayLike<number>): number[] | Uint8Array | Float32Array {
  if (buffer instanceof Float32Array) {
    return new Float32Array(buffer)
  }
  if (buffer instanceof Uint8Array) {
    return new Uint8Array(buffer)
  }
  return Array.from(buffer)
}
