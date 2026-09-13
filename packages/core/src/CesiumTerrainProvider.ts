/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Credit } from "./Credit"
import { defined } from "./defined"
import { Ellipsoid } from "./Ellipsoid"
import { Event } from "./Event"
import { Frozen } from "./Frozen"
import { GeographicTilingScheme } from "./GeographicTilingScheme"
import { HeightmapTerrainData } from "./HeightmapTerrainData"
import { IonResource } from "./IonResource"
import { OrientedBoundingBox } from "./OrientedBoundingBox"
import { QuantizedMeshTerrainData } from "./QuantizedMeshTerrainData"
import type { Request } from "./Request"
import { RequestErrorEvent } from "./RequestErrorEvent"
import { Resource } from "./Resource"
import { RuntimeError } from "./RuntimeError"
import type { TerrainData } from "./TerrainData"
import { TerrainProvider } from "./TerrainProvider"
import { TileAvailability } from "./TileAvailability"
import type { TileProviderError } from "./TileProviderError"
import type { TilingScheme } from "./TilingScheme"
import { WebMercatorTilingScheme } from "./WebMercatorTilingScheme"
import type { HeightmapStructure } from "./heightmapStructure"
import { parseQuantizedMesh } from "./quantizedMesh"

/** 构造选项 */
export interface CesiumTerrainProviderOptions {
  requestVertexNormals?: boolean
  requestWaterMask?: boolean
  requestMetadata?: boolean
  ellipsoid?: Ellipsoid
  credit?: string | Credit
}

interface LayerJson {
  format?: string
  tiles?: string[]
  projection?: string
  scheme?: string
  maxzoom?: number
  version?: string
  attribution?: string
  extensions?: string[]
  available?: { startX: number; startY: number; endX: number; endY: number }[][]
  metadataAvailability?: number
  parentUrl?: string
}

interface LayerInformation {
  resource: Resource
  version: string | undefined
  isHeightmap: boolean
  tileUrlTemplates: string[]
  availability: TileAvailability | undefined
  hasVertexNormals: boolean
  hasWaterMask: boolean
  hasMetadata: boolean
  availabilityLevels: number | undefined
  littleEndianExtensionSize: boolean
}

function getRequestHeader(extensions: string[] | undefined): Record<string, string> {
  if (extensions !== undefined && extensions.length > 0) {
    return {
      Accept: `application/vnd.quantized-mesh,application/octet-stream;extensions=${extensions.join("-")}`,
    }
  }
  return { Accept: "application/vnd.quantized-mesh,application/octet-stream" }
}

/**
 * Cesium 地形（quantized-mesh / heightmap-1.0）。对标 Cesium `Core/CesiumTerrainProvider.js`。
 */
export class CesiumTerrainProvider extends TerrainProvider {
  readonly errorEvent = new Event<[TileProviderError]>()
  credit: Credit | undefined
  tilingScheme: TilingScheme
  hasWaterMask = false
  hasVertexNormals = false
  availability: TileAvailability | undefined
  private _requestWaterMask: boolean
  private _requestVertexNormals: boolean
  private _requestMetadata: boolean
  private _hasMetadata = false
  private _scheme: string | undefined
  private _heightmapWidth = 65
  private _heightmapStructure: HeightmapStructure | undefined
  private _levelZeroMaximumGeometricError = 0
  private _layers: LayerInformation[] = []
  private _tileCredits: Credit[] = []

  /**
   * 仅设置请求开关；请用 fromUrl / fromIonAssetId 完成初始化。
   *
   * @param options 法线 / 水面 / 元数据
   */
  constructor(options?: CesiumTerrainProviderOptions) {
    super()
    const opts = options ?? Frozen.EMPTY_OBJECT
    this._requestVertexNormals = opts.requestVertexNormals ?? false
    this._requestWaterMask = opts.requestWaterMask ?? false
    this._requestMetadata = opts.requestMetadata ?? true
    this.tilingScheme = new GeographicTilingScheme({
      ellipsoid: opts.ellipsoid ?? Ellipsoid.default,
    })
    if (opts.credit instanceof Credit) {
      this.credit = opts.credit
    } else if (typeof opts.credit === "string") {
      this.credit = new Credit(opts.credit, true)
    } else {
      this.credit = undefined
    }
  }

