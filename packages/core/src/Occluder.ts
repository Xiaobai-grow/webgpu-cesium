/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { BoundingSphere } from "./BoundingSphere"
import { Cartesian3 } from "./Cartesian3"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { Ellipsoid } from "./Ellipsoid"
import { CesiumMath } from "./CesiumMath"
import { Rectangle } from "./Rectangle"
import { Visibility, type VisibilityValue } from "./Visibility"

const scratchCartesian3 = new Cartesian3()
const tempVecScratch = new Cartesian3()
const occludeePositionScratch = new Cartesian3()
const tempScratch = new Cartesian3()
const occludeePointScratch = new Cartesian3()
const computeOccludeePointFromRectangleScratch: Cartesian3[] = []
const tempVec0Scratch = new Cartesian3()
const posDirectionScratch = new Cartesian3()
const posScratch1 = new Cartesian3()
const occluerPosScratch = new Cartesian3()
const posScratch2 = new Cartesian3()
const horizonPlanePosScratch = new Cartesian3()

/**
 * 由遮挡球与相机位置定义的地平线遮挡器。
 * 对标 Cesium `Core/Occluder.js`。
 */
export class Occluder {
  _occluderPosition: Cartesian3
  _occluderRadius: number
  _horizonDistance: number
  _horizonPlaneNormal: Cartesian3 | undefined
  _horizonPlanePosition: Cartesian3 | undefined
  _cameraPosition: Cartesian3 | undefined

  /**
   * @param occluderBoundingSphere 遮挡球
   * @param cameraPosition 相机位置
   */
  constructor(occluderBoundingSphere: BoundingSphere, cameraPosition: Cartesian3) {
    if (!defined(occluderBoundingSphere)) {
      throw new DeveloperError("occluderBoundingSphere is required.")
    }
    if (!defined(cameraPosition)) {
      throw new DeveloperError("camera position is required.")
    }
    this._occluderPosition = Cartesian3.clone(occluderBoundingSphere.center)
    this._occluderRadius = occluderBoundingSphere.radius
    this._horizonDistance = 0.0
    this._horizonPlaneNormal = undefined
    this._horizonPlanePosition = undefined
    this._cameraPosition = undefined
    this.cameraPosition = cameraPosition
  }

  /** 遮挡体中心 */
  get position(): Cartesian3 {
    return this._occluderPosition
  }

  /** 遮挡体半径 */
  get radius(): number {
    return this._occluderRadius
  }

  /** 相机位置（写入时重算地平线） */
  get cameraPosition(): Cartesian3 {
    return this._cameraPosition ?? Cartesian3.ZERO
  }

  set cameraPosition(cameraPosition: Cartesian3) {
    if (!defined(cameraPosition)) {
      throw new DeveloperError("cameraPosition is required.")
    }
    const stored = Cartesian3.clone(cameraPosition, this._cameraPosition)
    const cameraToOccluderVec = Cartesian3.subtract(
      this._occluderPosition,
      stored,
      scratchCartesian3,
    )
    let invCameraToOccluderDistance = Cartesian3.magnitudeSquared(cameraToOccluderVec)
    const occluderRadiusSqrd = this._occluderRadius * this._occluderRadius
    let horizonDistance: number
    let horizonPlaneNormal: Cartesian3 | undefined
    let horizonPlanePosition: Cartesian3 | undefined
    if (invCameraToOccluderDistance > occluderRadiusSqrd) {
      horizonDistance = Math.sqrt(invCameraToOccluderDistance - occluderRadiusSqrd)
      invCameraToOccluderDistance = 1.0 / Math.sqrt(invCameraToOccluderDistance)
      horizonPlaneNormal = Cartesian3.multiplyByScalar(
        cameraToOccluderVec,
        invCameraToOccluderDistance,
        scratchCartesian3,
      )
      const nearPlaneDistance = horizonDistance * horizonDistance * invCameraToOccluderDistance
      horizonPlanePosition = Cartesian3.add(
        stored,
        Cartesian3.multiplyByScalar(horizonPlaneNormal, nearPlaneDistance, scratchCartesian3),
        scratchCartesian3,
      )
      horizonPlaneNormal = Cartesian3.clone(horizonPlaneNormal)
      horizonPlanePosition = Cartesian3.clone(horizonPlanePosition)
    } else {
      horizonDistance = Number.MAX_VALUE
    }
    this._horizonDistance = horizonDistance
    this._horizonPlaneNormal = horizonPlaneNormal
    this._horizonPlanePosition = horizonPlanePosition
    this._cameraPosition = stored
  }

