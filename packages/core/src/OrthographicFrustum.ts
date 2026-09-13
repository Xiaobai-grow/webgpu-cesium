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
 * - 投影矩阵委托 `OrthographicOffCenterFrustum`（WebGPU 0..1 + Reverse-Z）
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
import { OrthographicOffCenterFrustum } from "./OrthographicOffCenterFrustum"

const DEFAULT_NEAR = 0.1
const DEFAULT_FAR = 1e9

export interface OrthographicFrustumOptions {
  width?: number
  aspectRatio?: number
  near?: number
  far?: number
}

/**
 * 刷新对称正交视锥的 off-center 参数。
 *
 * @param frustum 视锥
 */
function update(frustum: OrthographicFrustum): void {
  if (
    !defined(frustum.width) ||
    !defined(frustum.aspectRatio) ||
    !defined(frustum.near) ||
    !defined(frustum.far)
  ) {
    throw new DeveloperError("width, aspectRatio, near, or far parameters are not set.")
  }
  const f = frustum._offCenterFrustum
  if (
    frustum.width !== frustum._width ||
    frustum.aspectRatio !== frustum._aspectRatio ||
    frustum.near !== frustum._near ||
    frustum.far !== frustum._far
  ) {
    if (frustum.aspectRatio < 0) {
      throw new DeveloperError("aspectRatio must be positive.")
    }
    if (frustum.near < 0 || frustum.near > frustum.far) {
      throw new DeveloperError("near must be greater than zero and less than far.")
    }
    frustum._aspectRatio = frustum.aspectRatio
    frustum._width = frustum.width
    frustum._near = frustum.near
    frustum._far = frustum.far
    const ratio = 1.0 / frustum.aspectRatio
    f.right = frustum.width * 0.5
    f.left = -f.right
    f.top = ratio * f.right
    f.bottom = -f.top
    f.near = frustum.near
    f.far = frustum.far
  }
}

/**
 * 对称正交视锥（width + aspect）。投影为 Reverse-Z。
 * 对标 Cesium `Core/OrthographicFrustum.js`。
 */
export class OrthographicFrustum {
  _offCenterFrustum: OrthographicOffCenterFrustum
  width: number | undefined
  _width: number | undefined
  aspectRatio: number | undefined
  _aspectRatio: number | undefined
  near: number
  _near: number | undefined
  far: number
  _far: number | undefined

  /**
   * @param options width / aspectRatio；near 默认 0.1，far 默认 1e9
   */
  constructor(options?: OrthographicFrustumOptions) {
    const opts = options ?? {}
    this._offCenterFrustum = new OrthographicOffCenterFrustum()
    this.width = opts.width
    this._width = undefined
    this.aspectRatio = opts.aspectRatio
    this._aspectRatio = undefined
    this.near = opts.near ?? DEFAULT_NEAR
    this._near = this.near
    this.far = opts.far ?? DEFAULT_FAR
    this._far = this.far
  }

  /** pack 元素个数 */
  static packedLength = 4

  /**
   * 打包到数组。
   *
   * @param value 实例
   * @param array 目标
   * @param startingIndex 起始下标
   */
  static pack(value: OrthographicFrustum, array: number[], startingIndex?: number): number[] {
    Check.typeOf.object("value", value)
    Check.defined("array", array)
    let i = startingIndex ?? 0
    array[i++] = value.width ?? Number.NaN
    array[i++] = value.aspectRatio ?? Number.NaN
    array[i++] = value.near
    array[i] = value.far
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
    result?: OrthographicFrustum,
  ): OrthographicFrustum {
    Check.defined("array", array)
    let i = startingIndex ?? 0
    const out = defined(result) ? result : new OrthographicFrustum()
    out.width = array[i++]
    out.aspectRatio = array[i++]
    out.near = array[i++]!
    out.far = array[i]!
    return out
  }

  /** Reverse-Z 正交投影矩阵 */
  get projectionMatrix(): Matrix4 {
    update(this)
    return this._offCenterFrustum.projectionMatrix
  }

  /** 底层非对称视锥 */
  get offCenterFrustum(): OrthographicOffCenterFrustum {
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
   * 像素尺寸。
   *
   * @param drawingBufferWidth 缓冲宽
   * @param drawingBufferHeight 缓冲高
   * @param distance 距离（正交下不参与计算）
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
  clone(result?: OrthographicFrustum): OrthographicFrustum {
    const out = defined(result) ? result : new OrthographicFrustum()
    out.aspectRatio = this.aspectRatio
    out.width = this.width
    out.near = this.near
    out.far = this.far
    out._aspectRatio = undefined
    out._width = undefined
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
  equals(other?: OrthographicFrustum): boolean {
    if (!defined(other) || !(other instanceof OrthographicFrustum)) {
      return false
    }
    update(this)
    update(other)
    return (
      this.width === other.width &&
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
    other: OrthographicFrustum,
    relativeEpsilon: number,
    absoluteEpsilon?: number,
  ): boolean {
    if (!defined(other) || !(other instanceof OrthographicFrustum)) {
      return false
    }
    update(this)
    update(other)
    return (
      CesiumMath.equalsEpsilon(
        this.width ?? 0,
        other.width ?? 0,
        relativeEpsilon,
        absoluteEpsilon,
      ) &&
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
