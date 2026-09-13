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
 * - 正交投影为 WebGPU NDC z∈[0,1] + Reverse-Z（near → 1，far → 0）
 * - 不调用 Matrix4.computeOrthographicOffCenter
 * - computeCullingVolume 保持 Cesium 平面语义
 *
 * 默认值相对 Cesium：near 0.1（Cesium 1.0），far 1e9（Cesium 5e8）。
 * 正交 + far=Infinity 时 z 行退化为常数 1（深度无分辨），仅透视推荐无穷远。
 */

import { type Cartesian2 } from "./Cartesian2"
import { Cartesian3 } from "./Cartesian3"
import { Cartesian4 } from "./Cartesian4"
import { CullingVolume } from "./CullingVolume"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { CesiumMath } from "./CesiumMath"
import { Matrix4 } from "./Matrix4"

const DEFAULT_NEAR = 0.1
const DEFAULT_FAR = 1e9

const getPlanesRight = new Cartesian3()
const getPlanesNearCenter = new Cartesian3()
const getPlanesPoint = new Cartesian3()
const negateScratch = new Cartesian3()

export interface OrthographicOffCenterFrustumOptions {
  left?: number
  right?: number
  top?: number
  bottom?: number
  near?: number
  far?: number
}

/**
 * 组装 WebGPU Reverse-Z 正交投影（构造参数顺序与 Cesium `Matrix4` 一致：按行给出）。
 *
 *   clip.z = [1/(f-n)] * eye.z + [f/(f-n)] * eye.w
 *   clip.w = 1
 *   ndc.z → near 处 1，far 处 0
 *
 * @param left 左
 * @param right 右
 * @param bottom 下
 * @param top 上
 * @param near 近
 * @param far 远
 * @param result 结果矩阵
 */
export function computeReverseZOrthographicOffCenter(
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number,
  result: Matrix4,
): Matrix4 {
  const a = 1.0 / (right - left)
  const b = 1.0 / (top - bottom)
  const c = Number.isFinite(far) ? 1.0 / (far - near) : 0.0
  const tx = -(right + left) * a
  const ty = -(top + bottom) * b
  const tz = Number.isFinite(far) ? far / (far - near) : 1.0
  return Matrix4.clone(
    new Matrix4(2.0 * a, 0.0, 0.0, tx, 0.0, 2.0 * b, 0.0, ty, 0.0, 0.0, c, tz, 0.0, 0.0, 0.0, 1.0),
    result,
  )
}

/**
 * 非对称正交视锥。投影为 0..1 深度 + Reverse-Z。
 * 对标 Cesium `Core/OrthographicOffCenterFrustum.js`（仅投影矩阵改写）。
 */
export class OrthographicOffCenterFrustum {
  left: number | undefined
  right: number | undefined
  top: number | undefined
  bottom: number | undefined
  near: number
  far: number
  _left: number | undefined
  _right: number | undefined
  _top: number | undefined
  _bottom: number | undefined
  _near: number | undefined
  _far: number | undefined
  _cullingVolume: CullingVolume
  _orthographicMatrix: Matrix4

  /**
   * @param options 裁剪平面；near 默认 0.1，far 默认 1e9
   */
  constructor(options?: OrthographicOffCenterFrustumOptions) {
    const opts = options ?? {}
    this.left = opts.left
    this._left = undefined
    this.right = opts.right
    this._right = undefined
    this.top = opts.top
    this._top = undefined
    this.bottom = opts.bottom
    this._bottom = undefined
    this.near = opts.near ?? DEFAULT_NEAR
    this._near = this.near
    this.far = opts.far ?? DEFAULT_FAR
    this._far = this.far
    this._cullingVolume = new CullingVolume()
    this._orthographicMatrix = new Matrix4()
  }