  /**
   * 从 ion 资产创建。
   *
   * @param assetId 资产 ID
   * @param options 选项
   */
  static async fromIonAssetId(
    assetId: number,
    options?: CesiumTerrainProviderOptions,
  ): Promise<CesiumTerrainProvider> {
    const resource = await IonResource.fromAssetId(assetId)
    return CesiumTerrainProvider.fromUrl(resource, options)
  }

  /**
   * 从 layer.json 根 URL 创建。
   *
   * @param url Resource 或字符串
   * @param options 选项
   */
  static async fromUrl(
    url: string | Resource | Promise<string | Resource>,
    options?: CesiumTerrainProviderOptions,
  ): Promise<CesiumTerrainProvider> {
    const resolved = await Promise.resolve(url)
    const resource = Resource.createIfNeeded(resolved)
    resource.appendForwardSlash()
    const provider = new CesiumTerrainProvider(options)
    await provider.loadLayerJson(resource)
    return provider
  }

  /**
   * 拉取并解析 layer.json。
   *
   * @param resource 根 Resource
   */
  private async loadLayerJson(resource: Resource): Promise<void> {
    const layerJsonResource = resource.getDerivedResource({ url: "layer.json" })
    let data: LayerJson
    try {
      data = (await layerJsonResource.fetchJson()) as LayerJson
    } catch (error) {
      if (error instanceof RequestErrorEvent && error.statusCode === 404) {
        data = {
          tilejson: "2.1.0",
          format: "heightmap-1.0",
          version: "1.0.0",
          scheme: "tms",
          tiles: ["{z}/{x}/{y}.terrain?v={version}"],
        } as LayerJson
      } else {
        throw new RuntimeError(
          `An error occurred while accessing ${layerJsonResource.url}.${error instanceof Error ? `\n${error.message}` : ""}`,
        )
      }
    }
    this.applyLayerJson(resource, data)
  }

