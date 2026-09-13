/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Cartesian2 } from "./Cartesian2"
import { Cartesian3 } from "./Cartesian3"
import { Check } from "./Check"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"

/**
 * 二维三角形裁剪与线段求交。
 * 对标 Cesium `Core/Intersections2D.js`。
 */
export const Intersections2D = {
  /**
   * 沿轴对齐阈值裁剪三角形，返回阈值一侧的多边形顶点描述。
   *
   * @param threshold 阈值
   * @param keepAbove true 保留阈值以上
   * @param u0 顶点 0 坐标
   * @param u1 顶点 1 坐标
   * @param u2 顶点 2 坐标
   * @param result 可选结果数组
   */
  clipTriangleAtAxisAlignedThreshold(
    threshold: number,
    keepAbove: boolean,
    u0: number,
    u1: number,
    u2: number,
    result?: number[],
  ): number[] {
    if (!defined(threshold)) {
      throw new DeveloperError("threshold is required.")
    }
    if (!defined(keepAbove)) {
      throw new DeveloperError("keepAbove is required.")
    }
    if (!defined(u0)) {
      throw new DeveloperError("u0 is required.")
    }
    if (!defined(u1)) {
      throw new DeveloperError("u1 is required.")
    }
    if (!defined(u2)) {
      throw new DeveloperError("u2 is required.")
    }
    const out = defined(result) ? result : []
    out.length = 0

    let u0Behind: boolean
    let u1Behind: boolean
    let u2Behind: boolean
    if (keepAbove) {
      u0Behind = u0 < threshold
      u1Behind = u1 < threshold
      u2Behind = u2 < threshold
    } else {
      u0Behind = u0 > threshold
      u1Behind = u1 > threshold
      u2Behind = u2 > threshold
    }
    const numBehind = Number(u0Behind) + Number(u1Behind) + Number(u2Behind)

    if (numBehind === 1) {
      if (u0Behind) {
        const u01Ratio = (threshold - u0) / (u1 - u0)
        const u02Ratio = (threshold - u0) / (u2 - u0)
        out.push(1)
        out.push(2)
        if (u02Ratio !== 1.0) {
          out.push(-1, 0, 2, u02Ratio)
        }
        if (u01Ratio !== 1.0) {
          out.push(-1, 0, 1, u01Ratio)
        }
      } else if (u1Behind) {
        const u12Ratio = (threshold - u1) / (u2 - u1)
        const u10Ratio = (threshold - u1) / (u0 - u1)
        out.push(2)
        out.push(0)
        if (u10Ratio !== 1.0) {
          out.push(-1, 1, 0, u10Ratio)
        }
        if (u12Ratio !== 1.0) {
          out.push(-1, 1, 2, u12Ratio)
        }
      } else if (u2Behind) {
        const u20Ratio = (threshold - u2) / (u0 - u2)
        const u21Ratio = (threshold - u2) / (u1 - u2)
        out.push(0)
        out.push(1)
        if (u21Ratio !== 1.0) {
          out.push(-1, 2, 1, u21Ratio)
        }
        if (u20Ratio !== 1.0) {
          out.push(-1, 2, 0, u20Ratio)
        }
      }
    } else if (numBehind === 2) {
      if (!u0Behind && u0 !== threshold) {
        const u10Ratio = (threshold - u1) / (u0 - u1)
        const u20Ratio = (threshold - u2) / (u0 - u2)
        out.push(0)
        out.push(-1, 1, 0, u10Ratio)
        out.push(-1, 2, 0, u20Ratio)
      } else if (!u1Behind && u1 !== threshold) {
        const u21Ratio = (threshold - u2) / (u1 - u2)
        const u01Ratio = (threshold - u0) / (u1 - u0)
        out.push(1)
        out.push(-1, 2, 1, u21Ratio)
        out.push(-1, 0, 1, u01Ratio)
      } else if (!u2Behind && u2 !== threshold) {
        const u02Ratio = (threshold - u0) / (u2 - u0)
        const u12Ratio = (threshold - u1) / (u2 - u1)
        out.push(2)
        out.push(-1, 0, 2, u02Ratio)
        out.push(-1, 1, 2, u12Ratio)
      }
    } else if (numBehind !== 3) {
      out.push(0, 1, 2)
    }
    return out
  },

  /**
   * 二维点在三角形内的重心坐标。
   *
   * @param x 查询点 x
   * @param y 查询点 y
   * @param x1 顶点 1 x
   * @param y1 顶点 1 y
   * @param x2 顶点 2 x
   * @param y2 顶点 2 y
   * @param x3 顶点 3 x
   * @param y3 顶点 3 y
   * @param result 可选结果
   */
  computeBarycentricCoordinates(
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    result?: Cartesian3,
  ): Cartesian3 {
    if (!defined(x)) {
      throw new DeveloperError("x is required.")
    }
    if (!defined(y)) {
      throw new DeveloperError("y is required.")
    }
    if (!defined(x1)) {
      throw new DeveloperError("x1 is required.")
    }
    if (!defined(y1)) {
      throw new DeveloperError("y1 is required.")
    }
    if (!defined(x2)) {
      throw new DeveloperError("x2 is required.")
    }
    if (!defined(y2)) {
      throw new DeveloperError("y2 is required.")
    }
    if (!defined(x3)) {
      throw new DeveloperError("x3 is required.")
    }
    if (!defined(y3)) {
      throw new DeveloperError("y3 is required.")
    }
    const x1mx3 = x1 - x3
    const x3mx2 = x3 - x2
    const y2my3 = y2 - y3
    const y1my3 = y1 - y3
    const inverseDeterminant = 1.0 / (y2my3 * x1mx3 + x3mx2 * y1my3)
    const ymy3 = y - y3
    const xmx3 = x - x3
    const l1 = (y2my3 * xmx3 + x3mx2 * ymy3) * inverseDeterminant
    const l2 = (-y1my3 * xmx3 + x1mx3 * ymy3) * inverseDeterminant
    const l3 = 1.0 - l1 - l2
    if (defined(result)) {
      result.x = l1
      result.y = l2
      result.z = l3
      return result
    }
    return new Cartesian3(l1, l2, l3)
  },

  /**
   * 两线段交点；平行 / 不相交返回 undefined。
   *
   * @param x00 第一段起点 x
   * @param y00 第一段起点 y
   * @param x01 第一段终点 x
   * @param y01 第一段终点 y
   * @param x10 第二段起点 x
   * @param y10 第二段起点 y
   * @param x11 第二段终点 x
   * @param y11 第二段终点 y
   * @param result 可选结果
   */
  computeLineSegmentLineSegmentIntersection(
    x00: number,
    y00: number,
    x01: number,
    y01: number,
    x10: number,
    y10: number,
    x11: number,
    y11: number,
    result?: Cartesian2,
  ): Cartesian2 | undefined {
    Check.typeOf.number("x00", x00)
    Check.typeOf.number("y00", y00)
    Check.typeOf.number("x01", x01)
    Check.typeOf.number("y01", y01)
    Check.typeOf.number("x10", x10)
    Check.typeOf.number("y10", y10)
    Check.typeOf.number("x11", x11)
    Check.typeOf.number("y11", y11)
    const numerator1A = (x11 - x10) * (y00 - y10) - (y11 - y10) * (x00 - x10)
    const numerator1B = (x01 - x00) * (y00 - y10) - (y01 - y00) * (x00 - x10)
    const denominator1 = (y11 - y10) * (x01 - x00) - (x11 - x10) * (y01 - y00)
    if (denominator1 === 0) {
      return undefined
    }
    const ua1 = numerator1A / denominator1
    const ub1 = numerator1B / denominator1
    if (ua1 >= 0 && ua1 <= 1 && ub1 >= 0 && ub1 <= 1) {
      const out = defined(result) ? result : new Cartesian2()
      out.x = x00 + ua1 * (x01 - x00)
      out.y = y00 + ua1 * (y01 - y00)
      return out
    }
    return undefined
  },
}
