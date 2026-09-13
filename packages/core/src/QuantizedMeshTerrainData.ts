/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import type { BoundingSphere } from "./BoundingSphere"
import { Cartesian3 } from "./Cartesian3"
import { CesiumMath } from "./CesiumMath"
import { DeveloperError } from "./DeveloperError"
import { Intersections2D } from "./Intersections2D"
import type { OrientedBoundingBox } from "./OrientedBoundingBox"
import { Rectangle } from "./Rectangle"
import { TerrainData, type TerrainDataCreateMeshOptions } from "./TerrainData"
import type { TerrainMesh } from "./TerrainMesh"
import type { TilingScheme } from "./TilingScheme"
import {
  deserializeTerrainMesh,
  type CreateVerticesFromHeightmapOutput,
} from "./createVerticesFromHeightmap"
import {
  createVerticesFromQuantizedTerrainMesh,
  type CreateVerticesFromQuantizedTerrainMeshInput,
} from "./createVerticesFromQuantizedTerrainMesh"
import { isHeightmapChildAvailable } from "./heightmapStructure"
import { MAX_SHORT } from "./quantizedMesh"
import { getQuantizedMeshTaskProcessor } from "./terrainTaskProcessors"
import { upsampleQuantizedTerrainMesh } from "./upsampleQuantizedTerrainMesh"

/** 量化网格地形数据选项 */
export interface QuantizedMeshTerrainDataOptions {
  quantizedVertices: Uint16Array
  indices: Uint16Array | Uint32Array
  minimumHeight: number
  maximumHeight: number
  boundingSphere: BoundingSphere
  horizonOcclusionPoint: Cartesian3
  westIndices: ArrayLike<number>
  southIndices: ArrayLike<number>
  eastIndices: ArrayLike<number>
  northIndices: ArrayLike<number>
  westSkirtHeight: number
  southSkirtHeight: number
  eastSkirtHeight: number
  northSkirtHeight: number
  childTileMask?: number
  createdByUpsampling?: boolean
  encodedNormals?: Uint8Array
  waterMask?: Uint8Array
  orientedBoundingBox?: OrientedBoundingBox
  center?: Cartesian3
}

const barycentricScratch = new Cartesian3()

function toNumberArray(values: ArrayLike<number>): number[] {
  return Array.from(values)
}

/**
 * quantized-mesh 地形数据。对标 Cesium `Core/QuantizedMeshTerrainData.js`。
 */
export class QuantizedMeshTerrainData extends TerrainData {
  childTileMask: number
  waterMask: Uint8Array | undefined
  readonly encodedNormals: Uint8Array | undefined
  readonly minimumHeight: number
  readonly maximumHeight: number
  readonly boundingSphere: BoundingSphere
  readonly horizonOcclusionPoint: Cartesian3
  readonly orientedBoundingBox: OrientedBoundingBox | undefined
  private _quantizedVertices: Uint16Array
  private _indices: Uint16Array | Uint32Array
  private readonly _uValues: Uint16Array
  private readonly _vValues: Uint16Array
  private readonly _heightValues: Uint16Array
  private readonly _westIndices: number[]
  private readonly _southIndices: number[]
  private readonly _eastIndices: number[]
  private readonly _northIndices: number[]
  private readonly _westSkirtHeight: number
  private readonly _southSkirtHeight: number
  private readonly _eastSkirtHeight: number
  private readonly _northSkirtHeight: number
  private readonly _createdByUpsampling: boolean
  private readonly _center: Cartesian3 | undefined
  private _mesh: TerrainMesh | undefined

  /**
   * @param options 量化顶点与边
   */
  constructor(options: QuantizedMeshTerrainDataOptions) {
    super()
    this._quantizedVertices = options.quantizedVertices
    this._indices = options.indices
    this.minimumHeight = options.minimumHeight
    this.maximumHeight = options.maximumHeight
    this.boundingSphere = options.boundingSphere
    this.horizonOcclusionPoint = options.horizonOcclusionPoint
    this.orientedBoundingBox = options.orientedBoundingBox
    this.encodedNormals = options.encodedNormals
    this.waterMask = options.waterMask
    this.childTileMask = options.childTileMask ?? 15
    this._createdByUpsampling = options.createdByUpsampling ?? false
    this._center = options.center
    this._westSkirtHeight = options.westSkirtHeight
    this._southSkirtHeight = options.southSkirtHeight
    this._eastSkirtHeight = options.eastSkirtHeight
    this._northSkirtHeight = options.northSkirtHeight

    const vertexCount = this._quantizedVertices.length / 3
    this._uValues = this._quantizedVertices.subarray(0, vertexCount)
    this._vValues = this._quantizedVertices.subarray(vertexCount, 2 * vertexCount)
    this._heightValues = this._quantizedVertices.subarray(2 * vertexCount, 3 * vertexCount)
    this._westIndices = toNumberArray(options.westIndices)
    this._southIndices = toNumberArray(options.southIndices)
    this._eastIndices = toNumberArray(options.eastIndices)
    this._northIndices = toNumberArray(options.northIndices)
  }