  /**
   * 应用一份 layer.json。
   *
   * @param resource 该层 Resource
   * @param data layer.json
   */
  private applyLayerJson(resource: Resource, data: LayerJson): void {
    if (!data.format) {
      throw new RuntimeError("The tile format is not specified in the layer.json file.")
    }
    if (!data.tiles || data.tiles.length === 0) {
      throw new RuntimeError("The layer.json file does not specify any tile URL templates.")
    }

    let isHeightmap = false
    let hasVertexNormals = false
    let hasWaterMask = false
    let hasMetadata = false
    let littleEndianExtensionSize = true

    if (data.format === "heightmap-1.0") {
      isHeightmap = true
      this._heightmapStructure = {
        heightScale: 1.0 / 5.0,
        heightOffset: -1000.0,
        elementsPerHeight: 1,
        stride: 1,
        elementMultiplier: 256.0,
        isBigEndian: false,
        lowestEncodedHeight: 0,
        highestEncodedHeight: 256 * 256 - 1,
      }
      hasWaterMask = true
      this._requestWaterMask = true
    } else if (!data.format.startsWith("quantized-mesh-1.")) {
      throw new RuntimeError(`The tile format "${data.format}" is invalid or not supported.`)
    }

    const ellipsoid = this.tilingScheme.ellipsoid
    if (!data.projection || data.projection === "EPSG:4326") {
      this.tilingScheme = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 2,
        numberOfLevelZeroTilesY: 1,
        ellipsoid,
      })
    } else if (data.projection === "EPSG:3857") {
      this.tilingScheme = new WebMercatorTilingScheme({
        numberOfLevelZeroTilesX: 1,
        numberOfLevelZeroTilesY: 1,
        ellipsoid,
      })
    } else {
      throw new RuntimeError(`The projection "${data.projection}" is invalid or not supported.`)
    }

    if (!data.scheme || data.scheme === "tms" || data.scheme === "slippyMap") {
      this._scheme = data.scheme
    } else {
      throw new RuntimeError(`The scheme "${data.scheme}" is invalid or not supported.`)
    }

    const extensions = data.extensions ?? []
    if (extensions.includes("octvertexnormals")) {
      hasVertexNormals = true
    } else if (extensions.includes("vertexnormals")) {
      hasVertexNormals = true
      littleEndianExtensionSize = false
    }
    if (extensions.includes("watermask")) {
      hasWaterMask = true
    }
    if (extensions.includes("metadata")) {
      hasMetadata = true
    }

    const maxZoom = data.maxzoom ?? 0
    let availability: TileAvailability | undefined
    const availableTiles = data.available
    if (defined(availableTiles) && data.metadataAvailability === undefined) {
      availability = new TileAvailability(this.tilingScheme, availableTiles.length)
      for (let level = 0; level < availableTiles.length; ++level) {
        const rangesAtLevel = availableTiles[level] ?? []
        const yTiles = this.tilingScheme.getNumberOfYTilesAtLevel(level)
        for (const range of rangesAtLevel) {
          const yStart = yTiles - range.endY - 1
          const yEnd = yTiles - range.startY - 1
          availability.addAvailableTileRange(level, range.startX, yStart, range.endX, yEnd)
        }
      }
      this.availability = availability
    } else if (data.metadataAvailability !== undefined) {
      availability = new TileAvailability(this.tilingScheme, maxZoom)
      availability.addAvailableTileRange(0, 0, 0, 1, 0)
      this.availability = availability
    }

    this.hasWaterMask = this.hasWaterMask || hasWaterMask
    this.hasVertexNormals = this.hasVertexNormals || hasVertexNormals
    this._hasMetadata = this._hasMetadata || hasMetadata
    this._levelZeroMaximumGeometricError =
      TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
        this.tilingScheme.ellipsoid,
        this._heightmapWidth,
        this.tilingScheme.getNumberOfXTilesAtLevel(0),
      )

    if (defined(data.attribution)) {
      this._tileCredits.push(new Credit(data.attribution))
    }
    if (resource instanceof IonResource) {
      this._tileCredits.push(...resource.credits)
    }

    this._layers.push({
      resource,
      version: data.version,
      isHeightmap,
      tileUrlTemplates: data.tiles,
      availability,
      hasVertexNormals,
      hasWaterMask,
      hasMetadata,
      availabilityLevels: data.metadataAvailability,
      littleEndianExtensionSize,
    })
  }

  /**
   * 请求瓦片几何。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param request 调度
   */
  requestTileGeometry(
    x: number,
    y: number,
    level: number,
    request?: Request,
  ): Promise<TerrainData> | undefined {
    const layer = this._layers[0]
    if (!defined(layer)) {
      return Promise.reject(new RuntimeError("Terrain tile doesn't exist"))
    }
    return this.requestLayerTile(layer, x, y, level, request)
  }

  /**
   * 拉取一层瓦片。
   *
   * @param layer 层
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param request 调度
   */
  private requestLayerTile(
    layer: LayerInformation,
    x: number,
    y: number,
    level: number,
    request?: Request,
  ): Promise<TerrainData> | undefined {
    const urlTemplates = layer.tileUrlTemplates
    if (urlTemplates.length === 0) {
      return undefined
    }
    let terrainY = y
    if (!this._scheme || this._scheme === "tms") {
      const yTiles = this.tilingScheme.getNumberOfYTilesAtLevel(level)
      terrainY = yTiles - y - 1
    }
    const extensionList: string[] = []
    if (this._requestVertexNormals && layer.hasVertexNormals) {
      extensionList.push(layer.littleEndianExtensionSize ? "octvertexnormals" : "vertexnormals")
    }
    if (this._requestWaterMask && layer.hasWaterMask) {
      extensionList.push("watermask")
    }
    if (this._requestMetadata && layer.hasMetadata) {
      extensionList.push("metadata")
    }
    const url = urlTemplates[(x + terrainY + level) % urlTemplates.length] ?? urlTemplates[0]!
    const ion = layer.resource instanceof IonResource && !layer.resource.isExternal
    const derived = layer.resource.getDerivedResource({
      url,
      templateValues: {
        version: layer.version ?? "1.0.0",
        z: String(level),
        x: String(x),
        y: String(terrainY),
      },
      ...(ion && extensionList.length > 0
        ? { queryParameters: { extensions: extensionList.join("-") } }
        : {}),
      headers: getRequestHeader(ion ? undefined : extensionList),
      ...(request !== undefined ? { request } : {}),
    })
    return derived.fetchArrayBuffer().then((buffer) => {
      if (defined(this._heightmapStructure)) {
        return this.createHeightmapData(buffer)
      }
      return this.createQuantizedMeshData(buffer, level, x, y, layer)
    })
  }

  /**
   * heightmap-1.0 瓦片。
   *
   * @param buffer 二进制
   */
  private createHeightmapData(buffer: ArrayBuffer): HeightmapTerrainData {
    const width = this._heightmapWidth
    const heightBuffer = new Uint16Array(buffer, 0, width * width)
    const childTileMask = new Uint8Array(buffer, heightBuffer.byteLength, 1)[0] ?? 15
    const waterMask = new Uint8Array(
      buffer,
      heightBuffer.byteLength + 1,
      buffer.byteLength - heightBuffer.byteLength - 1,
    )
    return new HeightmapTerrainData({
      buffer: heightBuffer,
      childTileMask,
      waterMask,
      width,
      height: width,
      ...(this._heightmapStructure !== undefined ? { structure: this._heightmapStructure } : {}),
    })
  }

  /**
   * 解析 quantized-mesh 并挂可用性。
   *
   * @param buffer 二进制
   * @param level LOD
   * @param x 列
   * @param y 行
   * @param layer 层
   */
  private createQuantizedMeshData(
    buffer: ArrayBuffer,
    level: number,
    x: number,
    y: number,
    layer: LayerInformation,
  ): QuantizedMeshTerrainData {
    const parsed = parseQuantizedMesh(buffer, {
      littleEndianExtensionSize: layer.littleEndianExtensionSize,
      requestVertexNormals: this._requestVertexNormals,
      requestWaterMask: this._requestWaterMask,
      requestMetadata: this._requestMetadata,
    })
    if (defined(parsed.metadata) && this.availability && layer.availability) {
      const metadata = parsed.metadata as {
        available?: { startX: number; startY: number; endX: number; endY: number }[][]
      }
      const availableTiles = metadata.available
      if (defined(availableTiles)) {
        for (let offset = 0; offset < availableTiles.length; ++offset) {
          const availableLevel = level + offset + 1
          const rangesAtLevel = availableTiles[offset] ?? []
          const yTiles = this.tilingScheme.getNumberOfYTilesAtLevel(availableLevel)
          for (const range of rangesAtLevel) {
            const yStart = yTiles - range.endY - 1
            const yEnd = yTiles - range.startY - 1
            this.availability.addAvailableTileRange(
              availableLevel,
              range.startX,
              yStart,
              range.endX,
              yEnd,
            )
            layer.availability.addAvailableTileRange(
              availableLevel,
              range.startX,
              yStart,
              range.endX,
              yEnd,
            )
          }
        }
      }
    }
    const skirtHeight = this.getLevelMaximumGeometricError(level) * 5.0
    const rectangle = this.tilingScheme.tileXYToRectangle(x, y, level)
    const orientedBoundingBox = OrientedBoundingBox.fromRectangle(
      rectangle,
      parsed.minimumHeight,
      parsed.maximumHeight,
      this.tilingScheme.ellipsoid,
    )
    const childTileMask = this.availability?.computeChildMaskForTile(level, x, y) ?? 15
    return new QuantizedMeshTerrainData({
      center: parsed.center,
      minimumHeight: parsed.minimumHeight,
      maximumHeight: parsed.maximumHeight,
      boundingSphere: parsed.boundingSphere,
      orientedBoundingBox,
      horizonOcclusionPoint: parsed.horizonOcclusionPoint,
      quantizedVertices: parsed.quantizedVertices,
      ...(parsed.encodedNormals !== undefined ? { encodedNormals: parsed.encodedNormals } : {}),
      indices: parsed.indices,
      westIndices: parsed.westIndices,
      southIndices: parsed.southIndices,
      eastIndices: parsed.eastIndices,
      northIndices: parsed.northIndices,
      westSkirtHeight: skirtHeight,
      southSkirtHeight: skirtHeight,
      eastSkirtHeight: skirtHeight,
      northSkirtHeight: skirtHeight,
      childTileMask,
      ...(parsed.waterMask !== undefined ? { waterMask: parsed.waterMask } : {}),
    })
  }

  /**
   * 指定 LOD 的最大几何误差。
   *
   * @param level LOD
   */
  getLevelMaximumGeometricError(level: number): number {
    return this._levelZeroMaximumGeometricError / (1 << level)
  }

  getTileDataAvailable(x: number, y: number, level: number): boolean | undefined {
    if (!defined(this.availability)) {
      return undefined
    }
    if (level > this.availability.maximumLevel) {
      return false
    }
    if (this.availability.isTileAvailable(level, x, y)) {
      return true
    }
    if (!this._hasMetadata) {
      return false
    }
    return undefined
  }

  loadTileDataAvailability(_x: number, _y: number, _level: number): Promise<void> | undefined {
    return undefined
  }
}
