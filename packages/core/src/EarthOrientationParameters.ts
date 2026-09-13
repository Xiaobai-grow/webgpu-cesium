/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：完整 JSON EOP 表解析留待注入数据后扩展。无数据时与 Cesium 空表一样返回全 0。
 */

import { defined } from "./defined"
import { EarthOrientationParametersSample } from "./EarthOrientationParametersSample"
import type { JulianDate } from "./JulianDate"

export interface EarthOrientationParametersOptions {
  data?: unknown
  addNewLeapSeconds?: boolean
}

/**
 * 地球定向参数。对标 Cesium `Core/EarthOrientationParameters.js`。
 */
export class EarthOrientationParameters {
  /**
   * 全 0 EOP（Cesium `NONE`）。
   */
  static readonly NONE = new EarthOrientationParameters()

  /**
   * @param _options 预留：后续可注入 EOP JSON
   */
  constructor(_options?: EarthOrientationParametersOptions) {
    // 无数据时 compute 返回 0
  }

  /**
   * 计算给定时刻的 EOP。无数据时全部为 0。
   *
   * @param _date 时刻
   * @param result 可选结果
   */
  compute(
    _date: JulianDate,
    result?: EarthOrientationParametersSample,
  ): EarthOrientationParametersSample | undefined {
    if (!defined(result)) {
      return new EarthOrientationParametersSample(0.0, 0.0, 0.0, 0.0, 0.0)
    }
    result.xPoleWander = 0.0
    result.yPoleWander = 0.0
    result.xPoleOffset = 0.0
    result.yPoleOffset = 0.0
    result.ut1MinusUtc = 0.0
    return result
  }
}
