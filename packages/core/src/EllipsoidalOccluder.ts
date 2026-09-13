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
import { Check } from "./Check"
import { defined } from "./defined"
import { Ellipsoid } from "./Ellipsoid"
import { Rectangle } from "./Rectangle"
import type { TypedArray } from "./globalTypes"

const scratchCartesian = new Cartesian3()
const scratchCameraPositionInScaledSpaceShrunk = new Cartesian3()
const scratchEllipsoidShrunk = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE)!
const subsampleScratch: Cartesian3[] = []
const scratchEllipsoidShrunkRadii = new Cartesian3()
const positionScratch = new Cartesian3()
const scaledSpaceScratch = new Cartesian3()
const directionScratch = new Cartesian3()
const directionToPointScratch = new Cartesian3()

/**
 * 可能缩小的椭球（负最小高程）。
 *
 * @param ellipsoid 原椭球
 * @param minimumHeight 最小高
 * @param result 结果
 */
function getPossiblyShrunkEllipsoid(
  ellipsoid: Ellipsoid,
  minimumHeight: number | undefined,
  result: Ellipsoid,
): Ellipsoid {
  if (defined(minimumHeight) && minimumHeight < 0.0 && ellipsoid.minimumRadius > -minimumHeight) {
    const ellipsoidShrunkRadii = Cartesian3.fromElements(
      ellipsoid.radii.x + minimumHeight,
      ellipsoid.radii.y + minimumHeight,
      ellipsoid.radii.z + minimumHeight,
      scratchEllipsoidShrunkRadii,
    )
    return Ellipsoid.fromCartesian3(ellipsoidShrunkRadii, result) ?? result
  }
  return ellipsoid
}

/**
 * 由位置列计算地平线剔除点。
 *
 * @param ellipsoid 椭球
 * @param directionToPoint 方向
 * @param positions 点列
 * @param result 结果
 */
function computeHorizonCullingPointFromPositions(
  ellipsoid: Ellipsoid,
  directionToPoint: Cartesian3,
  positions: Cartesian3[],
  result?: Cartesian3,
): Cartesian3 | undefined {
  Check.typeOf.object("directionToPoint", directionToPoint)
  Check.defined("positions", positions)
  const out = defined(result) ? result : new Cartesian3()
  const scaledSpaceDirectionToPoint = computeScaledSpaceDirectionToPoint(
    ellipsoid,
    directionToPoint,
  )
  let resultMagnitude = 0.0
  for (let i = 0, len = positions.length; i < len; ++i) {
    const candidateMagnitude = computeMagnitude(
      ellipsoid,
      positions[i]!,
      scaledSpaceDirectionToPoint,
    )
    if (candidateMagnitude < 0.0) {
      return undefined
    }
    resultMagnitude = Math.max(resultMagnitude, candidateMagnitude)
  }
  return magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, out)
}

/**
 * 由交错顶点计算地平线剔除点。
 *
 * @param ellipsoid 椭球
 * @param directionToPoint 方向
 * @param vertices 顶点
 * @param stride 步长
 * @param center 中心
 * @param result 结果
 */
function computeHorizonCullingPointFromVertices(
  ellipsoid: Ellipsoid,
  directionToPoint: Cartesian3,
  vertices: number[] | TypedArray,
  stride: number | undefined,
  center: Cartesian3 | undefined,
  result?: Cartesian3,
): Cartesian3 | undefined {
  Check.typeOf.object("directionToPoint", directionToPoint)
  Check.defined("vertices", vertices)
  const step = stride ?? 3
  Check.typeOf.number("stride", step)
  const out = defined(result) ? result : new Cartesian3()
  const origin = center ?? Cartesian3.ZERO
  const scaledSpaceDirectionToPoint = computeScaledSpaceDirectionToPoint(
    ellipsoid,
    directionToPoint,
  )
  let resultMagnitude = 0.0
  for (let i = 0, len = vertices.length; i < len; i += step) {
    positionScratch.x = vertices[i]! + origin.x
    positionScratch.y = vertices[i + 1]! + origin.y
    positionScratch.z = vertices[i + 2]! + origin.z
    const candidateMagnitude = computeMagnitude(
      ellipsoid,
      positionScratch,
      scaledSpaceDirectionToPoint,
    )
    if (candidateMagnitude < 0.0) {
      return undefined
    }
    resultMagnitude = Math.max(resultMagnitude, candidateMagnitude)
  }
  return magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, out)
}

