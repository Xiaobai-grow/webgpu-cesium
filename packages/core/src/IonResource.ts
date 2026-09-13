/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：无 urijs；token 刷新只做一次 endpoint 重拉。
 */

import { Check } from "./Check"
import type { Credit } from "./Credit"
import { defined } from "./defined"
import { Ion } from "./Ion"
import { Resource, type ResourceOptions } from "./Resource"
import { RuntimeError } from "./RuntimeError"

/** ion 资产端点 */
export interface IonAssetEndpoint {
  url?: string
  externalType?: string
  options?: { url?: string }
  attributions?: { html?: string; collapsible?: boolean }[]
}

/** fromAssetId 选项 */
export interface IonResourceFromAssetIdOptions {
  accessToken?: string
  server?: string | Resource
}

/**
 * ion 资产 Resource。对标 Cesium `Core/IonResource.js`。
 */
export class IonResource extends Resource {
  readonly ionEndpoint: IonAssetEndpoint
  private readonly _ionEndpointResource: Resource
  private _ionRoot: IonResource | undefined
  private _credits: Credit[] | undefined
  readonly isExternal: boolean

  /**
   * @param endpoint ion 端点 JSON
   * @param endpointResource 端点请求
   */
  constructor(endpoint: IonAssetEndpoint, endpointResource: Resource) {
    Check.defined("endpoint", endpoint)
    Check.defined("endpointResource", endpointResource)
    const externalType = endpoint.externalType
    const isExternal = defined(externalType)
    let options: ResourceOptions
    if (!isExternal) {
      if (!defined(endpoint.url)) {
        throw new RuntimeError("Ion endpoint is missing url.")
      }
      options = { url: endpoint.url, retryAttempts: 1 }
    } else if (externalType === "3DTILES" || externalType === "STK_TERRAIN_SERVER") {
      const url = endpoint.options?.url
      if (!defined(url)) {
        throw new RuntimeError("Ion external asset is missing options.url.")
      }
      options = { url }
    } else {
      throw new RuntimeError(
        "Ion.createResource does not support external imagery assets; use an imagery provider instead.",
      )
    }
    super(options)
    this.ionEndpoint = endpoint
    this._ionEndpointResource = endpointResource
    this.isExternal = isExternal
  }

  get credits(): Credit[] {
    if (defined(this._ionRoot)) {
      return this._ionRoot.credits
    }
    if (defined(this._credits)) {
      return this._credits
    }
    this._credits = IonResource.getCreditsFromEndpoint(this.ionEndpoint, this._ionEndpointResource)
    return this._credits
  }

  /**
   * 从 ion 资产 ID 创建。
   *
   * @param assetId 资产 ID
   * @param options token / server
   */
  static async fromAssetId(
    assetId: number,
    options?: IonResourceFromAssetIdOptions,
  ): Promise<IonResource> {
    const endpointResource = IonResource.createEndpointResource(assetId, options)
    const endpoint = (await endpointResource.fetchJson()) as IonAssetEndpoint
    return new IonResource(endpoint, endpointResource)
  }

  /**
   * 端点 URL。
   *
   * @param assetId 资产 ID
   * @param options token / server
   */
  static createEndpointResource(
    assetId: number,
    options?: IonResourceFromAssetIdOptions,
  ): Resource {
    const accessToken = options?.accessToken ?? Ion.defaultAccessToken
    if (accessToken.length === 0) {
      throw new RuntimeError("Ion.defaultAccessToken is empty; set a Cesium ion access token.")
    }
    const server = options?.server
    const serverResource =
      server instanceof Resource ? server : new Resource({ url: server ?? Ion.defaultServer })
    serverResource.appendForwardSlash()
    return serverResource.getDerivedResource({
      url: `v1/assets/${assetId}/endpoint`,
      queryParameters: { access_token: accessToken },
    })
  }

  /**
   * 从端点提取 Credit。
   *
   * @param endpoint 端点
   * @param endpointResource 端点 Resource
   */
  static getCreditsFromEndpoint(endpoint: IonAssetEndpoint, endpointResource: Resource): Credit[] {
    const attributions = endpoint.attributions ?? []
    const credits = attributions.map((item) => Ion.getIonCredit(item))
    const token = endpointResource.queryParameters.access_token
    const tokenCredit = Ion.getDefaultTokenCredit(typeof token === "string" ? token : undefined)
    if (defined(tokenCredit)) {
      credits.push(tokenCredit)
    }
    return credits
  }

  /**
   * 克隆并指向同一 ion 根。
   *
   * @param result 可选复用
   */
  override clone(result?: Resource): Resource {
    const ionRoot = this._ionRoot ?? this
    const cloned =
      result instanceof IonResource
        ? result
        : new IonResource(ionRoot.ionEndpoint, ionRoot._ionEndpointResource)
    super.clone(cloned)
    cloned._ionRoot = ionRoot
    return cloned
  }
}
