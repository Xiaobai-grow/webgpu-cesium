/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * 偏离：影像走 Resource.fetch + createImageBitmap，不依赖 canvas 的 crossOrigin。
 * 默认官方 OSM XYZ；若某环境 fetch CORS 失败，可改 OSM_CORS_URL（Carto Voyager，可能带水印）。
 */

import { Credit, WebMercatorTilingScheme } from "@webgpu-cesium/core"
import {
  UrlTemplateImageryProvider,
  type UrlTemplateImageryProviderOptions,
} from "./UrlTemplateImageryProvider"

/** 官方 OSM CDN（无 CORS，仅作参考） */
export const OSM_OFFICIAL_URL = "https://tile.openstreetmap.org/"
/** 带 CORS 的 OSM 风格底图（hello-globe 默认） */
export const OSM_CORS_URL = "https://basemaps.cartocdn.com/rastertiles/voyager/"

export interface OpenStreetMapImageryProviderOptions extends Omit<
  UrlTemplateImageryProviderOptions,
  "url" | "credit"
> {
  url?: string
  credit?: string | Credit
}

/**
 * OSM XYZ 影像。
 */
export class OpenStreetMapImageryProvider extends UrlTemplateImageryProvider {
  /**
   * @param options 可选 URL（默认 CORS 友好的 Voyager）
   */
  constructor(options?: OpenStreetMapImageryProviderOptions) {
    const url = options?.url ?? OSM_OFFICIAL_URL
    const template = url.includes("{z}") ? url : `${url.replace(/\/?$/, "/")}{z}/{x}/{y}.png`
    const rest = { ...options }
    delete (rest as { url?: string }).url
    delete (rest as { credit?: string | Credit }).credit
    super({
      ...rest,
      url: template,
      credit: options?.credit ?? new Credit("© OpenStreetMap contributors", true),
      tilingScheme: options?.tilingScheme ?? new WebMercatorTilingScheme(),
      maximumLevel: options?.maximumLevel ?? 19,
    })
  }
}
