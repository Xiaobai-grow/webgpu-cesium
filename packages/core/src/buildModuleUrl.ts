/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：不用 document / CESIUM_BASE_URL 脚本探测 / AMD require。
 * 通过 `buildModuleUrl.setBaseUrl` 或 `globalThis.CESIUM_BASE_URL` 注入基址。
 */

import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { getAbsoluteUri } from "./getAbsoluteUri"

let configuredBaseUrl: string | undefined

function readGlobalBaseUrl(): string | undefined {
  const value = (globalThis as Record<string, unknown>).CESIUM_BASE_URL
  return typeof value === "string" ? value : undefined
}

function getBaseUrl(): string {
  if (defined(configuredBaseUrl)) {
    return configuredBaseUrl
  }
  const fromGlobal = readGlobalBaseUrl()
  if (defined(fromGlobal)) {
    configuredBaseUrl = fromGlobal.endsWith("/") ? fromGlobal : `${fromGlobal}/`
    return configuredBaseUrl
  }
  configuredBaseUrl = "./"
  return configuredBaseUrl
}

/**
 * 设置模块基址。
 *
 * @param url 基址
 */
function setBaseUrl(url: string): void {
  configuredBaseUrl = url.endsWith("/") ? url : `${url}/`
}

/**
 * 把相对模块路径接到基址上。对标 Cesium `Core/buildModuleUrl.js`。
 *
 * @param moduleId 相对路径
 */
export function buildModuleUrl(moduleId: string): string {
  if (typeof moduleId !== "string") {
    throw new DeveloperError("moduleId must be a string.")
  }
  return getAbsoluteUri(moduleId, getBaseUrl())
}

buildModuleUrl.setBaseUrl = setBaseUrl
