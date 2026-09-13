/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/scene
 *
 * 改写：视图矩阵平移为 0（RTE）；投影为 Reverse-Z。无 2D / Columbus。
 */
import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Cartographic,
  CesiumMath,
  defined,
  EasingFunction,
  type EasingFunctionCallback,
  Ellipsoid,
  EncodedCartesian3,
  Event,
  HeadingPitchRange,
  HeadingPitchRoll,
  Intersect,
  IntersectionTests,
  Matrix3,
  Matrix4,
  PerspectiveFrustum,
  Quaternion,
  Ray,
  Rectangle,
  Transforms,
} from "@webgpu-cesium/core"
import type { TweenCollection } from "./TweenCollection"

/** Camera 所需的场景子集 */
export interface CameraSceneLike {
  canvas?: { clientWidth: number; clientHeight: number }
  drawingBufferWidth?: number
  drawingBufferHeight?: number
  pixelRatio?: number
  ellipsoid?: Ellipsoid
  tweens?: TweenCollection
}

export interface CameraOrientationHpr {
  heading?: number
  pitch?: number
  roll?: number
}

export interface CameraOrientationDirectionUp {
  direction: Cartesian3
  up: Cartesian3
}

export type CameraOrientation = CameraOrientationHpr | CameraOrientationDirectionUp

export interface CameraSetViewOptions {
  destination?: Cartesian3 | Rectangle
  orientation?: CameraOrientation
}

export interface CameraFlyToOptions extends CameraSetViewOptions {
  destination: Cartesian3 | Rectangle
  duration?: number
  complete?: () => void
  cancel?: () => void
  easingFunction?: EasingFunctionCallback
}

const scratchRight = new Cartesian3()
const scratchView = new Matrix4()
const scratchInverseView = new Matrix4()
const scratchHpr = new HeadingPitchRoll()
const scratchEnu = new Matrix4()
const scratchInvEnu = new Matrix4()
const scratchLocal = new Cartesian3()
const scratchOffset = new Cartesian3()
const scratchQuat1 = new Quaternion()
const scratchQuat2 = new Quaternion()
const scratchRot = new Matrix3()
const scratchRay = new Ray()
const scratchPixel = new Cartesian2()
const scratchCartographic = new Cartographic()
const scratchEncoded = new EncodedCartesian3()
const scratchFrom = new Cartesian3()
const scratchTo = new Cartesian3()
const pickCorners: Cartographic[] = [
  new Cartographic(),
  new Cartographic(),
  new Cartographic(),
  new Cartographic(),
]

/**
 * 把 HeadingPitchRange 转为局部偏移。
 *
 * @param heading 航向
 * @param pitch 俯仰
 * @param range 距离
 * @param result 结果
 */
function offsetFromHeadingPitchRange(
  heading: number,
  pitch: number,
  range: number,
  result: Cartesian3,
): Cartesian3 {
  const clampedPitch = CesiumMath.clamp(pitch, -CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO)
  const h = CesiumMath.zeroToTwoPi(heading) - CesiumMath.PI_OVER_TWO
  const pitchQuat = Quaternion.fromAxisAngle(Cartesian3.UNIT_Y, -clampedPitch, scratchQuat1)
  const headingQuat = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -h, scratchQuat2)
  const rotQuat = Quaternion.multiply(headingQuat, pitchQuat, headingQuat)
  const rotMatrix = Matrix3.fromQuaternion(rotQuat, scratchRot)
  const offset = Cartesian3.clone(Cartesian3.UNIT_X, result)
  Matrix3.multiplyByVector(rotMatrix, offset, offset)
  Cartesian3.negate(offset, offset)
  Cartesian3.multiplyByScalar(offset, range, offset)
  return offset
}

/**
 * 3D 相机：RTE 视图 + Reverse-Z 投影。
 */
export class Camera {
  position = new Cartesian3()
  direction = new Cartesian3(0, 0, -1)
  up = new Cartesian3(0, 1, 0)
  right = new Cartesian3(1, 0, 0)
  frustum: PerspectiveFrustum
  readonly changed = new Event<[number]>()
  readonly moveStart = new Event<[]>()
  readonly moveEnd = new Event<[]>()

  private readonly _scene: CameraSceneLike
  private readonly _positionWC = new Cartesian3()
  private readonly _directionWC = new Cartesian3()
  private readonly _upWC = new Cartesian3()
  private readonly _rightWC = new Cartesian3()
  private readonly _positionCartographic = new Cartographic()
  private readonly _viewMatrix = new Matrix4()
  private readonly _inverseViewMatrix = new Matrix4()
  private readonly _transform = Matrix4.clone(Matrix4.IDENTITY, new Matrix4())
  private _currentFlight: { cancel: () => void } | undefined
  private _percentageChanged = 0.5

