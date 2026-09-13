/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import type { Cartesian2 } from "./Cartesian2"
import type { Cartographic } from "./Cartographic"
import { DeveloperError } from "./DeveloperError"
import type { Ellipsoid } from "./Ellipsoid"
import type { MapProjection } from "./MapProjection"
import type { Rectangle } from "./Rectangle"

/**
 * 椭球面瓦片方案接口。
 * 对标 Cesium `Core/TilingScheme.js`。
 */
export class TilingScheme {
  /**
   * 被剖分的椭球。
   */
  readonly ellipsoid!: Ellipsoid

  /**
   * 覆盖范围（弧度）。
   */
  readonly rectangle!: Rectangle

  /**
   * 使用的地图投影。
   */
  readonly projection!: MapProjection

  /**
   * 不可直接实例化。
   *
   * @param _options 构造选项（子类使用）
   */
  constructor(_options?: object) {
    throw new DeveloperError(
      "This type should not be instantiated directly.  Instead, use WebMercatorTilingScheme or GeographicTilingScheme.",
    )
  }

  /**
   * 指定 LOD 的 X 方向瓦片数。
   *
   * @param _level LOD
   */
  getNumberOfXTilesAtLevel(_level: number): number {
    DeveloperError.throwInstantiationError()
  }

  /**
   * 指定 LOD 的 Y 方向瓦片数。
   *
   * @param _level LOD
   */
  getNumberOfYTilesAtLevel(_level: number): number {
    DeveloperError.throwInstantiationError()
  }

  /**
   * 经纬矩形转到瓦片方案本地坐标。
   *
   * @param _rectangle 经纬矩形
   * @param _result 可选结果对象
   */
  rectangleToNativeRectangle(_rectangle: Rectangle, _result?: Rectangle): Rectangle {
    DeveloperError.throwInstantiationError()
  }

  /**
   * 瓦片索引转到本地矩形。
   *
   * @param _x 列
   * @param _y 行
   * @param _level LOD
   * @param _result 可选结果对象
   */
  tileXYToNativeRectangle(_x: number, _y: number, _level: number, _result?: Rectangle): Rectangle {
    DeveloperError.throwInstantiationError()
  }

  /**
   * 瓦片索引转到经纬矩形。
   *
   * @param _x 列
   * @param _y 行
   * @param _level LOD
   * @param _result 可选结果对象
   */
  tileXYToRectangle(_x: number, _y: number, _level: number, _result?: Rectangle): Rectangle {
    DeveloperError.throwInstantiationError()
  }

  /**
   * 经纬高所在瓦片的 XY。
   *
   * @param _position 经纬高
   * @param _level LOD
   * @param _result 可选结果对象
   */
  positionToTileXY(
    _position: Cartographic,
    _level: number,
    _result?: Cartesian2,
  ): Cartesian2 | undefined {
    DeveloperError.throwInstantiationError()
  }
}
