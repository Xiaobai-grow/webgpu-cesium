/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** `defer()` 返回的可外部 resolve/reject 的 Promise 容器 */
export interface Deferred<T = void> {
  resolve: (value: T | PromiseLike<T>) => void
  reject: (error?: unknown) => void
  promise: Promise<T>
}

/**
 * 创建可外部结算的 Promise（Cesium 内部常用）。
 * 对标 Cesium `Core/defer.js`。
 */
export function defer<T = void>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (error?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { resolve, reject, promise }
}
