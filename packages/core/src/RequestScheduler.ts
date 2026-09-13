/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：getServerKey 用 URL 而非 urijs。
 */

import { Check } from "./Check"
import { defer } from "./defer"
import { defined } from "./defined"
import { Event } from "./Event"
import { Heap } from "./Heap"
import { isBlobUri } from "./isBlobUri"
import { isDataUri } from "./isDataUri"
import type { Request } from "./Request"
import { RequestState } from "./RequestState"
import { RuntimeError } from "./RuntimeError"
import { getUrlConstructor } from "./whatwgUrl"

function sortRequests(a: Request, b: Request): number {
  return a.priority - b.priority
}

const statistics = {
  numberOfAttemptedRequests: 0,
  numberOfActiveRequests: 0,
  numberOfCancelledRequests: 0,
  numberOfCancelledActiveRequests: 0,
  numberOfFailedRequests: 0,
  numberOfActiveRequestsEver: 0,
  lastNumberOfActiveRequests: 0,
}

let priorityHeapLength = 20
const requestHeap = new Heap<Request>({ comparator: sortRequests })
requestHeap.maximumLength = priorityHeapLength
requestHeap.reserve(priorityHeapLength)

const activeRequests: Request[] = []
let numberOfActiveRequestsByServer: Record<string, number> = {}
const requestCompletedEvent = new Event<[unknown?]>()

function updatePriority(request: Request): void {
  if (defined(request.priorityFunction)) {
    request.priority = request.priorityFunction()
  }
}

function issueRequest(request: Request): Promise<unknown> {
  if (request.state === RequestState.UNISSUED) {
    request.state = RequestState.ISSUED
    request.deferred = defer()
  }
  return request.deferred!.promise
}

function getRequestReceivedFunction(request: Request): (results: unknown) => void {
  return (results: unknown) => {
    if (request.state === RequestState.CANCELLED) {
      return
    }
    const deferred = request.deferred
    --statistics.numberOfActiveRequests
    const key = request.serverKey ?? ""
    numberOfActiveRequestsByServer[key] = (numberOfActiveRequestsByServer[key] ?? 1) - 1
    requestCompletedEvent.raiseEvent()
    request.state = RequestState.RECEIVED
    request.deferred = undefined
    deferred?.resolve(results)
  }
}

function getRequestFailedFunction(request: Request): (error: unknown) => void {
  return (error: unknown) => {
    if (request.state === RequestState.CANCELLED) {
      return
    }
    ++statistics.numberOfFailedRequests
    --statistics.numberOfActiveRequests
    const key = request.serverKey ?? ""
    numberOfActiveRequestsByServer[key] = (numberOfActiveRequestsByServer[key] ?? 1) - 1
    requestCompletedEvent.raiseEvent(error)
    request.state = RequestState.FAILED
    request.deferred?.reject(error)
  }
}

function startRequest(request: Request): Promise<unknown> {
  const promise = issueRequest(request)
  request.state = RequestState.ACTIVE
  activeRequests.push(request)
  ++statistics.numberOfActiveRequests
  ++statistics.numberOfActiveRequestsEver
  const key = request.serverKey ?? ""
  numberOfActiveRequestsByServer[key] = (numberOfActiveRequestsByServer[key] ?? 0) + 1
  const requestFunction = request.requestFunction
  if (defined(requestFunction)) {
    requestFunction()
      .then(getRequestReceivedFunction(request))
      .catch(getRequestFailedFunction(request))
  }
  return promise
}

function cancelRequest(request: Request): void {
  const active = request.state === RequestState.ACTIVE
  request.state = RequestState.CANCELLED
  ++statistics.numberOfCancelledRequests
  if (defined(request.deferred)) {
    const deferred = request.deferred
    deferred.promise.catch(() => undefined)
    request.deferred = undefined
    deferred.reject(new RuntimeError(`Request cancelled: "${request.url}"`))
  }
  if (active) {
    --statistics.numberOfActiveRequests
    const key = request.serverKey ?? ""
    numberOfActiveRequestsByServer[key] = (numberOfActiveRequestsByServer[key] ?? 1) - 1
    ++statistics.numberOfCancelledActiveRequests
  }
  request.cancelFunction?.()
}

function updateStatistics(): void {
  if (!RequestScheduler.debugShowStatistics) {
    return
  }
  const host = globalThis as { console?: { log: (msg: string) => void } }
  if (statistics.numberOfActiveRequests === 0 && statistics.lastNumberOfActiveRequests > 0) {
    if (statistics.numberOfAttemptedRequests > 0) {
      host.console?.log(`Number of attempted requests: ${statistics.numberOfAttemptedRequests}`)
      statistics.numberOfAttemptedRequests = 0
    }
    if (statistics.numberOfCancelledRequests > 0) {
      host.console?.log(`Number of cancelled requests: ${statistics.numberOfCancelledRequests}`)
      statistics.numberOfCancelledRequests = 0
    }
    if (statistics.numberOfCancelledActiveRequests > 0) {
      host.console?.log(
        `Number of cancelled active requests: ${statistics.numberOfCancelledActiveRequests}`,
      )
      statistics.numberOfCancelledActiveRequests = 0
    }
    if (statistics.numberOfFailedRequests > 0) {
      host.console?.log(`Number of failed requests: ${statistics.numberOfFailedRequests}`)
      statistics.numberOfFailedRequests = 0
    }
  }
  statistics.lastNumberOfActiveRequests = statistics.numberOfActiveRequests
}

/**
 * 请求优先级调度。对标 Cesium `Core/RequestScheduler.js`。
 */
