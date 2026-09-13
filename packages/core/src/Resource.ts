/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：XHR / urijs / JSONP 改为 fetch + URL；fetchImage 通过可注入 createImageBitmap。
 */

import { appendForwardSlash } from "./appendForwardSlash"
import { Check } from "./Check"
import { clone } from "./clone"
import { combine } from "./combine"
import { defined } from "./defined"
import { getAbsoluteUri } from "./getAbsoluteUri"
import { getBaseUri } from "./getBaseUri"
import { isDataUri } from "./isDataUri"
import { objectToQuery } from "./objectToQuery"
import { queryToObject } from "./queryToObject"
import type { Proxy } from "./Proxy"
import { Request } from "./Request"
import { RequestErrorEvent } from "./RequestErrorEvent"
import { RuntimeError } from "./RuntimeError"
import { getUrlConstructor } from "./whatwgUrl"

/** query 值 */
export type QueryValue = string | string[] | undefined
export type QueryParameters = Record<string, QueryValue>
export type TemplateValues = Record<string, string | undefined>
export type ResourceHeaders = Record<string, string>

/** 可注入 fetch */
export interface FetchInitLike {
  method?: string
  headers?: ResourceHeaders
  body?: unknown
}

export interface FetchResponseLike {
  ok: boolean
  status: number
  statusText: string
  headers: { get: (name: string) => string | null }
  arrayBuffer: () => Promise<ArrayBuffer>
  text: () => Promise<string>
  json: () => Promise<unknown>
  blob: () => Promise<unknown>
}

export type FetchFn = (input: string, init?: FetchInitLike) => Promise<FetchResponseLike>

/** createImageBitmap 注入 */
export type CreateImageBitmapFn = (image: unknown, options?: object) => Promise<unknown>

export type ResourceRetryCallback = (
  resource: Resource,
  error: RequestErrorEvent,
) => boolean | Promise<boolean>

/** Resource 构造选项 */
export interface ResourceOptions {
  url: string
  queryParameters?: QueryParameters
  templateValues?: TemplateValues
  headers?: ResourceHeaders
  proxy?: Proxy | undefined
  retryCallback?: ResourceRetryCallback | undefined
  retryAttempts?: number | undefined
  request?: Request | undefined
  parseUrl?: boolean | undefined
}

export interface DerivedResourceOptions {
  url?: string
  queryParameters?: QueryParameters
  templateValues?: TemplateValues
  headers?: ResourceHeaders
  proxy?: Proxy
  retryCallback?: ResourceRetryCallback
  retryAttempts?: number
  request?: Request
  preserveQueryParameters?: boolean
}

function defaultClone<T>(value: T | undefined, fallback: T): T {
  return defined(value) ? clone(value) : fallback
}

function parseQueryString(queryString: string): QueryParameters {
  if (queryString.length === 0) {
    return {}
  }
  if (!queryString.includes("=")) {
    return { [queryString]: undefined }
  }
  return queryToObject(queryString)
}

function combineQueryParameters(
  q1: QueryParameters,
  q2: QueryParameters,
  preserveQueryParameters: boolean,
): QueryParameters {
  if (!preserveQueryParameters) {
    return combine(q1, q2) as QueryParameters
  }
  const result = clone(q1, true)
  for (const param of Object.keys(q2)) {
    const q2Value = q2[param]
    const value = result[param]
    if (defined(value)) {
      const asArray = Array.isArray(value) ? value : [value]
      result[param] = asArray.concat(q2Value!)
    } else {
      result[param] = Array.isArray(q2Value) ? q2Value.slice() : q2Value
    }
  }
  return result
}

function stringifyQuery(queryObject: QueryParameters): string {
  const keys = Object.keys(queryObject)
  if (keys.length === 0) {
    return ""
  }
  if (keys.length === 1) {
    const only = keys[0]
    if (defined(only) && !defined(queryObject[only])) {
      return `?${only}`
    }
  }
  return `?${objectToQuery(queryObject)}`
}

function headersFromResponse(response: FetchResponseLike): Record<string, string> {
  const headers: Record<string, string> = {}
  const contentType = response.headers.get("content-type")
  if (defined(contentType)) {
    headers["Content-Type"] = contentType
  }
  return headers
}

/**
 * 资源定位与拉取。对标 Cesium `Core/Resource.js`（fetch 改写）。
 */
export class Resource {
  private _url: string
  private _queryParameters: QueryParameters
  private _templateValues: TemplateValues
  headers: ResourceHeaders
  request: Request
  proxy: Proxy | undefined
  retryCallback: ResourceRetryCallback | undefined
  retryAttempts: number
  private _retryCount = 0

  /** 测试可替换的 fetch */
  static fetchImpl: FetchFn | undefined
  /** 测试可替换的 createImageBitmap */
  static createImageBitmap: CreateImageBitmapFn | undefined
  static DEFAULT: Resource