  /**
   * @param scene 画布 / 椭球 / tweens
   */
  constructor(scene?: CameraSceneLike) {
    this._scene = scene ?? {}
    const ellipsoid = this.ellipsoid
    this.frustum = new PerspectiveFrustum({
      fov: CesiumMath.PI_OVER_THREE,
      aspectRatio: 1,
      near: 0.1,
      far: 1e9,
    })
    const destination = Cartesian3.fromDegrees(0, 20, ellipsoid.maximumRadius * 3.5)
    // 高空必须接近天底：-45° 会看向太空，0 级瓦片被视锥剔除
    this.setView({
      destination,
      orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
    })
  }

  get ellipsoid(): Ellipsoid {
    return this._scene.ellipsoid ?? Ellipsoid.default
  }

  get transform(): Matrix4 {
    return this._transform
  }

  get positionWC(): Cartesian3 {
    this.updateMembers()
    return this._positionWC
  }

  get directionWC(): Cartesian3 {
    this.updateMembers()
    return this._directionWC
  }

  get upWC(): Cartesian3 {
    this.updateMembers()
    return this._upWC
  }

  get rightWC(): Cartesian3 {
    this.updateMembers()
    return this._rightWC
  }

  get positionCartographic(): Cartographic {
    this.updateMembers()
    return this._positionCartographic
  }

  /**
   * 相机相对视图矩阵（平移为 0）。
   */
  get viewMatrix(): Matrix4 {
    this.updateMembers()
    return this._viewMatrix
  }

  get inverseViewMatrix(): Matrix4 {
    this.updateMembers()
    return this._inverseViewMatrix
  }

  get heading(): number {
    return this.headingPitchRoll(scratchHpr).heading
  }

  get pitch(): number {
    return this.headingPitchRoll(scratchHpr).pitch
  }

  get roll(): number {
    return this.headingPitchRoll(scratchHpr).roll
  }

  /**
   * 从 ENU 分解 heading / pitch / roll。
   *
   * @param result 结果
   */
  headingPitchRoll(result?: HeadingPitchRoll): HeadingPitchRoll {
    this.updateMembers()
    const dest = result ?? new HeadingPitchRoll()
    Transforms.eastNorthUpToFixedFrame(this._positionWC, this.ellipsoid, scratchEnu)
    Matrix4.inverseTransformation(scratchEnu, scratchInvEnu)
    Matrix4.multiplyByPointAsVector(scratchInvEnu, this._directionWC, scratchLocal)
    dest.heading = Math.atan2(scratchLocal.x, scratchLocal.y)
    dest.pitch = CesiumMath.asinClamped(scratchLocal.z)
    dest.roll = 0
    return dest
  }

  /**
   * 刷新派生量：世界坐标、RTE 视图、经纬高。
   */
  updateMembers(): void {
    Cartesian3.normalize(this.direction, this.direction)
    Cartesian3.normalize(this.up, this.up)
    Cartesian3.cross(this.direction, this.up, this.right)
    if (Cartesian3.magnitudeSquared(this.right) < CesiumMath.EPSILON10) {
      Cartesian3.clone(Cartesian3.UNIT_X, this.right)
    }
    Cartesian3.normalize(this.right, this.right)
    Cartesian3.cross(this.right, this.direction, this.up)
    Cartesian3.normalize(this.up, this.up)

    Cartesian3.clone(this.position, this._positionWC)
    Cartesian3.clone(this.direction, this._directionWC)
    Cartesian3.clone(this.up, this._upWC)
    Cartesian3.clone(this.right, this._rightWC)

    Matrix4.computeView(
      Cartesian3.ZERO,
      this._directionWC,
      this._upWC,
      this._rightWC,
      this._viewMatrix,
    )
    Matrix4.inverseTransformation(this._viewMatrix, this._inverseViewMatrix)

    const carto = this.ellipsoid.cartesianToCartographic(
      this._positionWC,
      this._positionCartographic,
    )
    if (!defined(carto)) {
      this._positionCartographic.longitude = 0
      this._positionCartographic.latitude = 0
      this._positionCartographic.height = Cartesian3.magnitude(this._positionWC)
    }
  }

  /**
   * 同步视锥宽高比。
   *
   * @param width 像素宽
   * @param height 像素高
   */
  updateFrustumAspect(width: number, height: number): void {
    this.frustum.aspectRatio = height === 0 ? 1 : width / height
  }