export const RequestScheduler = {
  maximumRequests: 50,
  maximumRequestsPerServer: 18,
  requestsByServer: {} as Record<string, number>,
  throttleRequests: true,
  debugShowStatistics: false,
  requestCompletedEvent,
  requestHeap,

  get statistics() {
    return statistics
  },

  get priorityHeapLength(): number {
    return priorityHeapLength
  },

  set priorityHeapLength(value: number) {
    if (value < priorityHeapLength) {
      while (requestHeap.length > value) {
        const request = requestHeap.pop()
        if (defined(request)) {
          cancelRequest(request)
        }
      }
    }
    priorityHeapLength = value
    requestHeap.maximumLength = value
    requestHeap.reserve(value)
  },

  serverHasOpenSlots(serverKey: string, desiredRequests?: number): boolean {
    const desired = desiredRequests ?? 1
    const maxRequests =
      RequestScheduler.requestsByServer[serverKey] ?? RequestScheduler.maximumRequestsPerServer
    return (numberOfActiveRequestsByServer[serverKey] ?? 0) + desired <= maxRequests
  },

  heapHasOpenSlots(desiredRequests: number): boolean {
    return requestHeap.length + desiredRequests <= priorityHeapLength
  },

  getServerKey(url: string): string {
    Check.typeOf.string("url", url)
    const Url = getUrlConstructor()
    const location = (globalThis as { location?: { href?: string } }).location
    const base = location?.href ?? "http://localhost/"
    let host = ""
    let protocol = "http:"
    if (Url) {
      try {
        const parsed = new Url(url, base)
        host = parsed.host
        protocol = parsed.protocol
      } catch {
        host = "localhost"
      }
    }
    let serverKey = host
    if (!serverKey.includes(":")) {
      serverKey = `${serverKey}:${protocol === "https:" ? "443" : "80"}`
    }
    if (!defined(numberOfActiveRequestsByServer[serverKey])) {
      numberOfActiveRequestsByServer[serverKey] = 0
    }
    return serverKey
  },

  request(request: Request): Promise<unknown> | undefined {
    Check.typeOf.object("request", request)
    Check.typeOf.string("request.url", request.url)
    Check.typeOf.func("request.requestFunction", request.requestFunction)
    const url = request.url ?? ""
    if (isDataUri(url) || isBlobUri(url)) {
      requestCompletedEvent.raiseEvent()
      request.state = RequestState.RECEIVED
      return request.requestFunction?.()
    }
    ++statistics.numberOfAttemptedRequests
    if (!defined(request.serverKey)) {
      request.serverKey = RequestScheduler.getServerKey(url)
    }
    if (
      RequestScheduler.throttleRequests &&
      request.throttleByServer &&
      !RequestScheduler.serverHasOpenSlots(request.serverKey)
    ) {
      return undefined
    }
    if (!RequestScheduler.throttleRequests || !request.throttle) {
      return startRequest(request)
    }
    if (activeRequests.length >= RequestScheduler.maximumRequests) {
      return undefined
    }
    updatePriority(request)
    const removedRequest = requestHeap.insert(request)
    if (defined(removedRequest)) {
      if (removedRequest === request) {
        return undefined
      }
      cancelRequest(removedRequest)
    }
    return issueRequest(request)
  },

  update(): void {
    let removeCount = 0
    const activeLength = activeRequests.length
    for (let i = 0; i < activeLength; ++i) {
      const request = activeRequests[i]
      if (!defined(request)) {
        continue
      }
      if (request.cancelled) {
        cancelRequest(request)
      }
      if (request.state !== RequestState.ACTIVE) {
        ++removeCount
        continue
      }
      if (removeCount > 0) {
        activeRequests[i - removeCount] = request
      }
    }
    activeRequests.length -= removeCount

    const issuedRequests = requestHeap.internalArray
    const issuedLength = requestHeap.length
    for (let i = 0; i < issuedLength; ++i) {
      const issued = issuedRequests[i]
      if (defined(issued)) {
        updatePriority(issued)
      }
    }
    requestHeap.resort()

    const openSlots = Math.max(RequestScheduler.maximumRequests - activeRequests.length, 0)
    let filledSlots = 0
    while (filledSlots < openSlots && requestHeap.length > 0) {
      const request = requestHeap.pop()
      if (!defined(request)) {
        break
      }
      if (request.cancelled) {
        cancelRequest(request)
        continue
      }
      if (
        request.throttleByServer &&
        !RequestScheduler.serverHasOpenSlots(request.serverKey ?? "")
      ) {
        cancelRequest(request)
        continue
      }
      void startRequest(request)
      ++filledSlots
    }
    updateStatistics()
  },

  clearForSpecs(): void {
    while (requestHeap.length > 0) {
      const request = requestHeap.pop()
      if (defined(request)) {
        cancelRequest(request)
      }
    }
    for (const request of activeRequests) {
      cancelRequest(request)
    }
    activeRequests.length = 0
    numberOfActiveRequestsByServer = {}
    statistics.numberOfAttemptedRequests = 0
    statistics.numberOfActiveRequests = 0
    statistics.numberOfCancelledRequests = 0
    statistics.numberOfCancelledActiveRequests = 0
    statistics.numberOfFailedRequests = 0
    statistics.numberOfActiveRequestsEver = 0
    statistics.lastNumberOfActiveRequests = 0
  },

  numberOfActiveRequestsByServer(serverKey: string): number | undefined {
    return numberOfActiveRequestsByServer[serverKey]
  },
}
