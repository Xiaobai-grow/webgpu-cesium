/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * 3D 旋转 / 缩放 / 倾斜。无 2D。地形碰撞仅留 minimumZoomDistance。
 */
import {
  Cartesian2,
  Cartesian3,
  CesiumMath,
  defined,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from "@webgpu-cesium/core"
import type { Camera } from "./Camera"
import type { Scene } from "./Scene"

const scratchStart = new Cartesian2()
const scratchEnd = new Cartesian2()
const scratchAxis = new Cartesian3()
const scratchPivot = new Cartesian3()

/**
 * 鼠标控制相机。
 */
export class ScreenSpaceCameraController {
  enableRotate = true
  enableZoom = true
  enableTilt = true
  enableLook = true
  inertiaSpin = 0.9
  inertiaZoom = 0.8
  minimumZoomDistance = 1.0
  maximumZoomDistance = 5e8
  readonly scene: Scene
  private readonly _handler: ScreenSpaceEventHandler
  private _rotating = false
  private _tilting = false
  private _lastWindow = new Cartesian2()
  private _rotateInertia = 0
  private _zoomInertia = 0
  private _rotateAxis = new Cartesian3(0, 0, 1)

  /**
   * @param scene 场景
   */
  constructor(scene: Scene) {
    this.scene = scene
    this._handler = new ScreenSpaceEventHandler(scene.canvas)
    this._handler.setInputAction((event) => {
      if (!this.enableRotate || !event.position) {
        return
      }
      this._rotating = true
      this._lastWindow.x = event.position.x
      this._lastWindow.y = event.position.y
      scene.camera.moveStart.raiseEvent()
    }, ScreenSpaceEventType.LEFT_DOWN)
    this._handler.setInputAction(() => {
      this._rotating = false
      scene.camera.moveEnd.raiseEvent()
    }, ScreenSpaceEventType.LEFT_UP)
    this._handler.setInputAction((event) => {
      if (!this.enableTilt || !event.position) {
        return
      }
      this._tilting = true
      this._lastWindow.x = event.position.x
      this._lastWindow.y = event.position.y
    }, ScreenSpaceEventType.RIGHT_DOWN)
    this._handler.setInputAction(() => {
      this._tilting = false
    }, ScreenSpaceEventType.RIGHT_UP)
    this._handler.setInputAction((event) => {
      if (!event.startPosition || !event.endPosition) {
        return
      }
      this.onMove(scene.camera, event.startPosition, event.endPosition)
    }, ScreenSpaceEventType.MOUSE_MOVE)
    this._handler.setInputAction((event) => {
      if (!this.enableZoom) {
        return
      }
      const delta = event.delta ?? 0
      this.zoom(scene.camera, -delta * 0.001)
    }, ScreenSpaceEventType.WHEEL)
  }

  /**
   * 拖动。
   *
   * @param camera 相机
   * @param start 起点
   * @param end 终点
   */
  private onMove(
    camera: Camera,
    start: { x: number; y: number },
    end: { x: number; y: number },
  ): void {
    scratchStart.x = start.x
    scratchStart.y = start.y
    scratchEnd.x = end.x
    scratchEnd.y = end.y
    const dx = end.x - start.x
    const dy = end.y - start.y
    if (this._rotating) {
      const picked = camera.pickEllipsoid(scratchStart)
      const pivot = defined(picked)
        ? Cartesian3.clone(picked, scratchPivot)
        : Cartesian3.clone(Cartesian3.ZERO, scratchPivot)
      const axis = camera.ellipsoid.geodeticSurfaceNormal(pivot, scratchAxis) ?? Cartesian3.UNIT_Z
      const rotateRate = 0.005
      camera.rotate(axis, -dx * rotateRate)
      camera.rotate(camera.right, dy * rotateRate)
      this._rotateInertia = Math.hypot(dx, dy)
      Cartesian3.clone(axis, this._rotateAxis)
    } else if (this._tilting) {
      camera.rotate(camera.right, dy * 0.005)
    }
  }

  /**
   * 滚轮缩放。
   *
   * @param camera 相机
   * @param amount 比例
   */
  private zoom(camera: Camera, amount: number): void {
    const height = Math.max(camera.positionCartographic.height, this.minimumZoomDistance)
    const move = height * CesiumMath.clamp(amount, -0.5, 0.5)
    const next = height - move
    if (next < this.minimumZoomDistance || next > this.maximumZoomDistance) {
      return
    }
    camera.zoomIn(move)
    this._zoomInertia = amount
  }

  /**
   * 惯性（每帧调用）。
   *
   * @param _dt 秒
   */
  update(_dt: number): void {
    const camera = this.scene.camera
    if (!this._rotating && this._rotateInertia > 0.5) {
      camera.rotate(this._rotateAxis, -this._rotateInertia * 0.0004)
      this._rotateInertia *= this.inertiaSpin
    }
    if (this._zoomInertia !== 0 && Math.abs(this._zoomInertia) > 0.0001) {
      this.zoom(camera, this._zoomInertia * this.inertiaZoom)
      this._zoomInertia *= this.inertiaZoom
    }
  }

  destroy(): void {
    this._handler.destroy()
  }
}