  /**
   * 刷新投影矩阵。
   *
   * @param frustum 视锥
   */
  static update(frustum: OrthographicOffCenterFrustum): void {
    if (
      !defined(frustum.right) ||
      !defined(frustum.left) ||
      !defined(frustum.top) ||
      !defined(frustum.bottom) ||
      !defined(frustum.near) ||
      !defined(frustum.far)
    ) {
      throw new DeveloperError("right, left, top, bottom, near, or far parameters are not set.")
    }
    if (
      frustum.top !== frustum._top ||
      frustum.bottom !== frustum._bottom ||
      frustum.left !== frustum._left ||
      frustum.right !== frustum._right ||
      frustum.near !== frustum._near ||
      frustum.far !== frustum._far
    ) {
      if (frustum.left > frustum.right) {
        throw new DeveloperError("right must be greater than left.")
      }
      if (frustum.bottom > frustum.top) {
        throw new DeveloperError("top must be greater than bottom.")
      }
      if (frustum.near <= 0 || frustum.near > frustum.far) {
        throw new DeveloperError("near must be greater than zero and less than far.")
      }
      frustum._left = frustum.left
      frustum._right = frustum.right
      frustum._top = frustum.top
      frustum._bottom = frustum.bottom
      frustum._near = frustum.near
      frustum._far = frustum.far
      computeReverseZOrthographicOffCenter(
        frustum.left,
        frustum.right,
        frustum.bottom,
        frustum.top,
        frustum.near,
        frustum.far,
        frustum._orthographicMatrix,
      )
    }
  }

  /** Reverse-Z 正交投影矩阵 */
  get projectionMatrix(): Matrix4 {
    OrthographicOffCenterFrustum.update(this)
    return this._orthographicMatrix
  }

  /**
   * 按 Cesium 语义生成 6 个裁剪平面。
   *
   * @param position 眼点
   * @param direction 视线
   * @param up 上方向
   */
  computeCullingVolume(position: Cartesian3, direction: Cartesian3, up: Cartesian3): CullingVolume {
    if (!defined(position)) {
      throw new DeveloperError("position is required.")
    }
    if (!defined(direction)) {
      throw new DeveloperError("direction is required.")
    }
    if (!defined(up)) {
      throw new DeveloperError("up is required.")
    }
    const planes = this._cullingVolume.planes
    const t = this.top
    const b = this.bottom
    const r = this.right
    const l = this.left
    const n = this.near
    const f = this.far
    if (!defined(t) || !defined(b) || !defined(r) || !defined(l)) {
      throw new DeveloperError("right, left, top, or bottom parameters are not set.")
    }

    const right = Cartesian3.cross(direction, up, getPlanesRight)
    Cartesian3.normalize(right, right)
    const nearCenter = getPlanesNearCenter
    Cartesian3.multiplyByScalar(direction, n, nearCenter)
    Cartesian3.add(position, nearCenter, nearCenter)
    const point = getPlanesPoint

    Cartesian3.multiplyByScalar(right, l, point)
    Cartesian3.add(nearCenter, point, point)
    let plane = planes[0]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[0] = plane
    }
    plane.x = right.x
    plane.y = right.y
    plane.z = right.z
    plane.w = -Cartesian3.dot(right, point)

