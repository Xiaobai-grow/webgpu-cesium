/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 */

import type { Credit, Event, Request, TilingScheme } from "@webgpu-cesium/core"
import type { TileProviderError } from "@webgpu-cesium/core"
import type { TileDiscardPolicy } from "./TileDiscardPolicy"

/**
 * 影像 Provider 基类。
 */
export abstract class ImageryProvider {
  abstract readonly ready: boolean
  abstract readonly tilingScheme: TilingScheme
  abstract readonly tileWidth: number
  abstract readonly tileHeight: number
  abstract readonly maximumLevel: number | undefined
  abstract readonly minimumLevel: number
  abstract readonly credit: Credit | undefined
  abstract readonly errorEvent: Event<[TileProviderError]>
  abstract readonly hasAlphaChannel: boolean
  abstract readonly tileDiscardPolicy: TileDiscardPolicy | undefined

  /**
   * 请求影像。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param request 调度
   */
  abstract requestImage(
    x: number,
    y: number,
    level: number,
    request?: Request,
  ): Promise<ImageBitmap | HTMLImageElement | undefined> | undefined

  /**
   * 默认：瓦片始终可用。
   *
   * @param _x 列
   * @param _y 行
   * @param _level LOD
   */
  getTileCredits(_x: number, _y: number, _level: number): Credit[] | undefined {
    return undefined
  }
}
