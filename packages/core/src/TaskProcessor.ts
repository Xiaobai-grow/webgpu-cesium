/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：Worker 由可注入 factory 创建；默认 `new Worker(url, { type: "module" })`。
 * 不引入 DOM lib，Worker 类型自行声明。
 */

import { defined } from "./defined"
import { destroyObject } from "./destroyObject"
import { DeveloperError } from "./DeveloperError"
import { Event } from "./Event"
import { RuntimeError } from "./RuntimeError"
import { getUrlConstructor, type UrlLike } from "./whatwgUrl"

/** Worker 消息事件 */
export interface WorkerMessageEventLike {
  data: {
    id?: number
    result?: unknown
    error?: { name?: string; message?: string; stack?: string } | string
  }
}

/** 可注入的 Worker 最小接口 */
export interface WorkerLike {
  postMessage: (message: unknown, transfer?: unknown[]) => void
  terminate: () => void
  addEventListener: (type: "message", listener: (event: WorkerMessageEventLike) => void) => void
  removeEventListener: (type: "message", listener: (event: WorkerMessageEventLike) => void) => void
}

/** `(url) => Worker`。`UrlLike` 代替 DOM `URL`（core 无 DOM lib）。 */
export type WorkerFactory = (url: UrlLike) => WorkerLike

const taskCompletedEvent = new Event<[unknown?]>()

function defaultWorkerFactory(url: UrlLike): WorkerLike {
  const WorkerCtor = (
    globalThis as {
      Worker?: new (script: UrlLike | string, options?: { type?: string }) => WorkerLike
    }
  ).Worker
  if (!defined(WorkerCtor)) {
    throw new RuntimeError("Worker is not available; inject TaskProcessor.workerFactory.")
  }
  return new WorkerCtor(url, { type: "module" })
}

function createOnmessageHandler(
  worker: WorkerLike,
  id: number,
  resolve: (value: unknown) => void,
  reject: (error: unknown) => void,
): (event: WorkerMessageEventLike) => void {
  const listener = (event: WorkerMessageEventLike): void => {
    const data = event.data
    if (data.id !== id) {
      return
    }
    if (defined(data.error)) {
      let error: unknown = data.error
      if (typeof data.error === "object" && data.error !== null) {
        const payload = data.error
        if (payload.name === "RuntimeError") {
          const runtime = new RuntimeError(payload.message)
          if (payload.stack !== undefined) {
            runtime.stack = payload.stack
          }
          error = runtime
        } else if (payload.name === "DeveloperError") {
          const developer = new DeveloperError(payload.message)
          if (payload.stack !== undefined) {
            developer.stack = payload.stack
          }
          error = developer
        } else if (payload.name === "Error") {
          const generic = new Error(payload.message)
          if (payload.stack !== undefined) {
            generic.stack = payload.stack
          }
          error = generic
        }
      }
      taskCompletedEvent.raiseEvent(error)
      reject(error)
    } else {
      taskCompletedEvent.raiseEvent()
      resolve(data.result)
    }
    worker.removeEventListener("message", listener)
  }
  return listener
}

/**
 * Worker 任务调度。对标 Cesium `Core/TaskProcessor.js`（改写）。
 */
export class TaskProcessor {
  private readonly _workerPath: string | UrlLike
  private readonly _maximumActiveTasks: number
  private _activeTasks = 0
  private _nextID = 0
  private _worker: WorkerLike | undefined

  static workerFactory: WorkerFactory = defaultWorkerFactory
  static taskCompletedEvent = taskCompletedEvent
  static _canTransferArrayBuffer: boolean | Promise<boolean> | undefined
  static _workerModulePrefix = "Workers/"
  static _defaultWorkerModulePrefix = "Workers/"

  /**
   * @param workerPath Worker URL 或模块路径
   * @param maximumActiveTasks 并发上限
   */
  constructor(workerPath: string | UrlLike, maximumActiveTasks?: number) {
    this._workerPath = workerPath
    this._maximumActiveTasks = maximumActiveTasks ?? Number.POSITIVE_INFINITY
  }

  private ensureWorker(): WorkerLike {
    if (!defined(this._worker)) {
      const existing = this._workerPath
      let url: UrlLike
      if (typeof existing === "object" && existing !== null && "href" in existing) {
        url = existing
      } else {
        const Url = getUrlConstructor()
        if (!Url) {
          throw new RuntimeError("URL is not available to resolve worker path.")
        }
        url = new Url(String(existing), "http://localhost/")
      }
      this._worker = TaskProcessor.workerFactory(url)
    }
    return this._worker
  }

  /**
   * 调度任务。超过并发上限返回 undefined。
   *
   * @param parameters 发给 Worker 的参数
   * @param transferableObjects 可转移对象
   */
  scheduleTask(parameters: unknown, transferableObjects?: unknown[]): Promise<unknown> | undefined {
    if (this._activeTasks >= this._maximumActiveTasks) {
      return undefined
    }
    const worker = this.ensureWorker()
    ++this._activeTasks
    const id = this._nextID++
    const transfer = transferableObjects ?? []
    const promise = new Promise<unknown>((resolve, reject) => {
      worker.addEventListener("message", createOnmessageHandler(worker, id, resolve, reject))
      worker.postMessage(
        {
          id,
          parameters,
          canTransferArrayBuffer: true,
        },
        transfer,
      )
    })
    return promise.then(
      (result) => {
        --this._activeTasks
        return result
      },
      (error: unknown) => {
        --this._activeTasks
        throw error
      },
    )
  }

  isDestroyed(): boolean {
    return false
  }

  destroy(): undefined {
    if (defined(this._worker)) {
      this._worker.terminate()
    }
    return destroyObject(this)
  }
}