/**
 * 缩放空间点是否未被地平线遮挡。
 *
 * @param occludeeScaledSpacePosition 缩放空间点
 * @param cameraPositionInScaledSpace 缩放空间相机
 * @param distanceToLimbInScaledSpaceSquared 到肢端距离平方
 */
function isScaledSpacePointVisible(
  occludeeScaledSpacePosition: Cartesian3,
  cameraPositionInScaledSpace: Cartesian3,
  distanceToLimbInScaledSpaceSquared: number,
): boolean {
  const cv = cameraPositionInScaledSpace
  const vhMagnitudeSquared = distanceToLimbInScaledSpaceSquared
  const vt = Cartesian3.subtract(occludeeScaledSpacePosition, cv, scratchCartesian)
  const vtDotVc = -Cartesian3.dot(vt, cv)
  const isOccluded =
    vhMagnitudeSquared < 0
      ? vtDotVc > 0
      : vtDotVc > vhMagnitudeSquared &&
        (vtDotVc * vtDotVc) / Cartesian3.magnitudeSquared(vt) > vhMagnitudeSquared
  return !isOccluded
}

/**
 * 单点对方向的 magnitude。
 *
 * @param ellipsoid 椭球
 * @param position 点
 * @param scaledSpaceDirectionToPoint 缩放空间方向
 */
function computeMagnitude(
  ellipsoid: Ellipsoid,
  position: Cartesian3,
  scaledSpaceDirectionToPoint: Cartesian3,
): number {
  const scaledSpacePosition = ellipsoid.transformPositionToScaledSpace(position, scaledSpaceScratch)
  let magnitudeSquared = Cartesian3.magnitudeSquared(scaledSpacePosition)
  let magnitude = Math.sqrt(magnitudeSquared)
  const direction = Cartesian3.divideByScalar(scaledSpacePosition, magnitude, directionScratch)
  magnitudeSquared = Math.max(1.0, magnitudeSquared)
  magnitude = Math.max(1.0, magnitude)
  const cosAlpha = Cartesian3.dot(direction, scaledSpaceDirectionToPoint)
  const sinAlpha = Cartesian3.magnitude(
    Cartesian3.cross(direction, scaledSpaceDirectionToPoint, direction),
  )
  const cosBeta = 1.0 / magnitude
  const sinBeta = Math.sqrt(magnitudeSquared - 1.0) * cosBeta
  return 1.0 / (cosAlpha * cosBeta - sinAlpha * sinBeta)
}

/**
 * magnitude 转为缩放空间点。
 *
 * @param scaledSpaceDirectionToPoint 方向
 * @param resultMagnitude 模
 * @param result 结果
 */
function magnitudeToPoint(
  scaledSpaceDirectionToPoint: Cartesian3,
  resultMagnitude: number,
  result: Cartesian3,
): Cartesian3 | undefined {
  if (
    resultMagnitude <= 0.0 ||
    resultMagnitude === 1.0 / 0.0 ||
    resultMagnitude !== resultMagnitude
  ) {
    return undefined
  }
  return Cartesian3.multiplyByScalar(scaledSpaceDirectionToPoint, resultMagnitude, result)
}

/**
 * 方向转到缩放空间并归一化。
 *
 * @param ellipsoid 椭球
 * @param directionToPoint 方向
 */