  /**
   * @param options url 或选项对象
   */
  constructor(options: string | ResourceOptions) {
    const resolved: ResourceOptions = typeof options === "string" ? { url: options } : options
    Check.typeOf.string("options.url", resolved.url)
    this._templateValues = defaultClone(resolved.templateValues, {})
    this._queryParameters = defaultClone(resolved.queryParameters, {})
    this.headers = defaultClone(resolved.headers, {})
    this.request = resolved.request ?? new Request()
    this.proxy = resolved.proxy
    this.retryCallback = resolved.retryCallback
    this.retryAttempts = resolved.retryAttempts ?? 0
    this._url = resolved.url
    const parseUrl = resolved.parseUrl ?? true
    if (parseUrl) {
      this.parseUrl(resolved.url, true, true)
    }
  }

  get url(): string {
    return this.getUrlComponent(true, true)
  }

  set url(value: string) {
    this.parseUrl(value, false, true)
  }

  get queryParameters(): QueryParameters {
    return this._queryParameters
  }

  get templateValues(): TemplateValues {
    return this._templateValues
  }

  get isDataUri(): boolean {
    return isDataUri(this._url)
  }

  static createIfNeeded(resource: Resource | string): Resource {
    if (resource instanceof Resource) {
      return resource.getDerivedResource({ request: resource.request })
    }
    return new Resource({ url: resource })
  }

  /**
   * 解析 url，拆出 query。
   */
  parseUrl(url: string, merge: boolean, preserveQuery: boolean, baseUrl?: string): void {
    const Url = getUrlConstructor()
    let query: QueryParameters = {}
    let stored = url
    if (Url) {
      try {
        const base = baseUrl ?? getAbsoluteUri(url)
        const parsed = new Url(url, base)
        const search = parsed.search.startsWith("?") ? parsed.search.slice(1) : parsed.search
        query = parseQueryString(search)
        parsed.search = ""
        parsed.hash = ""
        stored = parsed.href
      } catch {
        const q = url.indexOf("?")
        if (q >= 0) {
          query = parseQueryString(url.slice(q + 1).split("#")[0] ?? "")
          stored = url.slice(0, q)
        }
      }
    } else {
      const q = url.indexOf("?")
      if (q >= 0) {
        query = parseQueryString(url.slice(q + 1).split("#")[0] ?? "")
        stored = url.slice(0, q)
      }
    }
    this._queryParameters = merge
      ? combineQueryParameters(query, this._queryParameters, preserveQuery)
      : query
    this._url = stored
  }

  getUrlComponent(query?: boolean, proxy?: boolean): string {
    if (this.isDataUri) {
      return this._url
    }
    let url = this._url
    if (query) {
      url = `${url}${stringifyQuery(this._queryParameters)}`
    }
    url = url.replace(/%7B/g, "{").replace(/%7D/g, "}")
    const templateValues = this._templateValues
    if (Object.keys(templateValues).length > 0) {
      url = url.replace(/{(.*?)}/g, (match, key: string) => {
        const replacement = templateValues[key]
        return defined(replacement) ? encodeURIComponent(replacement) : match
      })
    }
    if (proxy && defined(this.proxy)) {
      url = this.proxy.getURL(url)
    }
    return url
  }

  setQueryParameters(params: QueryParameters, useAsDefault?: boolean): void {
    if (useAsDefault) {
      this._queryParameters = combineQueryParameters(this._queryParameters, params, false)
    } else {
      this._queryParameters = combineQueryParameters(params, this._queryParameters, false)
    }
  }

  appendQueryParameters(params: QueryParameters): void {
    this._queryParameters = combineQueryParameters(params, this._queryParameters, true)
  }

  setTemplateValues(template: TemplateValues, useAsDefault?: boolean): void {
    if (useAsDefault) {
      this._templateValues = combine(this._templateValues, template) as TemplateValues
    } else {
      this._templateValues = combine(template, this._templateValues) as TemplateValues
    }
  }

  getDerivedResource(options: DerivedResourceOptions): Resource {
    const resource = this.clone()
    resource._retryCount = 0
    if (defined(options.url)) {
      resource.parseUrl(options.url, true, options.preserveQueryParameters ?? false, this._url)
    }
    if (defined(options.queryParameters)) {
      resource._queryParameters = combine(
        options.queryParameters,
        resource.queryParameters,
      ) as QueryParameters
    }
    if (defined(options.templateValues)) {
      resource._templateValues = combine(
        options.templateValues,
        resource.templateValues,
      ) as TemplateValues
    }
    if (defined(options.headers)) {
      resource.headers = combine(options.headers, resource.headers) as ResourceHeaders
    }
    if (defined(options.proxy)) {
      resource.proxy = options.proxy
    }
    if (defined(options.request)) {
      resource.request = options.request
    }
    if (defined(options.retryCallback)) {
      resource.retryCallback = options.retryCallback
    }
    if (defined(options.retryAttempts)) {
      resource.retryAttempts = options.retryAttempts
    }
    return resource
  }