  /**
   * 由球与相机构造。
   *
   * @param occluderBoundingSphere 遮挡球
   * @param cameraPosition 相机
   * @param result 可选结果
   */
  static fromBoundingSphere(
    occluderBoundingSphere: BoundingSphere,
    cameraPosition: Cartesian3,
    result?: Occluder,
  ): Occluder {
    if (!defined(occluderBoundingSphere)) {
      throw new DeveloperError("occluderBoundingSphere is required.")
    }
    if (!defined(cameraPosition)) {
      throw new DeveloperError("camera position is required.")
    }
    if (!defined(result)) {
      return new Occluder(occluderBoundingSphere, cameraPosition)
    }
    Cartesian3.clone(occluderBoundingSphere.center, result._occluderPosition)
    result._occluderRadius = occluderBoundingSphere.radius
    result.cameraPosition = cameraPosition
    return result
  }

  /**
   * 点是否可见。
   *
   * @param occludee 点
   */
  isPointVisible(occludee: Cartesian3): boolean {
    if (this._horizonDistance !== Number.MAX_VALUE && defined(this._cameraPosition)) {
      let tempVec = Cartesian3.subtract(occludee, this._occluderPosition, tempVecScratch)
      let temp = this._occluderRadius
      temp = Cartesian3.magnitudeSquared(tempVec) - temp * temp
      if (temp > 0.0) {
        temp = Math.sqrt(temp) + this._horizonDistance
        tempVec = Cartesian3.subtract(occludee, this._cameraPosition, tempVec)
        return temp * temp > Cartesian3.magnitudeSquared(tempVec)
      }
    }
    return false
  }

  /**
   * 包围球是否可见。
   *
   * @param occludee 被遮挡球
   */
  isBoundingSphereVisible(occludee: BoundingSphere): boolean {
    const occludeePosition = Cartesian3.clone(occludee.center, occludeePositionScratch)
    const occludeeRadius = occludee.radius
    if (this._horizonDistance !== Number.MAX_VALUE && defined(this._cameraPosition)) {
      let tempVec = Cartesian3.subtract(occludeePosition, this._occluderPosition, tempVecScratch)
      let temp = this._occluderRadius - occludeeRadius
      temp = Cartesian3.magnitudeSquared(tempVec) - temp * temp
      if (occludeeRadius < this._occluderRadius) {
        if (temp > 0.0) {
          temp = Math.sqrt(temp) + this._horizonDistance
          tempVec = Cartesian3.subtract(occludeePosition, this._cameraPosition, tempVec)
          return (
            temp * temp + occludeeRadius * occludeeRadius > Cartesian3.magnitudeSquared(tempVec)
          )
        }
        return false
      }
      if (temp > 0.0) {
        tempVec = Cartesian3.subtract(occludeePosition, this._cameraPosition, tempVec)
        const tempVecMagnitudeSquared = Cartesian3.magnitudeSquared(tempVec)
        const occluderRadiusSquared = this._occluderRadius * this._occluderRadius
        const occludeeRadiusSquared = occludeeRadius * occludeeRadius
        if (
          (this._horizonDistance * this._horizonDistance + occluderRadiusSquared) *
            occludeeRadiusSquared >
          tempVecMagnitudeSquared * occluderRadiusSquared
        ) {
          return true
        }
        temp = Math.sqrt(temp) + this._horizonDistance
        return temp * temp + occludeeRadiusSquared > tempVecMagnitudeSquared
      }
      return true
    }
    return false
  }

