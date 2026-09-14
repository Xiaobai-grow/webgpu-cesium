/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/tiles
 */
import {
  Cartesian3,
  Credit,
  IonResource,
  Matrix4,
  Resource,
  RuntimeError,
} from "@webgpu-cesium/core"
import type { FrameUniformsBuffer, Material, RenderItem } from "@webgpu-cesium/renderer"
import type { GpuDevice } from "@webgpu-cesium/rhi"
import type { Cesium3DTileFeature } from "../feature/Cesium3DTileFeature"
import type { FrameContext } from "../FrameContext"
import { decodeDataUri } from "../uri"
import { ImplicitTileset } from "../implicit/ImplicitTileset"
import { parseMetadataSchema, type MetadataSchema } from "../metadata/MetadataSchema"
import type { ModelPrimitive } from "../gltf/ModelComponents"
import type { Model } from "../model/Model"
import type { Cesium3DTileStyle } from "../style/Cesium3DTileStyle"
import { Cesium3DTile, type TilesetTileJson } from "./Cesium3DTile"
import { Cesium3DTilesetCache } from "./Cesium3DTilesetCache"
import { Cesium3DTilesetStatistics } from "./Cesium3DTilesetStatistics"
import { selectTiles } from "./Cesium3DTilesetTraversal"

export interface TilesetJson {
  asset?: { version?: string; tilesetVersion?: string; extras?: unknown }
  geometricError?: number
  root?: TilesetTileJson
  properties?: Record<string, unknown>
  extras?: unknown
  schema?: Record<string, unknown>
  schemaUri?: string
  metadata?: unknown
  extensionsUsed?: string[]
  extensions?: Record<string, unknown>
}

export interface MaterialOverrideInfo {
  tile: Cesium3DTile
  primitive: ModelPrimitive | undefined
  model: Model
}

export type MaterialOverride = Material | ((info: MaterialOverrideInfo) => Material | undefined)

export interface Cesium3DTilesetOptions {
  url?: string | Resource
  show?: boolean
  modelMatrix?: Matrix4
  maximumScreenSpaceError?: number
  maximumCacheOverflowBytes?: number
  credit?: Credit | string
  style?: Cesium3DTileStyle
  material?: Material
  materialOverride?: MaterialOverride
}

/**
 * 3D Tiles 数据集。
 */
export class Cesium3DTileset {
  show = true
  modelMatrix = Matrix4.clone(Matrix4.IDENTITY, new Matrix4())
  maximumScreenSpaceError = 16
  readonly resource: Resource
  readonly statistics = new Cesium3DTilesetStatistics()
  readonly cache = new Cesium3DTilesetCache()
  style: Cesium3DTileStyle | undefined
  material: Material | undefined
  materialOverride: MaterialOverride | undefined
  credit: Credit | undefined
  root: Cesium3DTile | undefined
  extras: unknown
  asset: TilesetJson["asset"]
  schema: MetadataSchema | undefined
  implicitTileset: ImplicitTileset | undefined
  selectedTiles: Cesium3DTile[] = []
  private _ready = false
  private _device: GpuDevice | undefined
  private _frameUniforms: FrameUniformsBuffer | undefined

  /**
   * @param resource 根 Resource
   */
  constructor(resource: Resource, options: Cesium3DTilesetOptions = {}) {
    this.resource = resource
    this.show = options.show ?? true
    if (options.modelMatrix) {
      Matrix4.clone(options.modelMatrix, this.modelMatrix)
    }
    this.maximumScreenSpaceError = options.maximumScreenSpaceError ?? 16
    if (options.maximumCacheOverflowBytes !== undefined) {
      this.cache.maximumCacheOverflowBytes = options.maximumCacheOverflowBytes
    }
    this.style = options.style
    this.material = options.material
    this.materialOverride = options.materialOverride
    if (typeof options.credit === "string") {
      this.credit = new Credit(options.credit, true)
    } else {
      this.credit = options.credit
    }
  }

  get ready(): boolean {
    return this._ready
  }

  get boundingSphere() {
    return this.root?.boundingVolume.boundingSphere
  }

  /**
   * 从 URL 加载。
   *
   * @param url URL 或 Resource
   * @param options 选项
   */
  static async fromUrl(
    url: string | Resource,
    options: Omit<Cesium3DTilesetOptions, "url"> = {},
  ): Promise<Cesium3DTileset> {
    const resource = url instanceof Resource ? url : new Resource({ url })
    const tileset = new Cesium3DTileset(resource, options)
    await tileset.loadJson()
    return tileset
  }

