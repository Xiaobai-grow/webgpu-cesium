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
import { formatError } from "./formatError"

/** Worker 计算函数 */
export type TaskProcessorWorkerFunction = (
  parameters: unknown,
  transferableObjects: unknown[],
) => unknown

interface IncomingMessage {
  id?: number
  parameters?: unknown
  baseUrl?: string
  canTransferArrayBuffer?: boolean
}

interface WorkerSelfLike {
  CESIUM_BASE_URL?: string
  onmessage: ((event: { data: IncomingMessage }) => void) | null
  onmessageerror: ((event: { data?: IncomingMessage }) => void) | null
  postMessage: (message: unknown, transfer?: unknown[]) => void
}

/**
 * 把纯计算函数适配成 TaskProcessor Worker 入口。
 * 对标 Cesium `Workers/createTaskProcessorWorker.js`。
 *
 * @param workerFunction 计算函数
 */
export function createTaskProcessorWorker(
  workerFunction: TaskProcessorWorkerFunction,
): WorkerSelfLike {
  const workerSelf = globalThis as unknown as WorkerSelfLike

  async function onMessageHandler(event: { data: IncomingMessage }): Promise<void> {
    const data = event.data
    const transferableObjects: unknown[] = []
    const responseMessage: { id?: number | undefined; result?: unknown; error?: unknown } = {
      id: data.id,
      result: undefined,
      error: undefined,
    }
    if (defined(data.baseUrl)) {
      workerSelf.CESIUM_BASE_URL = data.baseUrl
    }

    try {
      responseMessage.result = await workerFunction(data.parameters, transferableObjects)
    } catch (error) {
      if (error instanceof Error) {
        responseMessage.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      } else {
        responseMessage.error = error
      }
    }

    if (!data.canTransferArrayBuffer) {
      transferableObjects.length = 0
    }

    try {
      workerSelf.postMessage(responseMessage, transferableObjects)
    } catch (error) {
      responseMessage.result = undefined
      responseMessage.error = `postMessage failed with error: ${formatError(error)}\n  with responseMessage: ${JSON.stringify(responseMessage)}`
      workerSelf.postMessage(responseMessage)
    }
  }

  function onMessageErrorHandler(event: { data?: IncomingMessage }): void {
    workerSelf.postMessage({
      id: event.data?.id,
      error: `postMessage failed with error: ${JSON.stringify(event)}`,
    })
  }

  workerSelf.onmessage = (event) => {
    void onMessageHandler(event)
  }
  workerSelf.onmessageerror = onMessageErrorHandler
  return workerSelf
}
