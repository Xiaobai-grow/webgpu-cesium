/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import type { Deferred } from "./defer"
import { Frozen } from "./Frozen"
import { defined } from "./defined"
import { RequestState, type RequestStateValue } from "./RequestState"
import { RequestType, type RequestTypeValue } from "./RequestType"

/** 实际发请求的函数 */
export type RequestCallback = () => Promise<unknown>
/** 取消回调 */
export type CancelCallback = () => void
/** 每帧更新优先级 */
export type PriorityCallback = () => number

/** Request 构造选项 */
export interface RequestOptions {
  url?: string | undefined
  requestFunction?: RequestCallback | undefined
  cancelFunction?: CancelCallback | undefined
  priorityFunction?: PriorityCallback | undefined
  priority?: number | undefined
  throttle?: boolean | undefined
  throttleByServer?: boolean | undefined
  type?: RequestTypeValue | undefined
  serverKey?: string | undefined
}

/**
 * 一次可调度请求。对标 Cesium `Core/Request.js`。
 */
export class Request {
  url: string | undefined
  requestFunction: RequestCallback | undefined
  cancelFunction: CancelCallback | undefined
  priorityFunction: PriorityCallback | undefined
  priority: number
  throttle: boolean
  throttleByServer: boolean
  type: RequestTypeValue
  serverKey: string | undefined
  state: RequestStateValue
  deferred: Deferred<unknown> | undefined
  cancelled: boolean

  /**
   * @param options 请求选项
   */
  constructor(options?: RequestOptions) {
    const resolved = options ?? Frozen.EMPTY_OBJECT
    this.url = resolved.url
    this.requestFunction = resolved.requestFunction
    this.cancelFunction = resolved.cancelFunction
    this.priorityFunction = resolved.priorityFunction
    this.priority = resolved.priority ?? 0.0
    this.throttle = resolved.throttle ?? false
    this.throttleByServer = resolved.throttleByServer ?? false
    this.type = resolved.type ?? RequestType.OTHER
    this.serverKey = resolved.serverKey
    this.state = RequestState.UNISSUED
    this.deferred = undefined
    this.cancelled = false
  }

  /** 标记为已取消 */
  cancel(): void {
    this.cancelled = true
  }

  /**
   * 克隆（新实例状态回到 UNISSUED）。
   */
  clone(result?: Request): Request {
    if (!defined(result)) {
      return new Request(this)
    }
    result.url = this.url
    result.requestFunction = this.requestFunction
    result.cancelFunction = this.cancelFunction
    result.priorityFunction = this.priorityFunction
    result.priority = this.priority
    result.throttle = this.throttle
    result.throttleByServer = this.throttleByServer
    result.type = this.type
    result.serverKey = this.serverKey
    result.state = RequestState.UNISSUED
    result.deferred = undefined
    result.cancelled = false
    return result
  }
}
