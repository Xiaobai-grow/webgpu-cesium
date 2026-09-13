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

/**
 * 局部坐标系下的 heading / pitch / range。
 * 对标 Cesium `Core/HeadingPitchRange.js`。
 */
export class HeadingPitchRange {
  heading: number
  pitch: number
  range: number

  /**
   * @param heading 从东向南的航向，弧度
   * @param pitch 相对局部 xy 平面，弧度
   * @param range 到原点距离，米
   */
  constructor(heading?: number, pitch?: number, range?: number) {
    this.heading = heading ?? 0.0
    this.pitch = pitch ?? 0.0
    this.range = range ?? 0.0
  }

  /**
   * 复制实例；`hpr` 未定义时返回 undefined。
   *
   * @param hpr 源
   * @param result 可选结果对象
   */
  static clone(hpr?: HeadingPitchRange, result?: HeadingPitchRange): HeadingPitchRange | undefined {
    if (!defined(hpr)) {
      return undefined
    }
    if (!defined(result)) {
      return new HeadingPitchRange(hpr.heading, hpr.pitch, hpr.range)
    }
    result.heading = hpr.heading
    result.pitch = hpr.pitch
    result.range = hpr.range
    return result
  }
}