  retryOnError(error: RequestErrorEvent): Promise<boolean> {
    const retryCallback = this.retryCallback
    if (typeof retryCallback !== "function" || this._retryCount >= this.retryAttempts) {
      return Promise.resolve(false)
    }
    return Promise.resolve(retryCallback(this, error)).then((result) => {
      ++this._retryCount
      return result
    })
  }

  clone(result?: Resource): Resource {
    if (!defined(result)) {
      return new Resource({
        url: this._url,
        queryParameters: this.queryParameters,
        templateValues: this.templateValues,
        headers: this.headers,
        proxy: this.proxy,
        retryCallback: this.retryCallback,
        retryAttempts: this.retryAttempts,
        request: this.request.clone(),
        parseUrl: false,
      })
    }
    result._url = this._url
    result._queryParameters = clone(this._queryParameters)
    result._templateValues = clone(this._templateValues)
    result.headers = clone(this.headers)
    result.proxy = this.proxy
    result.retryCallback = this.retryCallback
    result.retryAttempts = this.retryAttempts
    result._retryCount = 0
    result.request = this.request.clone()
    return result
  }

  getBaseUri(includeQuery?: boolean): string {
    return getBaseUri(this.getUrlComponent(includeQuery), includeQuery)
  }

  appendForwardSlash(): void {
    this._url = appendForwardSlash(this._url)
  }

  private getFetch(): FetchFn {
    const impl = Resource.fetchImpl ?? (globalThis as { fetch?: FetchFn }).fetch
    if (!defined(impl)) {
      throw new RuntimeError("globalThis.fetch is not available; set Resource.fetchImpl for tests.")
    }
    return impl
  }

  private async performFetch(method: string, body?: unknown): Promise<FetchResponseLike> {
    const fetchFn = this.getFetch()
    const url = this.getUrlComponent(true, true)
    const response = await fetchFn(url, {
      method,
      headers: this.headers,
      body,
    })
    if (!response.ok) {
      let payload: unknown
      try {
        payload = await response.text()
      } catch {
        payload = undefined
      }
      // Cesium 抛出 RequestErrorEvent（非 Error 子类）
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 对齐 Cesium RequestErrorEvent
      throw new RequestErrorEvent(response.status, payload, headersFromResponse(response))
    }
    return response
  }

  async fetch(options?: { method?: string; body?: unknown }): Promise<unknown> {
    const response = await this.performFetch(options?.method ?? "GET", options?.body)
    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      return response.json()
    }
    return response.text()
  }

  async fetchJson(): Promise<unknown> {
    const response = await this.performFetch("GET")
    return response.json()
  }

  async fetchText(): Promise<string> {
    const response = await this.performFetch("GET")
    return response.text()
  }

  async fetchArrayBuffer(): Promise<ArrayBuffer> {
    const response = await this.performFetch("GET")
    return response.arrayBuffer()
  }

  /**
   * 拉图像。Node 测试注入 `Resource.createImageBitmap`。
   */
  async fetchImage(options?: { flipY?: boolean; preferImageBitmap?: boolean }): Promise<unknown> {
    const response = await this.performFetch("GET")
    const blob = await response.blob()
    const create =
      Resource.createImageBitmap ??
      (globalThis as { createImageBitmap?: CreateImageBitmapFn }).createImageBitmap
    if (!defined(create)) {
      throw new RuntimeError(
        "createImageBitmap is not available; inject Resource.createImageBitmap.",
      )
    }
    const imageOrientation = options?.flipY ? "flipY" : "none"
    return create(blob, { imageOrientation, premultiplyAlpha: "none" })
  }

  static fetch(options: ResourceOptions): Promise<unknown> {
    return new Resource(options).fetch()
  }

  static fetchJson(options: ResourceOptions): Promise<unknown> {
    return new Resource(options).fetchJson()
  }

  static fetchText(options: ResourceOptions): Promise<string> {
    return new Resource(options).fetchText()
  }

  static fetchArrayBuffer(options: ResourceOptions): Promise<ArrayBuffer> {
    return new Resource(options).fetchArrayBuffer()
  }

  static fetchImage(options: ResourceOptions & { flipY?: boolean }): Promise<unknown> {
    return new Resource(options).fetchImage(options)
  }

  toString(): string {
    return this.url
  }
}

Resource.DEFAULT = Object.freeze(new Resource({ url: "/", parseUrl: false })) as Resource