  /**
   * 可见程度：NONE / PARTIAL / FULL。
   *
   * @param occludeeBS 被遮挡球
   */
  computeVisibility(occludeeBS: BoundingSphere): VisibilityValue {
    if (!defined(occludeeBS)) {
      throw new DeveloperError("occludeeBS is required.")
    }
    const occludeePosition = Cartesian3.clone(occludeeBS.center)
    const occludeeRadius = occludeeBS.radius
    if (occludeeRadius > this._occluderRadius) {
      return Visibility.FULL
    }
    if (this._horizonDistance !== Number.MAX_VALUE && defined(this._cameraPosition)) {
      let tempVec = Cartesian3.subtract(occludeePosition, this._occluderPosition, tempScratch)
      let temp = this._occluderRadius - occludeeRadius
      const occluderToOccludeeDistSqrd = Cartesian3.magnitudeSquared(tempVec)
      temp = occluderToOccludeeDistSqrd - temp * temp
      if (temp > 0.0) {
        temp = Math.sqrt(temp) + this._horizonDistance
        tempVec = Cartesian3.subtract(occludeePosition, this._cameraPosition, tempVec)
        const cameraToOccludeeDistSqrd = Cartesian3.magnitudeSquared(tempVec)
        if (temp * temp + occludeeRadius * occludeeRadius < cameraToOccludeeDistSqrd) {
          return Visibility.NONE
        }
        temp = this._occluderRadius + occludeeRadius
        temp = occluderToOccludeeDistSqrd - temp * temp
        if (temp > 0.0) {
          temp = Math.sqrt(temp) + this._horizonDistance
          return cameraToOccludeeDistSqrd < temp * temp + occludeeRadius * occludeeRadius
            ? Visibility.FULL
            : Visibility.PARTIAL
        }
        if (defined(this._horizonPlanePosition) && defined(this._horizonPlaneNormal)) {
          tempVec = Cartesian3.subtract(occludeePosition, this._horizonPlanePosition, tempVec)
          return Cartesian3.dot(tempVec, this._horizonPlaneNormal) > -occludeeRadius
            ? Visibility.PARTIAL
            : Visibility.FULL
        }
      }
    }
    return Visibility.NONE
  }

  /**
   * 由若干地平线附近点计算 occludee 代表点。
   *
   * @param occluderBoundingSphere 遮挡球
   * @param occludeePosition 被遮挡中心
   * @param positions 地平线点
   */
  static computeOccludeePoint(
    occluderBoundingSphere: BoundingSphere,
    occludeePosition: Cartesian3,
    positions: Cartesian3[],
  ): Cartesian3 | undefined {
    if (!defined(occluderBoundingSphere)) {
      throw new DeveloperError("occluderBoundingSphere is required.")
    }
    if (!defined(positions)) {
      throw new DeveloperError("positions is required.")
    }
    if (positions.length === 0) {
      throw new DeveloperError("positions must contain at least one element")
    }
    const occludeePos = Cartesian3.clone(occludeePosition)
    const occluderPosition = Cartesian3.clone(occluderBoundingSphere.center)
    const occluderRadius = occluderBoundingSphere.radius
    const numPositions = positions.length
    if (Cartesian3.equals(occluderPosition, occludeePosition)) {
      throw new DeveloperError(
        "occludeePosition must be different than occluderBoundingSphere.center",
      )
    }
    const occluderPlaneNormal = Cartesian3.normalize(
      Cartesian3.subtract(occludeePos, occluderPosition, occludeePointScratch),
      occludeePointScratch,
    )
    const occluderPlaneD = -Cartesian3.dot(occluderPlaneNormal, occluderPosition)
    const aRotationVector = Occluder._anyRotationVector(
      occluderPosition,
      occluderPlaneNormal,
      occluderPlaneD,
    )
    let dot = Occluder._horizonToPlaneNormalDotProduct(
      occluderBoundingSphere,
      occluderPlaneNormal,
      occluderPlaneD,
      aRotationVector,
      positions[0]!,
    )
    if (!dot) {
      return undefined
    }
    for (let i = 1; i < numPositions; ++i) {
      const tempDot = Occluder._horizonToPlaneNormalDotProduct(
        occluderBoundingSphere,
        occluderPlaneNormal,
        occluderPlaneD,
        aRotationVector,
        positions[i]!,
      )
      if (!tempDot) {
        return undefined
      }
      if (tempDot < dot) {
        dot = tempDot
      }
    }
    if (dot < 0.00174532836589830883577820272085) {
      return undefined
    }
    const distance = occluderRadius / dot
    return Cartesian3.add(
      occluderPosition,
      Cartesian3.multiplyByScalar(occluderPlaneNormal, distance, occludeePointScratch),
      occludeePointScratch,
    )
  }

