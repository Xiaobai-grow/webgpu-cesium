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
import { parseResponseHeaders } from "./parseResponseHeaders"

/**
 * 请求失败事件。对标 Cesium `Core/RequestErrorEvent.js`。
 */
export class RequestErrorEvent {
  statusCode: number | undefined
  response: unknown
  responseHeaders: Record<string, string> | undefined

  /**
   * @param statusCode HTTP 状态码
   * @param response 响应体
   * @param responseHeaders 对象或 XHR 头字符串
   */
  constructor(
    statusCode?: number,
    response?: unknown,
    responseHeaders?: string | Record<string, string>,
  ) {
    this.statusCode = statusCode
    this.response = response
    if (typeof responseHeaders === "string") {
      this.responseHeaders = parseResponseHeaders(responseHeaders)
    } else {
      this.responseHeaders = responseHeaders
    }
  }

  toString(): string {
    let str = "Request has failed."
    if (defined(this.statusCode)) {
      str += ` Status Code: ${this.statusCode}`
    }
    return str
  }
}
