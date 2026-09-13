/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 视锥改写（checklist 1.6 / 架构 05）：
 * - 投影矩阵委托 `PerspectiveOffCenterFrustum`（WebGPU 0..1 + Reverse-Z）
 * - computeCullingVolume 保持 Cesium 平面语义
 *
 * 默认值相对 Cesium：near 0.1（Cesium 1.0），far 1e9（Cesium 5e8）。
 */

import { type Cartesian2 } from "./Cartesian2"
import { type Cartesian3 } from "./Cartesian3"
import { Check } from "./Check"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { CesiumMath } from "./CesiumMath"
import { type CullingVolume } from "./CullingVolume"
import { type Matrix4 } from "./Matrix4"
import { PerspectiveOffCenterFrustum } from "./PerspectiveOffCenterFrustum"

const DEFAULT_NEAR = 0.1
const DEFAULT_FAR = 1e9

export interface PerspectiveFrustumOptions {
  fov?: number
  aspectRatio?: number
  near?: number
  far?: number
  xOffset?: number
  yOffset?: number
}

/**
 * 刷新对称透视视锥的 off-center 参数。
 *
 * @param frustum 视锥
 */
function update(frustum: PerspectiveFrustum): void {
  if (
    !defined(frustum.fov) ||
    !defined(frustum.aspectRatio) ||
    !defined(frustum.near) ||
    !defined(frustum.far)
  ) {
    throw new DeveloperError("fov, aspectRatio, near, or far parameters are not set.")
  }
  const changed =
    frustum.fov !== frustum._fov ||
    frustum.aspectRatio !== frustum._aspectRatio ||
    frustum.near !== frustum._near ||
    frustum.far !== frustum._far ||
    frustum.xOffset !== frustum._xOffset ||
    frustum.yOffset !== frustum._yOffset
  if (!changed) {
    return
  }
  Check.typeOf.number.greaterThanOrEquals("fov", frustum.fov, 0.0)
  Check.typeOf.number.lessThan("fov", frustum.fov, Math.PI)
  Check.typeOf.number.greaterThanOrEquals("aspectRatio", frustum.aspectRatio, 0.0)
  Check.typeOf.number.greaterThanOrEquals("near", frustum.near, 0.0)
  if (frustum.near > frustum.far) {
    throw new DeveloperError("near must be less than far.")
  }
  frustum._aspectRatio = frustum.aspectRatio
  frustum._fov = frustum.fov
  frustum._fovy =
    frustum.aspectRatio <= 1
      ? frustum.fov
      : Math.atan(Math.tan(frustum.fov * 0.5) / frustum.aspectRatio) * 2.0
  frustum._near = frustum.near
  frustum._far = frustum.far
  frustum._sseDenominator = 2.0 * Math.tan(0.5 * frustum._fovy)
  frustum._xOffset = frustum.xOffset
  frustum._yOffset = frustum.yOffset

  const f = frustum._offCenterFrustum
  f.top = frustum.near * Math.tan(0.5 * frustum._fovy)
  f.bottom = -f.top
  f.right = frustum.aspectRatio * f.top
  f.left = -f.right
  f.near = frustum.near
  f.far = frustum.far
  f.right += frustum.xOffset
  f.left += frustum.xOffset
  f.top += frustum.yOffset
  f.bottom += frustum.yOffset
}

/**
 * 对称透视视锥（fov + aspect）。投影为 Reverse-Z。
 * 对标 Cesium `Core/PerspectiveFrustum.js`。
 */
export class PerspectiveFrustum {
  _offCenterFrustum: PerspectiveOffCenterFrustum
  fov: number | undefined
  _fov: number | undefined
  _fovy: number | undefined
  _sseDenominator: number | undefined
  aspectRatio: number | undefined
  _aspectRatio: number | undefined
  near: number
  _near: number | undefined
  far: number
  _far: number | undefined
  xOffset: number
  _xOffset: number
  yOffset: number
  _yOffset: number

  /**
   * @param options fov / aspectRatio；near 默认 0.1，far 默认 1e9
   */
  constructor(options?: PerspectiveFrustumOptions) {
    const opts = options ?? {}
    this._offCenterFrustum = new PerspectiveOffCenterFrustum()
    this.fov = opts.fov
    this._fov = undefined
    this._fovy = undefined
    this._sseDenominator = undefined
    this.aspectRatio = opts.aspectRatio
    this._aspectRatio = undefined
    this.near = opts.near ?? DEFAULT_NEAR
    this._near = this.near
    this.far = opts.far ?? DEFAULT_FAR
    this._far = this.far
    this.xOffset = opts.xOffset ?? 0.0
    this._xOffset = this.xOffset
    this.yOffset = opts.yOffset ?? 0.0
    this._yOffset = this.yOffset
  }

  /** pack 元素个数 */
  static packedLength = 6