  /**
   * 从已解析 JSON 加载（测试 / 内存 fixture）。
   *
   * @param json tileset.json
   * @param options 基 Resource 可选
   */
  static fromJson(
    json: TilesetJson,
    options: Cesium3DTilesetOptions & { resource?: Resource } = {},
  ): Promise<Cesium3DTileset> {
    const resource =
      options.resource ??
      (typeof options.url === "string"
        ? new Resource({ url: options.url })
        : options.url instanceof Resource
          ? options.url
          : new Resource({ url: "memory://tileset.json" }))
    const tileset = new Cesium3DTileset(resource, options)
    tileset.applyJson(json)
    return Promise.resolve(tileset)
  }

  /**
   * ion 资产。
   *
   * @param assetId 资产
   * @param options 选项
   */
  static async fromIonAssetId(
    assetId: number,
    options: Omit<Cesium3DTilesetOptions, "url"> = {},
  ): Promise<Cesium3DTileset> {
    const resource = await IonResource.fromAssetId(assetId)
    return Cesium3DTileset.fromUrl(resource, options)
  }

  /**
   * 绑定 GPU。
   *
   * @param device 设备
   * @param frameUniforms group 0
   */
  initialize(device: GpuDevice, frameUniforms: FrameUniformsBuffer): void {
    this._device = device
    this._frameUniforms = frameUniforms
  }

  /**
   * 遍历并请求。
   *
   * @param frame 帧
   */
  update(frame: FrameContext): void {
    if (!this.show || !this.root) {
      this.selectedTiles = []
      return
    }
    this.statistics.reset()
    this.selectedTiles = selectTiles(this, frame)
    this.statistics.numberOfTilesSelected = this.selectedTiles.length
    this.statistics.selectedTileCount = this.selectedTiles.length
    for (const tile of this.selectedTiles) {
      this.cache.touch(tile)
    }
    if (this.credit && frame.creditDisplay) {
      frame.creditDisplay.addCredit(this.credit)
    }
    if (this._device && this._frameUniforms) {
      for (const tile of this.selectedTiles) {
        if (tile.contentReady) {
          tile.content.initialize(this._device, this._frameUniforms)
        }
      }
    }
    this.cache.unloadUnused(new Set(this.selectedTiles), this.usedBytes())
  }

  /**
   * 收集 RenderItem。
   */
  createRenderItems(): RenderItem[] {
    const device = this._device
    const frameUniforms = this._frameUniforms
    if (!device || !frameUniforms || !this.show) {
      return []
    }
    const items: RenderItem[] = []
    for (const tile of this.selectedTiles) {
      if (!tile.contentReady) {
        continue
      }
      items.push(...tile.content.createRenderItems(device, frameUniforms))
    }
    return items
  }

  /**
   * 包围球拾取：返回第一个命中的要素或瓦片。
   *
   * @param origin 射线原点
   * @param direction 方向
   */
  pick(origin: Cartesian3, direction: Cartesian3): Cesium3DTile | Cesium3DTileFeature | undefined {
    const toCenter = new Cartesian3()
    const closest = new Cartesian3()
    for (const tile of this.selectedTiles) {
      const sphere = tile.boundingVolume.boundingSphere
      Cartesian3.subtract(sphere.center, origin, toCenter)
      const t = Cartesian3.dot(toCenter, direction)
      Cartesian3.multiplyByScalar(direction, Math.max(t, 0), closest)
      Cartesian3.add(origin, closest, closest)
      if (Cartesian3.distance(closest, sphere.center) > sphere.radius) {
        continue
      }
      const feature = tile.content.getFeature(0)
      return feature ?? tile
    }
    return undefined
  }

  destroy(): void {
    const walk = (tile: Cesium3DTile | undefined): void => {
      if (!tile) {
        return
      }
      tile.unloadContent()
      for (const child of tile.children) {
        walk(child)
      }
    }
    walk(this.root)
  }

  private async loadJson(): Promise<void> {
    let json: TilesetJson
    if (this.resource.isDataUri) {
      const bytes = decodeDataUri(this.resource.url)
      json = JSON.parse(new TextDecoder().decode(bytes)) as TilesetJson
    } else {
      json = (await this.resource.fetchJson()) as TilesetJson
    }
    this.applyJson(json)
  }

  private applyJson(json: TilesetJson): void {
    this.asset = json.asset
    this.extras = json.extras
    if (json.schema) {
      this.schema = parseMetadataSchema(json.schema)
    }
    if (json.root?.implicitTiling && typeof json.root.implicitTiling === "object") {
      this.implicitTileset = new ImplicitTileset(json.root.implicitTiling)
    }
    if (!json.root) {
      throw new RuntimeError("tileset.json missing root.")
    }
    this.root = new Cesium3DTile(this, json.root, undefined, this.modelMatrix)
    this._ready = true
  }

  private usedBytes(): number {
    let bytes = 0
    const walk = (tile: Cesium3DTile | undefined): void => {
      if (!tile) {
        return
      }
      bytes += tile.content.bytes
      for (const child of tile.children) {
        walk(child)
      }
    }
    walk(this.root)
    return bytes
  }
}
