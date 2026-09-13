/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { defined } from "./defined"
import { type Event } from "./Event"

/** 可报告错误的 Provider */
export interface TileProviderLike {
  errorEvent: Event<[TileProviderError]>
}

/**
 * 地形 / 影像瓦片请求错误。对标 Cesium `Core/TileProviderError.js`。
 */
export class TileProviderError {
  provider: TileProviderLike
  message: string
  x: number | undefined
  y: number | undefined
  level: number | undefined
  timesRetried: number
  retry: boolean
  error: Error | undefined

  /**
   * @param provider 出错的 Provider
   * @param message 文案
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param timesRetried 已重试次数
   * @param error 原始错误
   */
  constructor(
    provider: TileProviderLike,
    message: string,
    x?: number,
    y?: number,
    level?: number,
    timesRetried?: number,
    error?: Error,
  ) {
    this.provider = provider
    this.message = message
    this.x = x
    this.y = y
    this.level = level
    this.timesRetried = timesRetried ?? 0
    this.retry = false
    this.error = error
  }

  /**
   * 向 `errorEvent` 报告；监听方可把 `retry` 设为 true。
   *
   * @param provider Provider
   * @param event 已有事件对象（重试时复用）
   * @param message 文案
   * @param x 列
   * @param y 行
   * @param level LOD
   * @param error 原始错误
   */
  static reportError(
    provider: TileProviderLike,
    event: TileProviderError | undefined,
    message: string,
    x?: number,
    y?: number,
    level?: number,
    error?: Error,
  ): TileProviderError {
    if (defined(event)) {
      event.provider = provider
      event.message = message
      event.x = x
      event.y = y
      event.level = level
      event.retry = false
      event.timesRetried++
      event.error = error
      provider.errorEvent.raiseEvent(event)
      return event
    }
    const reported = new TileProviderError(provider, message, x, y, level, 0, error)
    provider.errorEvent.raiseEvent(reported)
    return reported
  }

  /**
   * 报告成功（占位，对齐 Cesium 签名）。
   *
   * @param _event 先前的错误
   */
  static reportSuccess(_event?: TileProviderError): void {
    // M2 无重试状态机，成功即结束
  }
}
