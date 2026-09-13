/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { type Cartesian2 } from "./Cartesian2"
import { Cartographic } from "./Cartographic"
import { Check } from "./Check"
import { defined } from "./defined"
import { GeographicProjection } from "./GeographicProjection"
import { Intersect, type IntersectValue } from "./Intersect"
import { Rectangle } from "./Rectangle"

/** 可把 Cartographic 投到 2D 的投影（Cesium GeographicProjection 返回带 z 的点） */
export interface BoundingRectangleProjection {
  project(
    cartographic: Cartographic,
    result?: { x: number; y: number; z?: number },
  ): { x: number; y: number; z?: number }
}

const defaultProjection = new GeographicProjection()
const fromRectangleLowerLeft = new Cartographic()
const fromRectangleUpperRight = new Cartographic()

/**
 * 由角点、宽、高定义的二维包围矩形。
 * 对标 Cesium `Core/BoundingRectangle.js`。
 */
export class BoundingRectangle {
  x: number
  y: number
  width: number
  height: number

  /**
   * @param x 左下 x
   * @param y 左下 y
   * @param width 宽
   * @param height 高
   */
  constructor(x?: number, y?: number, width?: number, height?: number) {
    this.x = x ?? 0.0
    this.y = y ?? 0.0
    this.width = width ?? 0.0
    this.height = height ?? 0.0
  }

  /** pack 元素个数 */
  static packedLength = 4

  /**
   * 打包到数组。
   *
   * @param value 实例
   * @param array 目标数组
   * @param startingIndex 起始下标
   */
  static pack(value: BoundingRectangle, array: number[], startingIndex?: number): number[] {
    Check.typeOf.object("value", value)
    Check.defined("array", array)
    let i = startingIndex ?? 0
    array[i++] = value.x
    array[i++] = value.y
    array[i++] = value.width
    array[i] = value.height
    return array
  }

  /**
   * 从数组解包。
   *
   * @param array 源数组
   * @param startingIndex 起始下标
   * @param result 可选结果
   */
  static unpack(
    array: number[],
    startingIndex?: number,
    result?: BoundingRectangle,
  ): BoundingRectangle {
    Check.defined("array", array)
    let i = startingIndex ?? 0
    const out = defined(result) ? result : new BoundingRectangle()
    out.x = array[i++]!
    out.y = array[i++]!
    out.width = array[i++]!
    out.height = array[i]!
    return out
  }

  /**
   * 由二维点集构造左下角对齐的包围矩形。
   *
   * @param positions 点列
   * @param result 可选结果
   */
  static fromPoints(
    positions: Cartesian2[] | undefined,
    result?: BoundingRectangle,
  ): BoundingRectangle {
    const out = defined(result) ? result : new BoundingRectangle()
    if (!defined(positions) || positions.length === 0) {
      out.x = 0
      out.y = 0
      out.width = 0
      out.height = 0
      return out
    }
    const first = positions[0]!
    let minimumX = first.x
    let minimumY = first.y
    let maximumX = first.x
    let maximumY = first.y
    const length = positions.length
    for (let i = 1; i < length; i++) {
      const p = positions[i]!
      minimumX = Math.min(p.x, minimumX)
      maximumX = Math.max(p.x, maximumX)
      minimumY = Math.min(p.y, minimumY)
      maximumY = Math.max(p.y, maximumY)
    }
    out.x = minimumX
    out.y = minimumY
    out.width = maximumX - minimumX
    out.height = maximumY - minimumY
    return out
  }

  /**
   * 由地理 `Rectangle` 投影得到包围矩形。
   *
   * @param rectangle 地理矩形
   * @param projection 投影，默认 `GeographicProjection`
   * @param result 可选结果
   */
  static fromRectangle(
    rectangle: Rectangle | undefined,
    projection?: BoundingRectangleProjection,
    result?: BoundingRectangle,
  ): BoundingRectangle {
    const out = defined(result) ? result : new BoundingRectangle()
    if (!defined(rectangle)) {
      out.x = 0
      out.y = 0
      out.width = 0
      out.height = 0
      return out
    }
    const proj = projection ?? defaultProjection
    const lowerLeft = proj.project(Rectangle.southwest(rectangle, fromRectangleLowerLeft))
    const upperRight = proj.project(Rectangle.northeast(rectangle, fromRectangleUpperRight))
    out.x = lowerLeft.x
    out.y = lowerLeft.y
    out.width = upperRight.x - lowerLeft.x
    out.height = upperRight.y - lowerLeft.y
    return out
  }

