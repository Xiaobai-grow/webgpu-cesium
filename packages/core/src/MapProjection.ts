/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import type { Cartesian3 } from "./Cartesian3"
import type { Cartographic } from "./Cartographic"
import { DeveloperError } from "./DeveloperError"
import type { Ellipsoid } from "./Ellipsoid"

/**
 * 大地坐标到平面地图的投影接口。
 * 对标 Cesium `Core/MapProjection.js`。
 */
export class MapProjection {
  /**
   * 投影使用的椭球。
   */
  readonly ellipsoid!: Ellipsoid

  /**
   * 经纬高（弧度）投影到地图坐标（米）。
   *
   * @param _cartographic 经纬高
   * @param _result 可选结果对象
   */
  project(_cartographic: Cartographic, _result?: Cartesian3): Cartesian3 {
    DeveloperError.throwInstantiationError()
  }

  /**
   * 地图坐标（米）反投影到经纬高（弧度）。
   *
   * @param _cartesian 投影坐标
   * @param _result 可选结果对象
   */
  unproject(_cartesian: Cartesian3, _result?: Cartographic): Cartographic {
    DeveloperError.throwInstantiationError()
  }
}
