/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：未捆绑 XYS JSON。无样本时 `computeXysRadians` 返回 undefined（与 Cesium 数据未加载一致）。
 * 可通过 `preload` 注入样本后再算；完整分块下载留给后续。
 */

import { defined } from "./defined"
import { Iau2006XysSample } from "./Iau2006XysSample"

export interface Iau2006XysDataOptions {
  xysFileUrlTemplate?: string
  interpolationOrder?: number
  sampleZeroJulianEphemerisDate?: number
  stepSizeDays?: number
  samplesPerXysFile?: number
  totalSamples?: number
}

/**
 * IAU 2006 XYS 数据。对标 Cesium `Core/Iau2006XysData.js`。
 */
export class Iau2006XysData {
  private _samples: number[] | undefined

  /**
   * @param _options 预留：URL 模板等
   */
  constructor(_options?: Iau2006XysDataOptions) {
    this._samples = undefined
  }

  /**
   * 注入交错存储的 [x,y,s,...] 样本（测试 / 离线数据）。
   *
   * @param samples 样本
   */
  preload(samples: number[]): void {
    this._samples = samples.slice()
  }

  /**
   * 计算 XYS。无数据时返回 undefined。
   *
   * @param _dayTT TT 日
   * @param _secondTT TT 秒
   * @param result 可选结果
   */
  computeXysRadians(
    _dayTT: number,
    _secondTT: number,
    result?: Iau2006XysSample,
  ): Iau2006XysSample | undefined {
    const samples = this._samples
    if (!defined(samples) || samples.length < 3) {
      return undefined
    }
    const x = samples[0] ?? 0
    const y = samples[1] ?? 0
    const s = samples[2] ?? 0
    if (!defined(result)) {
      return new Iau2006XysSample(x, y, s)
    }
    result.x = x
    result.y = y
    result.s = s
    return result
  }
}
