/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 */

import {
  Credit,
  Event,
  Request,
  RequestType,
  Resource,
  type TileProviderError,
  type TilingScheme,
  WebMercatorTilingScheme,
} from "@webgpu-cesium/core"
import { ImageryProvider } from "./ImageryProvider"
import { NeverTileDiscardPolicy, type TileDiscardPolicy } from "./TileDiscardPolicy"

export interface UrlTemplateImageryProviderOptions {
  url: string
  credit?: string | Credit
  tilingScheme?: TilingScheme
  tileWidth?: number
  tileHeight?: number
  maximumLevel?: number
  minimumLevel?: number
  hasAlphaChannel?: boolean
  tileDiscardPolicy?: TileDiscardPolicy
  customTags?: Record<
    string,
    (provider: UrlTemplateImageryProvider, x: number, y: number, level: number) => string
  >
}

/**
 * `{z}/{x}/{y}` 模板影像。
 */
export class UrlTemplateImageryProvider extends ImageryProvider {
  readonly ready = true
  readonly tilingScheme: TilingScheme
  readonly tileWidth: number
  readonly tileHeight: number
  readonly maximumLevel: number | undefined
  readonly minimumLevel: number
  readonly credit: Credit | undefined
  readonly errorEvent = new Event<[TileProviderError]>()
  readonly hasAlphaChannel: boolean
  readonly tileDiscardPolicy: TileDiscardPolicy | undefined
  readonly url: string
  private readonly _customTags: UrlTemplateImageryProviderOptions["customTags"]

  /**
   * @param options 模板 URL
   */
  constructor(options: UrlTemplateImageryProviderOptions) {
    super()
    this.url = options.url
    this.tilingScheme = options.tilingScheme ?? new WebMercatorTilingScheme()
    this.tileWidth = options.tileWidth ?? 256
    this.tileHeight = options.tileHeight ?? 256
    this.maximumLevel = options.maximumLevel
    this.minimumLevel = options.minimumLevel ?? 0
    this.hasAlphaChannel = options.hasAlphaChannel ?? true
    this.tileDiscardPolicy = options.tileDiscardPolicy ?? new NeverTileDiscardPolicy()
    this._customTags = options.customTags
    if (options.credit instanceof Credit) {
      this.credit = options.credit
    } else if (typeof options.credit === "string") {
      this.credit = new Credit(options.credit, true)
    } else {
      this.credit = undefined
    }
  }

  /**
   * 展开模板。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   */
  buildImageUrl(x: number, y: number, level: number): string {
    const yTiles = this.tilingScheme.getNumberOfYTilesAtLevel(level)
    let url = this.url
    url = url.replace(/{z}/g, String(level))
    url = url.replace(/{x}/g, String(x))
    url = url.replace(/{y}/g, String(y))
    url = url.replace(/{reverseY}/g, String(yTiles - y - 1))
    const tags = this._customTags
    if (tags) {
      for (const [tag, fn] of Object.entries(tags)) {
        url = url.replace(new RegExp(`\\{${tag}\\}`, "g"), fn(this, x, y, level))
      }
    }
    return url
  }

  /**
   * 拉取影像。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param request 调度
   */
  requestImage(
    x: number,
    y: number,
    level: number,
    request?: Request,
  ): Promise<ImageBitmap | HTMLImageElement | undefined> {
    const url = this.buildImageUrl(x, y, level)
    const resource = new Resource({
      url,
      request:
        request ??
        new Request({ url, type: RequestType.IMAGERY, throttle: true, throttleByServer: true }),
    })
    return resource.fetchImage({ flipY: false }) as Promise<
      ImageBitmap | HTMLImageElement | undefined
    >
  }
}