  /**
   * 相机位置高低位（RTE）。
   *
   * @param result 可选
   */
  encodedPosition(result?: EncodedCartesian3): EncodedCartesian3 {
    return EncodedCartesian3.fromCartesian(this.positionWC, result ?? scratchEncoded)
  }

  /**
   * 瞬时设置位置与姿态。
   *
   * @param options 目标与朝向
   */
  setView(options: CameraSetViewOptions): void {
    const destinationInput = options.destination ?? this.position
    let destination: Cartesian3
    if (destinationInput instanceof Rectangle) {
      destination = this.getRectangleCameraCoordinates(destinationInput, scratchTo)
    } else {
      destination = Cartesian3.clone(destinationInput, scratchTo)
    }
    const orientation = options.orientation
    if (orientation !== undefined && "direction" in orientation) {
      Cartesian3.clone(destination, this.position)
      Cartesian3.normalize(orientation.direction, this.direction)
      Cartesian3.normalize(orientation.up, this.up)
      this.updateMembers()
      this.changed.raiseEvent(this._percentageChanged)
      return
    }
    scratchHpr.heading = orientation?.heading ?? 0
    scratchHpr.pitch = orientation?.pitch ?? -CesiumMath.PI_OVER_TWO
    scratchHpr.roll = orientation?.roll ?? 0
    this.setView3D(destination, scratchHpr)
    this.changed.raiseEvent(this._percentageChanged)
  }

  /**
   * Cesium setView3D：在目标点 ENU 下用 HPR 定向。
   *
   * @param position 世界坐标
   * @param hpr 姿态
   */
  private setView3D(position: Cartesian3, hpr: HeadingPitchRoll): void {
    Transforms.eastNorthUpToFixedFrame(position, this.ellipsoid, scratchEnu)
    const localHpr = new HeadingPitchRoll(hpr.heading - CesiumMath.PI_OVER_TWO, hpr.pitch, hpr.roll)
    const rotQuat = Quaternion.fromHeadingPitchRoll(localHpr, scratchQuat1)
    const rotMat = Matrix3.fromQuaternion(rotQuat, scratchRot)
    Matrix3.getColumn(rotMat, 0, this.direction)
    Matrix3.getColumn(rotMat, 2, this.up)
    Cartesian3.cross(this.direction, this.up, this.right)
    Matrix4.multiplyByPointAsVector(scratchEnu, this.direction, this.direction)
    Matrix4.multiplyByPointAsVector(scratchEnu, this.up, this.up)
    Cartesian3.normalize(this.direction, this.direction)
    Cartesian3.normalize(this.up, this.up)
    Cartesian3.clone(position, this.position)
    this.updateMembers()
  }

  /**
   * 看向目标。
   *
   * @param target 目标点
   * @param offset 局部偏移或 HPR
   */
  lookAt(target: Cartesian3, offset: Cartesian3 | HeadingPitchRange): void {
    const transform = Transforms.eastNorthUpToFixedFrame(target, this.ellipsoid, scratchEnu)
    this.lookAtTransform(transform, offset)
  }

  /**
   * 在给定参考系下看向原点。
   *
   * @param transform ENU 等
   * @param offset 局部偏移
   */
  lookAtTransform(transform: Matrix4, offset: Cartesian3 | HeadingPitchRange): void {
    let cartesianOffset: Cartesian3
    if (offset instanceof HeadingPitchRange) {
      cartesianOffset = offsetFromHeadingPitchRange(
        offset.heading,
        offset.pitch,
        offset.range,
        scratchOffset,
      )
    } else {
      cartesianOffset = offset
    }
    const worldOffset = Matrix4.multiplyByPointAsVector(transform, cartesianOffset, scratchLocal)
    const target = Matrix4.getTranslation(transform, scratchTo)
    Cartesian3.add(target, worldOffset, this.position)
    Cartesian3.negate(worldOffset, this.direction)
    if (Cartesian3.magnitudeSquared(this.direction) < CesiumMath.EPSILON10) {
      Cartesian3.clone(Cartesian3.UNIT_X, this.direction)
    }
    Cartesian3.normalize(this.direction, this.direction)
    Cartesian3.cross(this.direction, Cartesian3.UNIT_Z, this.right)
    if (Cartesian3.magnitudeSquared(this.right) < CesiumMath.EPSILON10) {
      Cartesian3.clone(Cartesian3.UNIT_X, this.right)
    }
    Cartesian3.normalize(this.right, this.right)
    Cartesian3.cross(this.right, this.direction, this.up)
    Cartesian3.normalize(this.up, this.up)
    this.updateMembers()
  }

