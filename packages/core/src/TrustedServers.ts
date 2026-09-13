/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：原实现用 urijs；此处用 WHATWG URL。
 */

import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { getUrlConstructor } from "./whatwgUrl"

let servers: Record<string, boolean> = {}

function getAuthority(url: string): string | undefined {
  const Url = getUrlConstructor()
  if (!Url) {
    return undefined
  }
  try {
    const location = (globalThis as { location?: { protocol?: string } }).location
    const base = location?.protocol ? `${location.protocol}//localhost/` : "http://localhost/"
    const parsed = new Url(url, base)
    if (!parsed.host) {
      return undefined
    }
    let authority = parsed.host
    const at = authority.lastIndexOf("@")
    if (at !== -1) {
      authority = authority.slice(at + 1)
    }
    if (!authority.includes(":")) {
      const scheme = parsed.protocol.replace(/:$/, "") || "http"
      if (scheme === "http") {
        authority += ":80"
      } else if (scheme === "https") {
        authority += ":443"
      } else {
        return undefined
      }
    }
    return authority.toLowerCase()
  } catch {
    return undefined
  }
}

/**
 * 可信服务器登记。对标 Cesium `Core/TrustedServers.js`。
 */
export const TrustedServers = {
  add(host: string, port: number): void {
    if (!defined(host)) {
      throw new DeveloperError("host is required.")
    }
    if (!defined(port) || port <= 0) {
      throw new DeveloperError("port is required to be greater than 0.")
    }
    servers[`${host.toLowerCase()}:${port}`] = true
  },

  remove(host: string, port: number): void {
    if (!defined(host)) {
      throw new DeveloperError("host is required.")
    }
    if (!defined(port) || port <= 0) {
      throw new DeveloperError("port is required to be greater than 0.")
    }
    delete servers[`${host.toLowerCase()}:${port}`]
  },

  contains(url: string): boolean {
    if (!defined(url)) {
      throw new DeveloperError("url is required.")
    }
    const authority = getAuthority(url)
    return defined(authority) && servers[authority] === true
  },

  clear(): void {
    servers = {}
  },
}
