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
 * - 投影矩阵为 WebGPU NDC z∈[0,1] + Reverse-Z（near → 1，far → 0）
 * - 不调用 Matrix4.computePerspectiveOffCenter / computeInfinitePerspectiveOffCenter
 * - computeCullingVolume 保持 Cesium 平面语义
 *
 * 默认值相对 Cesium：near 0.1（Cesium 1.0），far 1e9（Cesium 5e8）。
 */

import { type Cartesian2 } from "./Cartesian2"
import { Cartesian3 } from "./Cartesian3"
import { Cartesian4 } from "./Cartesian4"
import { CullingVolume } from "./CullingVolume"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { CesiumMath } from "./CesiumMath"
import { Matrix4 } from "./Matrix4"

/** 相对 Cesium 1.0：本移植默认 near */
const DEFAULT_NEAR = 0.1
/** 相对 Cesium 5e8：本移植默认 far */
const DEFAULT_FAR = 1e9

const getPlanesRight = new Cartesian3()
const getPlanesNearCenter = new Cartesian3()
const getPlanesFarCenter = new Cartesian3()
const getPlanesNormal = new Cartesian3()

export interface PerspectiveOffCenterFrustumOptions {
  left?: number
  right?: number
  top?: number
  bottom?: number
  near?: number
  far?: number
}

/**
 * 组装 WebGPU Reverse-Z 透视投影（构造参数顺序与 Cesium `Matrix4` 一致：按行给出）。
 *
 * 有限 far：
 *   clip.z = [n/(f-n)] * eye.z + [f n/(f-n)] * eye.w
 *   clip.w = -eye.z
 *   ndc.z = clip.z/clip.w → near 处 1，far 处 0
 *
 * 无穷远（`far === Infinity` 或 `infinite === true`）：
 *   clip.z = n * eye.w
 *   clip.w = -eye.z
 *   ndc.z = n / (-eye.z) → near 处 1，∞ 处 0
 *
 * @param left 左
 * @param right 右
 * @param bottom 下
 * @param top 上
 * @param near 近
 * @param far 远；无穷远时与 infinite 等价
 * @param result 结果矩阵
 * @param infinite 强制无穷远平面
 */
export function computeReverseZPerspectiveOffCenter(
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number,
  result: Matrix4,
  infinite = false,
): Matrix4 {
  const x = (2.0 * near) / (right - left)
  const y = (2.0 * near) / (top - bottom)
  const a = (right + left) / (right - left)
  const b = (top + bottom) / (top - bottom)
  const useInfinite = infinite || !Number.isFinite(far)
  const c = useInfinite ? 0.0 : near / (far - near)
  const d = useInfinite ? near : (far * near) / (far - near)
  return Matrix4.clone(
    new Matrix4(x, 0.0, a, 0.0, 0.0, y, b, 0.0, 0.0, 0.0, c, d, 0.0, 0.0, -1.0, 0.0),
    result,
  )
}

/**
 * 非对称透视视锥。投影为 0..1 深度 + Reverse-Z。
 * 对标 Cesium `Core/PerspectiveOffCenterFrustum.js`（仅投影矩阵改写）。
 */
export class PerspectiveOffCenterFrustum {
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
  _perspectiveMatrix: Matrix4
  _infinitePerspective: Matrix4

  /**
   * @param options 裁剪平面；near 默认 0.1，far 默认 1e9
   */
  constructor(options?: PerspectiveOffCenterFrustumOptions) {
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
    this._perspectiveMatrix = new Matrix4()
    this._infinitePerspective = new Matrix4()
  }

  /**
   * 刷新投影矩阵。
   *
   * @param frustum 视锥
   */
  static update(frustum: PerspectiveOffCenterFrustum): void {
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
    const { top, bottom, right, left, near, far } = frustum
    const changed =
      top !== frustum._top ||
      bottom !== frustum._bottom ||
      left !== frustum._left ||
      right !== frustum._right ||
      near !== frustum._near ||
      far !== frustum._far
    if (!changed) {
      return
    }
    if (frustum.near <= 0 || frustum.near > frustum.far) {
      throw new DeveloperError("near must be greater than zero and less than far.")
    }
    frustum._left = left
    frustum._right = right
    frustum._top = top
    frustum._bottom = bottom
    frustum._near = near
    frustum._far = far
    computeReverseZPerspectiveOffCenter(
      left,
      right,
      bottom,
      top,
      near,
      far,
      frustum._perspectiveMatrix,
    )
    computeReverseZPerspectiveOffCenter(
      left,
      right,
      bottom,
      top,
      near,
      far,
      frustum._infinitePerspective,
      true,
    )
  }

  /** Reverse-Z 投影矩阵（far 为 Infinity 时即为无穷远矩阵） */
  get projectionMatrix(): Matrix4 {
    PerspectiveOffCenterFrustum.update(this)
    return this._perspectiveMatrix
  }

  /** 无穷远 Reverse-Z 投影矩阵 */
  get infiniteProjectionMatrix(): Matrix4 {
    PerspectiveOffCenterFrustum.update(this)
    return this._infinitePerspective
  }