  /**
   * 由矩形计算 occludee 代表点。
   *
   * @param rectangle 矩形
   * @param ellipsoid 椭球
   */
  static computeOccludeePointFromRectangle(
    rectangle: Rectangle,
    ellipsoid?: Ellipsoid,
  ): Cartesian3 | undefined {
    if (!defined(rectangle)) {
      throw new DeveloperError("rectangle is required.")
    }
    const ellip = ellipsoid ?? Ellipsoid.default
    const positions = Rectangle.subsample(
      rectangle,
      ellip,
      0.0,
      computeOccludeePointFromRectangleScratch,
    )
    const bs = BoundingSphere.fromPoints(positions)
    if (!Cartesian3.equals(Cartesian3.ZERO, bs.center)) {
      return Occluder.computeOccludeePoint(
        new BoundingSphere(Cartesian3.ZERO, ellip.minimumRadius),
        bs.center,
        positions,
      )
    }
    return undefined
  }

  /**
   * 平面内任一旋转向量。
   *
   * @param occluderPosition 遮挡中心
   * @param occluderPlaneNormal 平面法线
   * @param occluderPlaneD 平面 d
   */
  static _anyRotationVector(
    occluderPosition: Cartesian3,
    occluderPlaneNormal: Cartesian3,
    occluderPlaneD: number,
  ): Cartesian3 {
    const tempVec0 = Cartesian3.abs(occluderPlaneNormal, tempVec0Scratch)
    let majorAxis = tempVec0.x > tempVec0.y ? 0 : 1
    if (
      (majorAxis === 0 && tempVec0.z > tempVec0.x) ||
      (majorAxis === 1 && tempVec0.z > tempVec0.y)
    ) {
      majorAxis = 2
    }
    const tempVec = new Cartesian3()
    let tempVec1: Cartesian3
    if (majorAxis === 0) {
      tempVec0.x = occluderPosition.x
      tempVec0.y = occluderPosition.y + 1.0
      tempVec0.z = occluderPosition.z + 1.0
      tempVec1 = Cartesian3.UNIT_X
    } else if (majorAxis === 1) {
      tempVec0.x = occluderPosition.x + 1.0
      tempVec0.y = occluderPosition.y
      tempVec0.z = occluderPosition.z + 1.0
      tempVec1 = Cartesian3.UNIT_Y
    } else {
      tempVec0.x = occluderPosition.x + 1.0
      tempVec0.y = occluderPosition.y + 1.0
      tempVec0.z = occluderPosition.z
      tempVec1 = Cartesian3.UNIT_Z
    }
    const u =
      (Cartesian3.dot(occluderPlaneNormal, tempVec0) + occluderPlaneD) /
      -Cartesian3.dot(occluderPlaneNormal, tempVec1)
    return Cartesian3.normalize(
      Cartesian3.subtract(
        Cartesian3.add(tempVec0, Cartesian3.multiplyByScalar(tempVec1, u, tempVec), tempVec0),
        occluderPosition,
        tempVec0,
      ),
      tempVec0,
    )
  }

  /**
   * 旋转向量。
   *
   * @param occluderPosition 遮挡中心
   * @param occluderPlaneNormal 平面法线
   * @param occluderPlaneD 平面 d
   * @param position 点
   * @param anyRotationVector 回退向量
   */
  static _rotationVector(
    occluderPosition: Cartesian3,
    occluderPlaneNormal: Cartesian3,
    occluderPlaneD: number,
    position: Cartesian3,
    anyRotationVector: Cartesian3,
  ): Cartesian3 {
    void occluderPlaneD
    let positionDirection = Cartesian3.subtract(position, occluderPosition, posDirectionScratch)
    positionDirection = Cartesian3.normalize(positionDirection, positionDirection)
    if (
      Cartesian3.dot(occluderPlaneNormal, positionDirection) < 0.99999998476912904932780850903444
    ) {
      const crossProduct = Cartesian3.cross(
        occluderPlaneNormal,
        positionDirection,
        positionDirection,
      )
      const length = Cartesian3.magnitude(crossProduct)
      if (length > CesiumMath.EPSILON13) {
        return Cartesian3.normalize(crossProduct, new Cartesian3())
      }
    }
    return anyRotationVector
  }