    Cartesian3.multiplyByScalar(right, r, point)
    Cartesian3.add(nearCenter, point, point)
    plane = planes[1]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[1] = plane
    }
    plane.x = -right.x
    plane.y = -right.y
    plane.z = -right.z
    plane.w = -Cartesian3.dot(Cartesian3.negate(right, negateScratch), point)

    Cartesian3.multiplyByScalar(up, b, point)
    Cartesian3.add(nearCenter, point, point)
    plane = planes[2]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[2] = plane
    }
    plane.x = up.x
    plane.y = up.y
    plane.z = up.z
    plane.w = -Cartesian3.dot(up, point)

    Cartesian3.multiplyByScalar(up, t, point)
    Cartesian3.add(nearCenter, point, point)
    plane = planes[3]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[3] = plane
    }
    plane.x = -up.x
    plane.y = -up.y
    plane.z = -up.z
    plane.w = -Cartesian3.dot(Cartesian3.negate(up, negateScratch), point)

    plane = planes[4]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[4] = plane
    }
    plane.x = direction.x
    plane.y = direction.y
    plane.z = direction.z
    plane.w = -Cartesian3.dot(direction, nearCenter)

    Cartesian3.multiplyByScalar(direction, f, point)
    Cartesian3.add(position, point, point)
    plane = planes[5]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[5] = plane
    }
    plane.x = -direction.x
    plane.y = -direction.y
    plane.z = -direction.z
    plane.w = -Cartesian3.dot(Cartesian3.negate(direction, negateScratch), point)

    return this._cullingVolume
  }

  /**
   * 像素宽高（与距离无关）。
   *
   * @param drawingBufferWidth 缓冲宽
   * @param drawingBufferHeight 缓冲高
   * @param distance 未使用，保持签名
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
    OrthographicOffCenterFrustum.update(this)
    if (!defined(drawingBufferWidth) || !defined(drawingBufferHeight)) {
      throw new DeveloperError("Both drawingBufferWidth and drawingBufferHeight are required.")
    }
    if (drawingBufferWidth <= 0) {
      throw new DeveloperError("drawingBufferWidth must be greater than zero.")
    }
    if (drawingBufferHeight <= 0) {
      throw new DeveloperError("drawingBufferHeight must be greater than zero.")
    }
    if (!defined(distance)) {
      throw new DeveloperError("distance is required.")
    }
    if (!defined(pixelRatio)) {
      throw new DeveloperError("pixelRatio is required.")
    }
    if (pixelRatio <= 0) {
      throw new DeveloperError("pixelRatio must be greater than zero.")
    }
    if (!defined(result)) {
      throw new DeveloperError("A result object is required.")
    }
    const frustumWidth = this.right! - this.left!
    const frustumHeight = this.top! - this.bottom!
    result.x = (pixelRatio * frustumWidth) / drawingBufferWidth
    result.y = (pixelRatio * frustumHeight) / drawingBufferHeight
    return result
  }

  /**
   * 复制实例。
   *
   * @param result 可选结果
   */
  clone(result?: OrthographicOffCenterFrustum): OrthographicOffCenterFrustum {
    const out = defined(result) ? result : new OrthographicOffCenterFrustum()
    out.left = this.left
    out.right = this.right
    out.top = this.top
    out.bottom = this.bottom
    out.near = this.near
    out.far = this.far
    out._left = undefined
    out._right = undefined
    out._top = undefined
    out._bottom = undefined
    out._near = undefined
    out._far = undefined
    return out
  }

  /**
   * 精确比较。
   *
   * @param other 另一视锥
   */
  equals(other?: OrthographicOffCenterFrustum): boolean {
    return (
      defined(other) &&
      other instanceof OrthographicOffCenterFrustum &&
      this.right === other.right &&
      this.left === other.left &&
      this.top === other.top &&
      this.bottom === other.bottom &&
      this.near === other.near &&
      this.far === other.far
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
    other: OrthographicOffCenterFrustum,
    relativeEpsilon: number,
    absoluteEpsilon?: number,
  ): boolean {
    return (
      other === this ||
      (defined(other) &&
        other instanceof OrthographicOffCenterFrustum &&
        CesiumMath.equalsEpsilon(
          this.right ?? 0,
          other.right ?? 0,
          relativeEpsilon,
          absoluteEpsilon,
        ) &&
        CesiumMath.equalsEpsilon(
          this.left ?? 0,
          other.left ?? 0,
          relativeEpsilon,
          absoluteEpsilon,
        ) &&
        CesiumMath.equalsEpsilon(this.top ?? 0, other.top ?? 0, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(
          this.bottom ?? 0,
          other.bottom ?? 0,
          relativeEpsilon,
          absoluteEpsilon,
        ) &&
        CesiumMath.equalsEpsilon(this.near, other.near, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(this.far, other.far, relativeEpsilon, absoluteEpsilon))
    )
  }
}