  /**
   * 飞向目标；duration<=0 时等同 setView。
   *
   * @param options 目标与时长
   */
  flyTo(options: CameraFlyToOptions): void {
    this.cancelFlight()
    const duration = options.duration ?? 0
    if (duration <= 0) {
      this.setView(options)
      options.complete?.()
      return
    }
    const tweens = this._scene.tweens
    if (!defined(tweens)) {
      this.setView(options)
      options.complete?.()
      return
    }
    const start = Cartesian3.clone(this.position, scratchFrom)
    let destination: Cartesian3
    if (options.destination instanceof Rectangle) {
      destination = this.getRectangleCameraCoordinates(options.destination, new Cartesian3())
    } else {
      destination = Cartesian3.clone(options.destination, new Cartesian3())
    }
    const startHpr = this.headingPitchRoll(new HeadingPitchRoll())
    const endHpr = new HeadingPitchRoll(
      options.orientation !== undefined && "heading" in options.orientation
        ? (options.orientation.heading ?? startHpr.heading)
        : startHpr.heading,
      options.orientation !== undefined && "heading" in options.orientation
        ? (options.orientation.pitch ?? startHpr.pitch)
        : startHpr.pitch,
      options.orientation !== undefined && "heading" in options.orientation
        ? (options.orientation.roll ?? startHpr.roll)
        : startHpr.roll,
    )
    const flight = tweens.add({
      duration,
      easingFunction: options.easingFunction ?? EasingFunction.CUBIC_IN_OUT,
      update: (t) => {
        Cartesian3.lerp(start, destination, t, this.position)
        this.setView({
          destination: this.position,
          orientation: {
            heading: CesiumMath.lerp(startHpr.heading, endHpr.heading, t),
            pitch: CesiumMath.lerp(startHpr.pitch, endHpr.pitch, t),
            roll: CesiumMath.lerp(startHpr.roll, endHpr.roll, t),
          },
        })
      },
      complete: () => {
        this._currentFlight = undefined
        options.complete?.()
      },
      cancel: () => {
        this._currentFlight = undefined
        options.cancel?.()
      },
    })
    this._currentFlight = { cancel: () => tweens.removeAll() }
    void flight
  }

  /** 取消飞行 */
  cancelFlight(): void {
    if (this._currentFlight) {
      this._currentFlight.cancel()
      this._currentFlight = undefined
    }
  }

  /**
   * 矩形对应的相机位置（简化：中心 + 由跨度估计的高度）。
   *
   * @param rectangle 经纬矩形
   * @param result 结果
   */
  getRectangleCameraCoordinates(rectangle: Rectangle, result?: Cartesian3): Cartesian3 {
    const dest = result ?? new Cartesian3()
    const center = Rectangle.center(rectangle, scratchCartographic)
    const span = Math.max(rectangle.width, rectangle.height)
    center.height = Math.max(this.ellipsoid.maximumRadius * span * 0.6, 1000)
    return this.ellipsoid.cartographicToCartesian(center, dest)
  }

  /**
   * 窗口坐标拾取射线。
   *
   * @param windowPosition 像素
   * @param result 射线
   */
  getPickRay(windowPosition: Cartesian2, result?: Ray): Ray {
    this.updateMembers()
    const canvas = this._scene.canvas
    const width = canvas?.clientWidth ?? this._scene.drawingBufferWidth ?? 1
    const height = canvas?.clientHeight ?? this._scene.drawingBufferHeight ?? 1
    const dest = result ?? new Ray()
    const fovy = this.frustum.fovy ?? CesiumMath.PI_OVER_THREE
    const tanPhi = Math.tan(fovy * 0.5)
    const tanTheta = (this.frustum.aspectRatio ?? 1) * tanPhi
    const near = this.frustum.near
    const x = (2.0 / width) * windowPosition.x - 1.0
    const y = (2.0 / height) * (height - windowPosition.y) - 1.0
    Cartesian3.clone(this._positionWC, dest.origin)
    const nearCenter = Cartesian3.multiplyByScalar(this._directionWC, near, scratchLocal)
    Cartesian3.add(this._positionWC, nearCenter, nearCenter)
    const xDir = Cartesian3.multiplyByScalar(this._rightWC, x * near * tanTheta, scratchRight)
    const yDir = Cartesian3.multiplyByScalar(this._upWC, y * near * tanPhi, scratchOffset)
    Cartesian3.add(nearCenter, xDir, dest.direction)
    Cartesian3.add(dest.direction, yDir, dest.direction)
    Cartesian3.subtract(dest.direction, this._positionWC, dest.direction)
    Cartesian3.normalize(dest.direction, dest.direction)
    return dest
  }

