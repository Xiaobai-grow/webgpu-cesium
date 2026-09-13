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
import { Check } from "./Check"
import { defined } from "./defined"

/**
 * 从原点沿单位方向无限延伸的射线。
 * 对标 Cesium `Core/Ray.js`。
 */
export class Ray {
  origin: Cartesian3
  direction: Cartesian3

  /**
   * @param origin 原点，默认 `Cartesian3.ZERO`
   * @param direction 方向；非零时会被归一化
   */
  constructor(origin?: Cartesian3, direction?: Cartesian3) {
    const dir = Cartesian3.clone(direction ?? Cartesian3.ZERO)
    if (!Cartesian3.equals(dir, Cartesian3.ZERO)) {
      Cartesian3.normalize(dir, dir)
    }
    this.origin = Cartesian3.clone(origin ?? Cartesian3.ZERO)
    this.direction = dir
  }

  /**
   * 复制射线；`ray` 未定义时返回 undefined。
   *
   * @param ray 源
   * @param result 可选结果对象
   */
  static clone(ray?: Ray, result?: Ray): Ray | undefined {
    if (!defined(ray)) {
      return undefined
    }
    if (!defined(result)) {
      return new Ray(ray.origin, ray.direction)
    }
    result.origin = Cartesian3.clone(ray.origin)
    result.direction = Cartesian3.clone(ray.direction)
    return result
  }

  /**
   * 计算 `r(t) = origin + t * direction`。
   *
   * @param ray 射线
   * @param t 参数
   * @param result 可选结果点
   */
  static getPoint(ray: Ray, t: number, result?: Cartesian3): Cartesian3 {
    Check.typeOf.object("ray", ray)
    Check.typeOf.number("t", t)
    const out = defined(result) ? result : new Cartesian3()
    Cartesian3.multiplyByScalar(ray.direction, t, out)
    return Cartesian3.add(ray.origin, out, out)
  }
}
