/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * M2：不解析 tilemapresource.xml，仅用 {z}/{reverseY}/{x} 模板。
 */

import { GeographicTilingScheme } from "@webgpu-cesium/core"
import {
  UrlTemplateImageryProvider,
  type UrlTemplateImageryProviderOptions,
} from "./UrlTemplateImageryProvider"

export interface TileMapServiceImageryProviderOptions extends Omit<
  UrlTemplateImageryProviderOptions,
  "url"
> {
  url: string
  fileExtension?: string
}

/**
 * TMS（Y 轴自下而上）。
 */
export class TileMapServiceImageryProvider extends UrlTemplateImageryProvider {
  /**
   * @param options 根 URL
   */
  constructor(options: TileMapServiceImageryProviderOptions) {
    const ext = options.fileExtension ?? "png"
    const root = options.url.replace(/\/?$/, "/")
    const rest = { ...options }
    delete (rest as { url?: string }).url
    delete (rest as { fileExtension?: string }).fileExtension
    super({
      ...rest,
      url: `${root}{z}/{reverseY}/{x}.${ext}`,
      tilingScheme: options.tilingScheme ?? new GeographicTilingScheme(),
    })
  }
}
