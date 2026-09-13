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
import { Intersect, type IntersectValue } from "./Intersect"
import type { Plane } from "./Plane"

let intersectScratch = new Cartesian3()

/**
 * 轴对齐包围盒。
 * 对标 Cesium `Core/AxisAlignedBoundingBox.js`。
 */
export class AxisAlignedBoundingBox {
  minimum: Cartesian3
  maximum: Cartesian3
  center: Cartesian3

  /**
   * @param minimum 各轴最小点
   * @param maximum 各轴最大点
   * @param center 中心；省略则取 min/max 中点
   */
  constructor(minimum?: Cartesian3, maximum?: Cartesian3, center?: Cartesian3) {
    this.minimum = Cartesian3.clone(minimum ?? Cartesian3.ZERO)
    this.maximum = Cartesian3.clone(maximum ?? Cartesian3.ZERO)
    this.center = defined(center)
      ? Cartesian3.clone(center)
      : Cartesian3.midpoint(this.minimum, this.maximum, new Cartesian3())
  }

  /**
   * 由对角点构造。
   *
   * @param minimum 最小角
   * @param maximum 最大角
   * @param result 可选结果
   */
  static fromCorners(
    minimum: Cartesian3,
    maximum: Cartesian3,
    result?: AxisAlignedBoundingBox,
  ): AxisAlignedBoundingBox {
    Check.defined("minimum", minimum)
    Check.defined("maximum", maximum)
    const out = defined(result) ? result : new AxisAlignedBoundingBox()
    out.minimum = Cartesian3.clone(minimum, out.minimum)
    out.maximum = Cartesian3.clone(maximum, out.maximum)
    out.center = Cartesian3.midpoint(minimum, maximum, out.center)
    return out
  }

  /**
   * 由点集求 AABB。
   *
   * @param positions 点列
   * @param result 可选结果
   */
  static fromPoints(
    positions: Cartesian3[] | undefined,
    result?: AxisAlignedBoundingBox,
  ): AxisAlignedBoundingBox {
    const out = defined(result) ? result : new AxisAlignedBoundingBox()
    if (!defined(positions) || positions.length === 0) {
      out.minimum = Cartesian3.clone(Cartesian3.ZERO, out.minimum)
      out.maximum = Cartesian3.clone(Cartesian3.ZERO, out.maximum)
      out.center = Cartesian3.clone(Cartesian3.ZERO, out.center)
      return out
    }
    const first = positions[0]!
    let minimumX = first.x
    let minimumY = first.y
    let minimumZ = first.z
    let maximumX = first.x
    let maximumY = first.y
    let maximumZ = first.z
    const length = positions.length
    for (let i = 1; i < length; i++) {
      const p = positions[i]!
      minimumX = Math.min(p.x, minimumX)
      maximumX = Math.max(p.x, maximumX)
      minimumY = Math.min(p.y, minimumY)
      maximumY = Math.max(p.y, maximumY)
      minimumZ = Math.min(p.z, minimumZ)
      maximumZ = Math.max(p.z, maximumZ)
    }
    out.minimum.x = minimumX
    out.minimum.y = minimumY
    out.minimum.z = minimumZ
    out.maximum.x = maximumX
    out.maximum.y = maximumY
    out.maximum.z = maximumZ
    out.center = Cartesian3.midpoint(out.minimum, out.maximum, out.center)
    return out
  }

  /**
   * 复制；`box` 未定义时返回 undefined。
   *
   * @param box 源
   * @param result 可选结果
   */
  static clone(
    box?: AxisAlignedBoundingBox,
    result?: AxisAlignedBoundingBox,
  ): AxisAlignedBoundingBox | undefined {
    if (!defined(box)) {
      return undefined
    }
    if (!defined(result)) {
      return new AxisAlignedBoundingBox(box.minimum, box.maximum, box.center)
    }
    result.minimum = Cartesian3.clone(box.minimum, result.minimum)
    result.maximum = Cartesian3.clone(box.maximum, result.maximum)
    result.center = Cartesian3.clone(box.center, result.center)
    return result
  }

  /**
   * 分量比较。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left?: AxisAlignedBoundingBox, right?: AxisAlignedBoundingBox): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Cartesian3.equals(left.center, right.center) &&
        Cartesian3.equals(left.minimum, right.minimum) &&
        Cartesian3.equals(left.maximum, right.maximum))
    )
  }

  /**
   * 盒子相对平面的内外侧（法线指向内侧）。
   *
   * @param box 盒子
   * @param plane 平面
   */
  static intersectPlane(box: AxisAlignedBoundingBox, plane: Plane): IntersectValue {
    Check.defined("box", box)
    Check.defined("plane", plane)
    intersectScratch = Cartesian3.subtract(box.maximum, box.minimum, intersectScratch)
    const h = Cartesian3.multiplyByScalar(intersectScratch, 0.5, intersectScratch)
    const normal = plane.normal
    const e = h.x * Math.abs(normal.x) + h.y * Math.abs(normal.y) + h.z * Math.abs(normal.z)
    const s = Cartesian3.dot(box.center, normal) + plane.distance
    if (s - e > 0) {
      return Intersect.INSIDE
    }
    if (s + e < 0) {
      return Intersect.OUTSIDE
    }
    return Intersect.INTERSECTING
  }

  /**
   * 两个 AABB 是否相交。
   *
   * @param box 第一个
   * @param other 第二个
   */
  static intersectAxisAlignedBoundingBox(
    box: AxisAlignedBoundingBox,
    other: AxisAlignedBoundingBox,
  ): boolean {
    Check.defined("box", box)
    Check.defined("other", other)
    return (
      box.minimum.x <= other.maximum.x &&
      box.maximum.x >= other.minimum.x &&
      box.minimum.y <= other.maximum.y &&
      box.maximum.y >= other.minimum.y &&
      box.minimum.z <= other.maximum.z &&
      box.maximum.z >= other.minimum.z
    )
  }

  /**
   * 复制自身。
   *
   * @param result 可选结果
   */
  clone(result?: AxisAlignedBoundingBox): AxisAlignedBoundingBox {
    return AxisAlignedBoundingBox.clone(this, result)!
  }

  /**
   * 相对平面的内外侧。
   *
   * @param plane 平面
   */
  intersectPlane(plane: Plane): IntersectValue {
    return AxisAlignedBoundingBox.intersectPlane(this, plane)
  }

  /**
   * 与另一 AABB 是否相交。
   *
   * @param other 另一盒子
   */
  intersectAxisAlignedBoundingBox(other: AxisAlignedBoundingBox): boolean {
    return AxisAlignedBoundingBox.intersectAxisAlignedBoundingBox(this, other)
  }

  /**
   * 与另一盒子比较。
   *
   * @param right 右侧
   */
  equals(right?: AxisAlignedBoundingBox): boolean {
    return AxisAlignedBoundingBox.equals(this, right)
  }
}