  /**
   * 按 Cesium 语义生成 6 个裁剪平面（与 Reverse-Z 无关）。
   *
   * @param position 眼点
   * @param direction 视线方向
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
    const nearCenter = getPlanesNearCenter
    Cartesian3.multiplyByScalar(direction, n, nearCenter)
    Cartesian3.add(position, nearCenter, nearCenter)
    const farCenter = getPlanesFarCenter
    Cartesian3.multiplyByScalar(direction, f, farCenter)
    Cartesian3.add(position, farCenter, farCenter)
    const normal = getPlanesNormal

    Cartesian3.multiplyByScalar(right, l, normal)
    Cartesian3.add(nearCenter, normal, normal)
    Cartesian3.subtract(normal, position, normal)
    Cartesian3.normalize(normal, normal)
    Cartesian3.cross(normal, up, normal)
    Cartesian3.normalize(normal, normal)
    let plane = planes[0]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[0] = plane
    }
    plane.x = normal.x
    plane.y = normal.y
    plane.z = normal.z
    plane.w = -Cartesian3.dot(normal, position)

    Cartesian3.multiplyByScalar(right, r, normal)
    Cartesian3.add(nearCenter, normal, normal)
    Cartesian3.subtract(normal, position, normal)
    Cartesian3.cross(up, normal, normal)
    Cartesian3.normalize(normal, normal)
    plane = planes[1]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[1] = plane
    }
    plane.x = normal.x
    plane.y = normal.y
    plane.z = normal.z
    plane.w = -Cartesian3.dot(normal, position)

    Cartesian3.multiplyByScalar(up, b, normal)
    Cartesian3.add(nearCenter, normal, normal)
    Cartesian3.subtract(normal, position, normal)
    Cartesian3.cross(right, normal, normal)
    Cartesian3.normalize(normal, normal)
    plane = planes[2]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[2] = plane
    }
    plane.x = normal.x
    plane.y = normal.y
    plane.z = normal.z
    plane.w = -Cartesian3.dot(normal, position)

    Cartesian3.multiplyByScalar(up, t, normal)
    Cartesian3.add(nearCenter, normal, normal)
    Cartesian3.subtract(normal, position, normal)
    Cartesian3.cross(normal, right, normal)
    Cartesian3.normalize(normal, normal)
    plane = planes[3]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[3] = plane
    }
    plane.x = normal.x
    plane.y = normal.y
    plane.z = normal.z
    plane.w = -Cartesian3.dot(normal, position)

    plane = planes[4]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[4] = plane
    }
    plane.x = direction.x
    plane.y = direction.y
    plane.z = direction.z
    plane.w = -Cartesian3.dot(direction, nearCenter)

    Cartesian3.negate(direction, normal)
    plane = planes[5]
    if (!defined(plane)) {
      plane = new Cartesian4()
      planes[5] = plane
    }
    plane.x = normal.x
    plane.y = normal.y
    plane.z = normal.z
    plane.w = -Cartesian3.dot(normal, farCenter)

    return this._cullingVolume
  }

  /**
   * 某距离处一个像素的宽高（米）。
   *
   * @param drawingBufferWidth 绘制缓冲宽
   * @param drawingBufferHeight 绘制缓冲高
   * @param distance 距离
   * @param pixelRatio 像素比
   * @param result 结果（必填）
   */
  getPixelDimensions(
    drawingBufferWidth: number,
    drawingBufferHeight: number,
    distance: number,
    pixelRatio: number,
    result: Cartesian2,
  ): Cartesian2 {
    PerspectiveOffCenterFrustum.update(this)
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
      throw new DeveloperError("pixelRatio is required")
    }
    if (pixelRatio <= 0) {
      throw new DeveloperError("pixelRatio must be greater than zero.")
    }
    if (!defined(result)) {
      throw new DeveloperError("A result object is required.")
    }
    const inverseNear = 1.0 / this.near
    let tanTheta = this.top! * inverseNear
    const pixelHeight = (2.0 * pixelRatio * distance * tanTheta) / drawingBufferHeight
    tanTheta = this.right! * inverseNear
    const pixelWidth = (2.0 * pixelRatio * distance * tanTheta) / drawingBufferWidth
    result.x = pixelWidth
    result.y = pixelHeight
    return result
  }

  /**
   * 复制实例。
   *
   * @param result 可选结果
   */
  clone(result?: PerspectiveOffCenterFrustum): PerspectiveOffCenterFrustum {
    const out = defined(result) ? result : new PerspectiveOffCenterFrustum()
    out.right = this.right
    out.left = this.left
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
  equals(other?: PerspectiveOffCenterFrustum): boolean {
    return (
      defined(other) &&
      other instanceof PerspectiveOffCenterFrustum &&
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
    other: PerspectiveOffCenterFrustum,
    relativeEpsilon: number,
    absoluteEpsilon?: number,
  ): boolean {
    return (
      other === this ||
      (defined(other) &&
        other instanceof PerspectiveOffCenterFrustum &&
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