function computeScaledSpaceDirectionToPoint(
  ellipsoid: Ellipsoid,
  directionToPoint: Cartesian3,
): Cartesian3 {
  if (Cartesian3.equals(directionToPoint, Cartesian3.ZERO)) {
    return directionToPoint
  }
  ellipsoid.transformPositionToScaledSpace(directionToPoint, directionToPointScratch)
  return Cartesian3.normalize(directionToPointScratch, directionToPointScratch)
}

/**
 * 椭球地平线遮挡（原点椭球）。
 * 对标 Cesium `Core/EllipsoidalOccluder.js`。
 */
export class EllipsoidalOccluder {
  _ellipsoid: Ellipsoid
  _cameraPosition: Cartesian3
  _cameraPositionInScaledSpace: Cartesian3
  _distanceToLimbInScaledSpaceSquared: number

  /**
   * @param ellipsoid 椭球
   * @param cameraPosition 相机；可稍后设置
   */
  constructor(ellipsoid: Ellipsoid, cameraPosition?: Cartesian3) {
    Check.typeOf.object("ellipsoid", ellipsoid)
    this._ellipsoid = ellipsoid
    this._cameraPosition = new Cartesian3()
    this._cameraPositionInScaledSpace = new Cartesian3()
    this._distanceToLimbInScaledSpaceSquared = 0.0
    if (defined(cameraPosition)) {
      this.cameraPosition = cameraPosition
    }
  }

  /** 遮挡椭球 */
  get ellipsoid(): Ellipsoid {
    return this._ellipsoid
  }

  /** 相机位置 */
  get cameraPosition(): Cartesian3 {
    return this._cameraPosition
  }

  set cameraPosition(cameraPosition: Cartesian3) {
    const ellipsoid = this._ellipsoid
    const cv = ellipsoid.transformPositionToScaledSpace(
      cameraPosition,
      this._cameraPositionInScaledSpace,
    )
    const vhMagnitudeSquared = Cartesian3.magnitudeSquared(cv) - 1.0
    Cartesian3.clone(cameraPosition, this._cameraPosition)
    this._cameraPositionInScaledSpace = cv
    this._distanceToLimbInScaledSpaceSquared = vhMagnitudeSquared
  }

  /**
   * 点是否可见。
   *
   * @param occludee 点
   */
  isPointVisible(occludee: Cartesian3): boolean {
    const occludeeScaledSpacePosition = this._ellipsoid.transformPositionToScaledSpace(
      occludee,
      scratchCartesian,
    )
    return isScaledSpacePointVisible(
      occludeeScaledSpacePosition,
      this._cameraPositionInScaledSpace,
      this._distanceToLimbInScaledSpaceSquared,
    )
  }

  /**
   * 缩放空间点是否可见。
   *
   * @param occludeeScaledSpacePosition 缩放空间点
   */
  isScaledSpacePointVisible(occludeeScaledSpacePosition: Cartesian3): boolean {
    return isScaledSpacePointVisible(
      occludeeScaledSpacePosition,
      this._cameraPositionInScaledSpace,
      this._distanceToLimbInScaledSpaceSquared,
    )
  }

  /**
   * 相对可能缩小椭球的缩放空间可见性。
   *
   * @param occludeeScaledSpacePosition 缩放空间点
   * @param minimumHeight 最小高
   */
  isScaledSpacePointVisiblePossiblyUnderEllipsoid(
    occludeeScaledSpacePosition: Cartesian3,
    minimumHeight?: number,
  ): boolean {
    const ellipsoid = this._ellipsoid
    let vhMagnitudeSquared: number
    let cv: Cartesian3
    if (defined(minimumHeight) && minimumHeight < 0.0 && ellipsoid.minimumRadius > -minimumHeight) {
      cv = scratchCameraPositionInScaledSpaceShrunk
      cv.x = this._cameraPosition.x / (ellipsoid.radii.x + minimumHeight)
      cv.y = this._cameraPosition.y / (ellipsoid.radii.y + minimumHeight)
      cv.z = this._cameraPosition.z / (ellipsoid.radii.z + minimumHeight)
      vhMagnitudeSquared = cv.x * cv.x + cv.y * cv.y + cv.z * cv.z - 1.0
    } else {
      cv = this._cameraPositionInScaledSpace
      vhMagnitudeSquared = this._distanceToLimbInScaledSpaceSquared
    }
    return isScaledSpacePointVisible(occludeeScaledSpacePosition, cv, vhMagnitudeSquared)
  }