  /**
   * 复制；`rectangle` 未定义时返回 undefined。
   *
   * @param rectangle 源
   * @param result 可选结果
   */
  static clone(
    rectangle?: BoundingRectangle,
    result?: BoundingRectangle,
  ): BoundingRectangle | undefined {
    if (!defined(rectangle)) {
      return undefined
    }
    if (!defined(result)) {
      return new BoundingRectangle(rectangle.x, rectangle.y, rectangle.width, rectangle.height)
    }
    result.x = rectangle.x
    result.y = rectangle.y
    result.width = rectangle.width
    result.height = rectangle.height
    return result
  }

  /**
   * 两个包围矩形的并。
   *
   * @param left 左
   * @param right 右
   * @param result 可选结果
   */
  static union(
    left: BoundingRectangle,
    right: BoundingRectangle,
    result?: BoundingRectangle,
  ): BoundingRectangle {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    const out = defined(result) ? result : new BoundingRectangle()
    const lowerLeftX = Math.min(left.x, right.x)
    const lowerLeftY = Math.min(left.y, right.y)
    const upperRightX = Math.max(left.x + left.width, right.x + right.width)
    const upperRightY = Math.max(left.y + left.height, right.y + right.height)
    out.x = lowerLeftX
    out.y = lowerLeftY
    out.width = upperRightX - lowerLeftX
    out.height = upperRightY - lowerLeftY
    return out
  }

  /**
   * 扩大矩形直到包含点。
   *
   * @param rectangle 源矩形
   * @param point 点
   * @param result 可选结果
   */
  static expand(
    rectangle: BoundingRectangle,
    point: Cartesian2,
    result?: BoundingRectangle,
  ): BoundingRectangle {
    Check.typeOf.object("rectangle", rectangle)
    Check.typeOf.object("point", point)
    const out = BoundingRectangle.clone(rectangle, result)!
    const width = point.x - out.x
    const height = point.y - out.y
    if (width > out.width) {
      out.width = width
    } else if (width < 0) {
      out.width -= width
      out.x = point.x
    }
    if (height > out.height) {
      out.height = height
    } else if (height < 0) {
      out.height -= height
      out.y = point.y
    }
    return out
  }

  /**
   * 两矩形是否相交。
   *
   * @param left 左
   * @param right 右
   */
  static intersect(left: BoundingRectangle, right: BoundingRectangle): IntersectValue {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    const leftX = left.x
    const leftY = left.y
    const rightX = right.x
    const rightY = right.y
    if (!(
      leftX > rightX + right.width ||
      leftX + left.width < rightX ||
      leftY + left.height < rightY ||
      leftY > rightY + right.height
    )) {
      return Intersect.INTERSECTING
    }
    return Intersect.OUTSIDE
  }

  /**
   * 分量比较。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left?: BoundingRectangle, right?: BoundingRectangle): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left.x === right.x &&
        left.y === right.y &&
        left.width === right.width &&
        left.height === right.height)
    )
  }

  /**
   * 复制自身。
   *
   * @param result 可选结果
   */
  clone(result?: BoundingRectangle): BoundingRectangle {
    return BoundingRectangle.clone(this, result)!
  }

  /**
   * 与另一矩形求交。
   *
   * @param right 另一矩形
   */
  intersect(right: BoundingRectangle): IntersectValue {
    return BoundingRectangle.intersect(this, right)
  }

  /**
   * 与另一矩形比较。
   *
   * @param right 右侧
   */
  equals(right?: BoundingRectangle): boolean {
    return BoundingRectangle.equals(this, right)
  }
}
