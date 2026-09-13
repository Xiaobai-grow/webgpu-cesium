/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import type { Ellipsoid } from "./Ellipsoid"

const scratchCartographic = new Cartographic()

/**
 * 垂直夸张。对标 Cesium `Core/VerticalExaggeration.js`。
 */
export const VerticalExaggeration = {
  /**
   * 相对某高度做缩放。
   *
   * @param height 原始高
   * @param scale 夸张系数，1 为无效果
   * @param relativeHeight 相对高度（0 表示相对椭球面）
   */
  getHeight(height: number, scale: number, relativeHeight: number): number {
    if (!Number.isFinite(scale)) {
      throw new DeveloperError("scale must be a finite number.")
    }
    if (!Number.isFinite(relativeHeight)) {
      throw new DeveloperError("relativeHeight must be a finite number.")
    }
    return (height - relativeHeight) * scale + relativeHeight
  },

  /**
   * 把 ECEF 点按垂直夸张重投影。
   *
   * @param position 原位置
   * @param ellipsoid 椭球
   * @param verticalExaggeration 夸张系数
   * @param verticalExaggerationRelativeHeight 相对高度
   * @param result 可选结果
   */
  getPosition(
    position: Cartesian3,
    ellipsoid: Ellipsoid,
    verticalExaggeration: number,
    verticalExaggerationRelativeHeight: number,
    result?: Cartesian3,
  ): Cartesian3 {
    const cartographic = ellipsoid.cartesianToCartographic(position, scratchCartographic)
    if (!defined(cartographic)) {
      return Cartesian3.clone(position, result)
    }
    const newHeight = VerticalExaggeration.getHeight(
      cartographic.height,
      verticalExaggeration,
      verticalExaggerationRelativeHeight,
    )
    return Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      newHeight,
      ellipsoid,
      result,
    )
  },
}