  /**
   * 窗口点与椭球求交。
   *
   * @param windowPosition 像素
   * @param ellipsoid 椭球
   * @param result 交点
   */
  pickEllipsoid(
    windowPosition: Cartesian2,
    ellipsoid?: Ellipsoid,
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    const canvas = this._scene.canvas
    if (defined(canvas) && (canvas.clientWidth === 0 || canvas.clientHeight === 0)) {
      return undefined
    }
    const ellip = ellipsoid ?? this.ellipsoid
    const ray = this.getPickRay(windowPosition, scratchRay)
    const intersection = IntersectionTests.rayEllipsoid(ray, ellip)
    if (!defined(intersection)) {
      return undefined
    }
    const t = intersection.start > 0 ? intersection.start : intersection.stop
    return Ray.getPoint(ray, t, result)
  }

  /**
   * 包围球处的像素尺寸。
   *
   * @param boundingSphere 球
   * @param drawingBufferWidth 宽
   * @param drawingBufferHeight 高
   */
  getPixelSize(
    boundingSphere: BoundingSphere,
    drawingBufferWidth: number,
    drawingBufferHeight: number,
  ): number {
    this.updateMembers()
    const toCenter = Cartesian3.subtract(boundingSphere.center, this._positionWC, scratchLocal)
    const distance = Math.max(0, Cartesian3.magnitude(toCenter) - boundingSphere.radius)
    const pixelRatio = this._scene.pixelRatio ?? 1
    this.frustum.getPixelDimensions(
      drawingBufferWidth,
      drawingBufferHeight,
      Math.max(distance, this.frustum.near),
      pixelRatio,
      scratchPixel,
    )
    return Math.max(scratchPixel.x, scratchPixel.y)
  }

  /**
   * 当前视域覆盖的经纬矩形（四角拾取）。
   *
   * @param ellipsoid 椭球
   * @param result 结果
   */
  computeViewRectangle(ellipsoid?: Ellipsoid, result?: Rectangle): Rectangle | undefined {
    const ellip = ellipsoid ?? this.ellipsoid
    this.updateMembers()
    const volume = this.frustum.computeCullingVolume(
      this._positionWC,
      this._directionWC,
      this._upWC,
    )
    const globe = new BoundingSphere(Cartesian3.ZERO, ellip.maximumRadius)
    if (volume.computeVisibility(globe) === Intersect.OUTSIDE) {
      return undefined
    }
    const canvas = this._scene.canvas
    const width = canvas?.clientWidth ?? this._scene.drawingBufferWidth ?? 1
    const height = canvas?.clientHeight ?? this._scene.drawingBufferHeight ?? 1
    const corners = [
      new Cartesian2(0, 0),
      new Cartesian2(0, height),
      new Cartesian2(width, height),
      new Cartesian2(width, 0),
    ]
    const hits: Cartographic[] = []
    for (let i = 0; i < 4; i++) {
      const picked = this.pickEllipsoid(corners[i]!, ellip, scratchTo)
      if (defined(picked)) {
        const carto = ellip.cartesianToCartographic(picked, pickCorners[i])
        if (defined(carto)) {
          hits.push(carto)
        }
      }
    }
    if (hits.length < 2) {
      return Rectangle.clone(Rectangle.MAX_VALUE, result)
    }
    return Rectangle.fromCartographicArray(hits, result)
  }

  /**
   * 沿视线推进。
   *
   * @param amount 米
   */
  zoomIn(amount: number): void {
    Cartesian3.multiplyByScalar(this.direction, amount, scratchLocal)
    Cartesian3.add(this.position, scratchLocal, this.position)
    this.updateMembers()
  }

  /**
   * 绕轴旋转方向。
   *
   * @param axis 轴
   * @param angle 弧度
   */
  rotate(axis: Cartesian3, angle: number): void {
    const quat = Quaternion.fromAxisAngle(axis, angle, scratchQuat1)
    const rot = Matrix3.fromQuaternion(quat, scratchRot)
    Matrix3.multiplyByVector(rot, this.direction, this.direction)
    Matrix3.multiplyByVector(rot, this.up, this.up)
    this.updateMembers()
  }

  /**
   * 沿向量平移。
   *
   * @param direction 方向
   * @param amount 米
   */
  move(direction: Cartesian3, amount: number): void {
    Cartesian3.multiplyByScalar(direction, amount, scratchLocal)
    Cartesian3.add(this.position, scratchLocal, this.position)
    this.updateMembers()
  }
}

void scratchView
void scratchInverseView