  /**
   * 地平线与平面法线点积；点在球内返回 false。
   *
   * @param occluderBS 遮挡球
   * @param occluderPlaneNormal 平面法线
   * @param occluderPlaneD 平面 d
   * @param anyRotationVector 回退旋转
   * @param position 点
   */
  static _horizonToPlaneNormalDotProduct(
    occluderBS: BoundingSphere,
    occluderPlaneNormal: Cartesian3,
    occluderPlaneD: number,
    anyRotationVector: Cartesian3,
    position: Cartesian3,
  ): number | false {
    const pos = Cartesian3.clone(position, posScratch1)
    const occluderPosition = Cartesian3.clone(occluderBS.center, occluerPosScratch)
    const occluderRadius = occluderBS.radius
    let positionToOccluder = Cartesian3.subtract(occluderPosition, pos, posScratch2)
    const occluderToPositionDistanceSquared = Cartesian3.magnitudeSquared(positionToOccluder)
    const occluderRadiusSquared = occluderRadius * occluderRadius
    if (occluderToPositionDistanceSquared < occluderRadiusSquared) {
      return false
    }
    const horizonDistanceSquared = occluderToPositionDistanceSquared - occluderRadiusSquared
    const horizonDistance = Math.sqrt(horizonDistanceSquared)
    const occluderToPositionDistance = Math.sqrt(occluderToPositionDistanceSquared)
    const invOccluderToPositionDistance = 1.0 / occluderToPositionDistance
    const cosTheta = horizonDistance * invOccluderToPositionDistance
    const horizonPlaneDistance = cosTheta * horizonDistance
    positionToOccluder = Cartesian3.normalize(positionToOccluder, positionToOccluder)
    const horizonPlanePosition = Cartesian3.add(
      pos,
      Cartesian3.multiplyByScalar(positionToOccluder, horizonPlaneDistance, horizonPlanePosScratch),
      horizonPlanePosScratch,
    )
    const horizonCrossDistance = Math.sqrt(
      horizonDistanceSquared - horizonPlaneDistance * horizonPlaneDistance,
    )
    let tempVec = Occluder._rotationVector(
      occluderPosition,
      occluderPlaneNormal,
      occluderPlaneD,
      pos,
      anyRotationVector,
    )
    let horizonCrossDirection = Cartesian3.fromElements(
      tempVec.x * tempVec.x * positionToOccluder.x +
        (tempVec.x * tempVec.y - tempVec.z) * positionToOccluder.y +
        (tempVec.x * tempVec.z + tempVec.y) * positionToOccluder.z,
      (tempVec.x * tempVec.y + tempVec.z) * positionToOccluder.x +
        tempVec.y * tempVec.y * positionToOccluder.y +
        (tempVec.y * tempVec.z - tempVec.x) * positionToOccluder.z,
      (tempVec.x * tempVec.z - tempVec.y) * positionToOccluder.x +
        (tempVec.y * tempVec.z + tempVec.x) * positionToOccluder.y +
        tempVec.z * tempVec.z * positionToOccluder.z,
      posScratch1,
    )
    horizonCrossDirection = Cartesian3.normalize(horizonCrossDirection, horizonCrossDirection)
    const offset = Cartesian3.multiplyByScalar(
      horizonCrossDirection,
      horizonCrossDistance,
      posScratch1,
    )
    tempVec = Cartesian3.normalize(
      Cartesian3.subtract(
        Cartesian3.add(horizonPlanePosition, offset, posScratch2),
        occluderPosition,
        posScratch2,
      ),
      posScratch2,
    )
    const dot0 = Cartesian3.dot(occluderPlaneNormal, tempVec)
    tempVec = Cartesian3.normalize(
      Cartesian3.subtract(
        Cartesian3.subtract(horizonPlanePosition, offset, tempVec),
        occluderPosition,
        tempVec,
      ),
      tempVec,
    )
    const dot1 = Cartesian3.dot(occluderPlaneNormal, tempVec)
    return dot0 < dot1 ? dot0 : dot1
  }
}
