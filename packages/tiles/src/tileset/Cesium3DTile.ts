/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/tiles
 */
import { Ellipsoid, Matrix4 } from "@webgpu-cesium/core"
import { loadUriBytes } from "../uri"
import {
  Cesium3DTileContentState,
  Empty3DTileContent,
  type Cesium3DTileContent,
  type Cesium3DTileContentStateValue,
} from "./Cesium3DTileContent"
import { Cesium3DTileRefine, type Cesium3DTileRefineValue } from "./Cesium3DTileRefine"
import { loadTileContent } from "./loadTileContent"
import {
  createTileBoundingVolume,
  type TileBoundingVolume,
  type TilesetBoundingVolumeJson,
} from "./TileBoundingVolume"
import type { Cesium3DTileset } from "./Cesium3DTileset"

export interface TilesetTileJson {
  boundingVolume?: TilesetBoundingVolumeJson
  viewerRequestVolume?: TilesetBoundingVolumeJson
  geometricError?: number
  refine?: string
  content?: { uri?: string; url?: string; boundingVolume?: TilesetBoundingVolumeJson }
  children?: TilesetTileJson[]
  transform?: number[]
  implicitTiling?: unknown
  metadata?: unknown
  extras?: unknown
}

/**
 * 单个 3D Tile。
 */
export class Cesium3DTile {
  readonly tileset: Cesium3DTileset
  readonly parent: Cesium3DTile | undefined
  children: Cesium3DTile[] = []
  readonly transform: Matrix4
  readonly computedTransform: Matrix4
  readonly boundingVolume: TileBoundingVolume
  geometricError: number
  refine: Cesium3DTileRefineValue
  contentUri: string | undefined
  content: Cesium3DTileContent = new Empty3DTileContent()
  contentState: Cesium3DTileContentStateValue = Cesium3DTileContentState.UNLOADED
  contentReady = false
  expireDate: Date | undefined
  extras: unknown
  lastVisitedFrame = 0
  selected = false
  private _loadPromise: Promise<void> | undefined

  /**
   * @param tileset 数据集
   * @param json 瓦片 JSON
   * @param parent 父
   * @param parentTransform 父 computedTransform
   */
  constructor(
    tileset: Cesium3DTileset,
    json: TilesetTileJson,
    parent: Cesium3DTile | undefined,
    parentTransform: Matrix4,
  ) {
    this.tileset = tileset
    this.parent = parent
    this.transform =
      json.transform?.length === 16
        ? Matrix4.fromArray(json.transform, 0, new Matrix4())
        : Matrix4.clone(Matrix4.IDENTITY, new Matrix4())
    this.computedTransform = Matrix4.multiply(parentTransform, this.transform, new Matrix4())
    this.boundingVolume = createTileBoundingVolume(
      json.boundingVolume,
      this.computedTransform,
      Ellipsoid.default,
    )
    this.geometricError = json.geometricError ?? parent?.geometricError ?? 0
    this.refine = parent?.refine ?? Cesium3DTileRefine.REPLACE
    if (json.refine === "ADD") {
      this.refine = Cesium3DTileRefine.ADD
    } else if (json.refine === "REPLACE") {
      this.refine = Cesium3DTileRefine.REPLACE
    }
    const uri = json.content?.uri ?? json.content?.url
    this.contentUri = uri
    this.extras = json.extras
    this.children = (json.children ?? []).map(
      (child) => new Cesium3DTile(tileset, child, this, this.computedTransform),
    )
  }

  get hasTilesetContent(): boolean {
    return this.contentUri !== undefined && /\.json($|\?)/i.test(this.contentUri)
  }

  /**
   * 请求内容。
   */
  requestContent(): Promise<void> {
    if (this.contentReady || this.contentState === Cesium3DTileContentState.LOADING) {
      return this._loadPromise ?? Promise.resolve()
    }
    if (this.contentUri === undefined) {
      this.contentReady = true
      this.contentState = Cesium3DTileContentState.READY
      return Promise.resolve()
    }
    this.contentState = Cesium3DTileContentState.LOADING
    this.tileset.statistics.numberOfPendingRequests++
    this._loadPromise = this.loadContent()
      .then(() => {
        this.contentState = Cesium3DTileContentState.READY
        this.contentReady = true
        this.tileset.statistics.numberOfTilesWithContentReady++
      })
      .catch(() => {
        this.contentState = Cesium3DTileContentState.FAILED
      })
      .finally(() => {
        this.tileset.statistics.numberOfPendingRequests = Math.max(
          0,
          this.tileset.statistics.numberOfPendingRequests - 1,
        )
      })
    return this._loadPromise
  }

  /**
   * 卸载内容，返回释放字节。
   */
  unloadContent(): number {
    const bytes = this.content.bytes
    this.content.destroy()
    this.content = new Empty3DTileContent()
    this.contentReady = false
    this.contentState = Cesium3DTileContentState.UNLOADED
    this._loadPromise = undefined
    return bytes
  }

  private async loadContent(): Promise<void> {
    const uri = this.contentUri
    if (uri === undefined) {
      return
    }
    const bytes = await loadUriBytes(this.tileset.resource, uri)
    const derived = this.tileset.resource.getDerivedResource({ url: uri })
    const loaded = await loadTileContent(this, bytes, derived)
    this.content = loaded.content
    if (loaded.external && typeof loaded.external === "object") {
      const external = loaded.external as { root?: TilesetTileJson; geometricError?: number }
      if (external.root) {
        const child = new Cesium3DTile(this.tileset, external.root, this, this.computedTransform)
        this.children.push(child)
      }
    }
  }
}