  /**
   * 解码为网格。
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
    const radii = options.tilingScheme.ellipsoid.radii
    const input: CreateVerticesFromQuantizedTerrainMeshInput = {
      quantizedVertices: this._quantizedVertices,
      indices: this._indices,
      minimumHeight: this.minimumHeight,
      maximumHeight: this.maximumHeight,
      west: rectangle.west,
      south: rectangle.south,
      east: rectangle.east,
      north: rectangle.north,
      westIndices: this._westIndices,
      southIndices: this._southIndices,
      eastIndices: this._eastIndices,
      northIndices: this._northIndices,
      westSkirtHeight: this._westSkirtHeight,
      southSkirtHeight: this._southSkirtHeight,
      eastSkirtHeight: this._eastSkirtHeight,
      northSkirtHeight: this._northSkirtHeight,
      ellipsoidRadii: [radii.x, radii.y, radii.z],
      exaggeration: options.exaggeration ?? 1.0,
      exaggerationRelativeHeight: options.exaggerationRelativeHeight ?? 0.0,
    }
    if (this._center !== undefined) {
      input.relativeToCenter = [this._center.x, this._center.y, this._center.z]
    }
    const processor = getQuantizedMeshTaskProcessor()
    if (processor !== undefined && options.throttle !== false) {
      const scheduled = processor.scheduleTask(input)
      if (scheduled !== undefined) {
        return scheduled.then((output) => {
          const mesh = deserializeTerrainMesh(output as CreateVerticesFromHeightmapOutput)
          this._mesh = mesh
          return mesh
        })
      }
    }
    const mesh = createVerticesFromQuantizedTerrainMesh(input)
    this._mesh = mesh
    return Promise.resolve(mesh)
  }

  /**
   * 在三角形内做重心插值。
   *
   * @param rectangle 瓦片矩形
   * @param longitude 经度
   * @param latitude 纬度
   */
  interpolateHeight(rectangle: Rectangle, longitude: number, latitude: number): number | undefined {
    const u = ((longitude - rectangle.west) / (rectangle.east - rectangle.west)) * MAX_SHORT
    const v = ((latitude - rectangle.south) / (rectangle.north - rectangle.south)) * MAX_SHORT
    const indices = this._indices
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] ?? 0
      const i1 = indices[i + 1] ?? 0
      const i2 = indices[i + 2] ?? 0
      const bary = Intersections2D.computeBarycentricCoordinates(
        u,
        v,
        this._uValues[i0] ?? 0,
        this._vValues[i0] ?? 0,
        this._uValues[i1] ?? 0,
        this._vValues[i1] ?? 0,
        this._uValues[i2] ?? 0,
        this._vValues[i2] ?? 0,
        barycentricScratch,
      )
      if (
        bary.x >= -CesiumMath.EPSILON11 &&
        bary.y >= -CesiumMath.EPSILON11 &&
        bary.z >= -CesiumMath.EPSILON11
      ) {
        const h0 = CesiumMath.lerp(
          this.minimumHeight,
          this.maximumHeight,
          (this._heightValues[i0] ?? 0) / MAX_SHORT,
        )
        const h1 = CesiumMath.lerp(
          this.minimumHeight,
          this.maximumHeight,
          (this._heightValues[i1] ?? 0) / MAX_SHORT,
        )
        const h2 = CesiumMath.lerp(
          this.minimumHeight,
          this.maximumHeight,
          (this._heightValues[i2] ?? 0) / MAX_SHORT,
        )
        return bary.x * h0 + bary.y * h1 + bary.z * h2
      }
    }
    return undefined
  }

  /**
   * 上采样为子瓦片高度图。
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
    return upsampleQuantizedTerrainMesh(
      this,
      tilingScheme,
      thisX,
      thisY,
      thisLevel,
      descendantX,
      descendantY,
      descendantLevel,
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
