/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：不内置 Cesium 评估 token，调用方必须设置 Ion.defaultAccessToken。
 */

import { Credit } from "./Credit"
import { Resource } from "./Resource"

/**
 * Cesium ion 默认设置。对标 Cesium `Core/Ion.js`。
 */
export const Ion = {
  /** 访问令牌；空则 ion API 会失败 */
  defaultAccessToken: "",
  /** ion API 根 */
  defaultServer: "https://api.cesium.com/",

  /**
   * 本项目无内置评估 token，恒为 undefined。
   *
   * @param _providedKey 调用方 token
   */
  getDefaultTokenCredit(_providedKey?: string): Credit | undefined {
    return undefined
  },

  /**
   * 从 ion attribution 构造 Credit。
   *
   * @param attribution ion 端点 attributions 项
   */
  getIonCredit(attribution: { html?: string; collapsible?: boolean }): Credit {
    return new Credit(attribution.html ?? "", attribution.collapsible !== true)
  },

  /**
   * ion 服务器 Resource。
   */
  getDefaultServerResource(): Resource {
    return new Resource({ url: Ion.defaultServer })
  },
}