  /**
   * 由位置列计算地平线剔除点。
   *
   * @param directionToPoint 方向
   * @param positions 点列
   * @param result 可选结果
   */
  computeHorizonCullingPoint(
    directionToPoint: Cartesian3,
    positions: Cartesian3[],
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    return computeHorizonCullingPointFromPositions(
      this._ellipsoid,
      directionToPoint,
      positions,
      result,
    )
  }

  /**
   * 相对可能缩小椭球的地平线剔除点。
   *
   * @param directionToPoint 方向
   * @param positions 点列
   * @param minimumHeight 最小高
   * @param result 可选结果
   */
  computeHorizonCullingPointPossiblyUnderEllipsoid(
    directionToPoint: Cartesian3,
    positions: Cartesian3[],
    minimumHeight?: number,
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    const possiblyShrunkEllipsoid = getPossiblyShrunkEllipsoid(
      this._ellipsoid,
      minimumHeight,
      scratchEllipsoidShrunk,
    )
    return computeHorizonCullingPointFromPositions(
      possiblyShrunkEllipsoid,
      directionToPoint,
      positions,
      result,
    )
  }

  /**
   * 由交错顶点计算地平线剔除点。
   *
   * @param directionToPoint 方向
   * @param vertices 顶点
   * @param stride 步长
   * @param center 中心
   * @param result 可选结果
   */
  computeHorizonCullingPointFromVertices(
    directionToPoint: Cartesian3,
    vertices: number[] | TypedArray,
    stride?: number,
    center?: Cartesian3,
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    return computeHorizonCullingPointFromVertices(
      this._ellipsoid,
      directionToPoint,
      vertices,
      stride,
      center,
      result,
    )
  }

  /**
   * 相对可能缩小椭球、由顶点计算地平线剔除点。
   *
   * @param directionToPoint 方向
   * @param vertices 顶点
   * @param stride 步长
   * @param center 中心
   * @param minimumHeight 最小高
   * @param result 可选结果
   */
  computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid(
    directionToPoint: Cartesian3,
    vertices: number[] | TypedArray,
    stride?: number,
    center?: Cartesian3,
    minimumHeight?: number,
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    const possiblyShrunkEllipsoid = getPossiblyShrunkEllipsoid(
      this._ellipsoid,
      minimumHeight,
      scratchEllipsoidShrunk,
    )
    return computeHorizonCullingPointFromVertices(
      possiblyShrunkEllipsoid,
      directionToPoint,
      vertices,
      stride,
      center,
      result,
    )
  }

  /**
   * 由矩形计算地平线剔除点。
   *
   * @param rectangle 矩形
   * @param ellipsoid 矩形所在椭球
   * @param result 可选结果
   */
  computeHorizonCullingPointFromRectangle(
    rectangle: Rectangle,
    ellipsoid: Ellipsoid,
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    Check.typeOf.object("rectangle", rectangle)
    const positions = Rectangle.subsample(rectangle, ellipsoid, 0.0, subsampleScratch)
    const bs = BoundingSphere.fromPoints(positions)
    if (Cartesian3.magnitude(bs.center) < 0.1 * ellipsoid.minimumRadius) {
      return undefined
    }
    return this.computeHorizonCullingPoint(bs.center, positions, result)
  }
}