  /**
   * 打包到数组。
   *
   * @param value 实例
   * @param array 目标
   * @param startingIndex 起始下标
   */
  static pack(value: PerspectiveFrustum, array: number[], startingIndex?: number): number[] {
    Check.typeOf.object("value", value)
    Check.defined("array", array)
    let i = startingIndex ?? 0
    array[i++] = value.fov ?? Number.NaN
    array[i++] = value.aspectRatio ?? Number.NaN
    array[i++] = value.near
    array[i++] = value.far
    array[i++] = value.xOffset
    array[i] = value.yOffset
    return array
  }

  /**
   * 从数组解包。
   *
   * @param array 源
   * @param startingIndex 起始下标
   * @param result 可选结果
   */
  static unpack(
    array: number[],
    startingIndex?: number,
    result?: PerspectiveFrustum,
  ): PerspectiveFrustum {
    Check.defined("array", array)
    let i = startingIndex ?? 0
    const out = defined(result) ? result : new PerspectiveFrustum()
    out.fov = array[i++]
    out.aspectRatio = array[i++]
    out.near = array[i++]!
    out.far = array[i++]!
    out.xOffset = array[i++]!
    out.yOffset = array[i]!
    return out
  }

  /** Reverse-Z 投影矩阵 */
  get projectionMatrix(): Matrix4 {
    update(this)
    return this._offCenterFrustum.projectionMatrix
  }

  /** 无穷远 Reverse-Z 投影矩阵 */
  get infiniteProjectionMatrix(): Matrix4 {
    update(this)
    return this._offCenterFrustum.infiniteProjectionMatrix
  }

  /** 垂直 fov（弧度） */
  get fovy(): number | undefined {
    update(this)
    return this._fovy
  }

  /** SSE 分母 */
  get sseDenominator(): number | undefined {
    update(this)
    return this._sseDenominator
  }

  /** 底层非对称视锥 */
  get offCenterFrustum(): PerspectiveOffCenterFrustum {
    update(this)
    return this._offCenterFrustum
  }

  /**
   * 生成 6 个裁剪平面。
   *
   * @param position 眼点
   * @param direction 视线
   * @param up 上方向
   */
  computeCullingVolume(position: Cartesian3, direction: Cartesian3, up: Cartesian3): CullingVolume {
    update(this)
    return this._offCenterFrustum.computeCullingVolume(position, direction, up)
  }

  /**
   * 某距离处像素尺寸。
   *
   * @param drawingBufferWidth 缓冲宽
   * @param drawingBufferHeight 缓冲高
   * @param distance 距离
   * @param pixelRatio 像素比
   * @param result 结果
   */
  getPixelDimensions(
    drawingBufferWidth: number,
    drawingBufferHeight: number,
    distance: number,
    pixelRatio: number,
    result: Cartesian2,
  ): Cartesian2 {
    update(this)
    return this._offCenterFrustum.getPixelDimensions(
      drawingBufferWidth,
      drawingBufferHeight,
      distance,
      pixelRatio,
      result,
    )
  }

  /**
   * 复制实例。
   *
   * @param result 可选结果
   */
  clone(result?: PerspectiveFrustum): PerspectiveFrustum {
    const out = defined(result) ? result : new PerspectiveFrustum()
    out.aspectRatio = this.aspectRatio
    out.fov = this.fov
    out.near = this.near
    out.far = this.far
    out._aspectRatio = undefined
    out._fov = undefined
    out._near = undefined
    out._far = undefined
    this._offCenterFrustum.clone(out._offCenterFrustum)
    return out
  }

  /**
   * 精确比较。
   *
   * @param other 另一视锥
   */
  equals(other?: PerspectiveFrustum): boolean {
    if (!defined(other) || !(other instanceof PerspectiveFrustum)) {
      return false
    }
    update(this)
    update(other)
    return (
      this.fov === other.fov &&
      this.aspectRatio === other.aspectRatio &&
      this._offCenterFrustum.equals(other._offCenterFrustum)
    )
  }

  /**
   * 容差比较。
   *
   * @param other 另一视锥
   * @param relativeEpsilon 相对容差
   * @param absoluteEpsilon 绝对容差
   */
  equalsEpsilon(
    other: PerspectiveFrustum,
    relativeEpsilon: number,
    absoluteEpsilon?: number,
  ): boolean {
    if (!defined(other) || !(other instanceof PerspectiveFrustum)) {
      return false
    }
    update(this)
    update(other)
    return (
      CesiumMath.equalsEpsilon(this.fov ?? 0, other.fov ?? 0, relativeEpsilon, absoluteEpsilon) &&
      CesiumMath.equalsEpsilon(
        this.aspectRatio ?? 0,
        other.aspectRatio ?? 0,
        relativeEpsilon,
        absoluteEpsilon,
      ) &&
      this._offCenterFrustum.equalsEpsilon(
        other._offCenterFrustum,
        relativeEpsilon,
        absoluteEpsilon,
      )
    )
  }
}
