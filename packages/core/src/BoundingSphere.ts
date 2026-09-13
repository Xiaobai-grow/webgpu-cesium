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
import { Cartographic } from "./Cartographic"
import { Check } from "./Check"
import { defined } from "./defined"
import { Ellipsoid } from "./Ellipsoid"
import { GeographicProjection } from "./GeographicProjection"
import { Intersect, type IntersectValue } from "./Intersect"
import { Interval } from "./Interval"
import { CesiumMath } from "./CesiumMath"
import { Matrix3 } from "./Matrix3"
import { Matrix4 } from "./Matrix4"
import { Rectangle } from "./Rectangle"
import type { Plane } from "./Plane"
import type { TypedArray } from "./globalTypes"

/** 2D 投影（`fromRectangle2D` / `projectTo2D`） */
export interface BoundingSphereMapProjection {
  ellipsoid: Ellipsoid
  project(cartographic: Cartographic, result?: Cartesian3): Cartesian3
}

/** `fromOrientedBoundingBox` 所需字段 */
export interface OrientedBoundingBoxLike {
  center: Cartesian3
  halfAxes: Matrix3
}

/** 遮挡查询 */
export interface BoundingSphereOccluder {
  isBoundingSphereVisible(sphere: BoundingSphere): boolean
}

const fromPointsXMin = new Cartesian3()
const fromPointsYMin = new Cartesian3()
const fromPointsZMin = new Cartesian3()
const fromPointsXMax = new Cartesian3()
const fromPointsYMax = new Cartesian3()
const fromPointsZMax = new Cartesian3()
const fromPointsCurrentPos = new Cartesian3()
const fromPointsScratch = new Cartesian3()
const fromPointsRitterCenter = new Cartesian3()
const fromPointsMinBoxPt = new Cartesian3()
const fromPointsMaxBoxPt = new Cartesian3()
const fromPointsNaiveCenterScratch = new Cartesian3()
const volumeConstant = (4.0 / 3.0) * CesiumMath.PI

const defaultProjection = new GeographicProjection()
const fromRectangle2DLowerLeft = new Cartesian3()
const fromRectangle2DUpperRight = new Cartesian3()
const fromRectangle2DSouthwest = new Cartographic()
const fromRectangle2DNortheast = new Cartographic()
const fromRectangle3DScratch: Cartesian3[] = []

const fromOrientedBoundingBoxScratchU = new Cartesian3()
const fromOrientedBoundingBoxScratchV = new Cartesian3()
const fromOrientedBoundingBoxScratchW = new Cartesian3()
const scratchFromTransformationCenter = new Cartesian3()
const scratchFromTransformationScale = new Cartesian3()
const unionScratch = new Cartesian3()
const unionScratchCenter = new Cartesian3()
const expandScratch = new Cartesian3()
const distanceSquaredToScratch = new Cartesian3()
const scratchCartesian3 = new Cartesian3()
const projectTo2DNormalScratch = new Cartesian3()
const projectTo2DEastScratch = new Cartesian3()
const projectTo2DNorthScratch = new Cartesian3()
const projectTo2DWestScratch = new Cartesian3()
const projectTo2DSouthScratch = new Cartesian3()
const projectTo2DCartographicScratch = new Cartographic()
const projectTo2DPositionsScratch = [
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
]
const projectTo2DProjection = new GeographicProjection()

/**
 * 把投影的内部椭球切到 `Ellipsoid.default`（Cesium 语义）。
 *
 * @param projection GeographicProjection
 */
function syncDefaultEllipsoid(projection: GeographicProjection): void {
  ;(projection as GeographicProjection & { _ellipsoid: Ellipsoid })._ellipsoid = Ellipsoid.default
}

/**
 * Ritter + naive 双算法求点集包围球。
 *
 * @param positions 点列
 * @param result 结果
 */
function sphereFromCartesian3List(positions: Cartesian3[], result: BoundingSphere): BoundingSphere {
  const first = positions[0]!
  const currentPos = Cartesian3.clone(first, fromPointsCurrentPos)
  const xMin = Cartesian3.clone(currentPos, fromPointsXMin)
  const yMin = Cartesian3.clone(currentPos, fromPointsYMin)
  const zMin = Cartesian3.clone(currentPos, fromPointsZMin)
  const xMax = Cartesian3.clone(currentPos, fromPointsXMax)
  const yMax = Cartesian3.clone(currentPos, fromPointsYMax)
  const zMax = Cartesian3.clone(currentPos, fromPointsZMax)
  const numPositions = positions.length
  for (let i = 1; i < numPositions; i++) {
    Cartesian3.clone(positions[i]!, currentPos)
    if (currentPos.x < xMin.x) {
      Cartesian3.clone(currentPos, xMin)
    }
    if (currentPos.x > xMax.x) {
      Cartesian3.clone(currentPos, xMax)
    }
    if (currentPos.y < yMin.y) {
      Cartesian3.clone(currentPos, yMin)
    }
    if (currentPos.y > yMax.y) {
      Cartesian3.clone(currentPos, yMax)
    }
    if (currentPos.z < zMin.z) {
      Cartesian3.clone(currentPos, zMin)
    }
    if (currentPos.z > zMax.z) {
      Cartesian3.clone(currentPos, zMax)
    }
  }
  const xSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(xMax, xMin, fromPointsScratch))
  const ySpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(yMax, yMin, fromPointsScratch))
  const zSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(zMax, zMin, fromPointsScratch))
  let diameter1 = xMin
  let diameter2 = xMax
  let maxSpan = xSpan
  if (ySpan > maxSpan) {
    maxSpan = ySpan
    diameter1 = yMin
    diameter2 = yMax
  }
  if (zSpan > maxSpan) {
    diameter1 = zMin
    diameter2 = zMax
  }
  const ritterCenter = fromPointsRitterCenter
  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5
  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5
  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5
  let radiusSquared = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch),
  )
  let ritterRadius = Math.sqrt(radiusSquared)
  const minBoxPt = fromPointsMinBoxPt
  minBoxPt.x = xMin.x
  minBoxPt.y = yMin.y
  minBoxPt.z = zMin.z
  const maxBoxPt = fromPointsMaxBoxPt
  maxBoxPt.x = xMax.x
  maxBoxPt.y = yMax.y
  maxBoxPt.z = zMax.z
  const naiveCenter = Cartesian3.midpoint(minBoxPt, maxBoxPt, fromPointsNaiveCenterScratch)
  let naiveRadius = 0
  for (let i = 0; i < numPositions; i++) {
    Cartesian3.clone(positions[i]!, currentPos)
    const r = Cartesian3.magnitude(Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch))
    if (r > naiveRadius) {
      naiveRadius = r
    }
    const oldCenterToPointSquared = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch),
    )
    if (oldCenterToPointSquared > radiusSquared) {
      const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared)
      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5
      radiusSquared = ritterRadius * ritterRadius
      const oldToNew = oldCenterToPoint - ritterRadius
      ritterCenter.x = (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint
      ritterCenter.y = (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint
      ritterCenter.z = (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint
    }
  }
  if (ritterRadius < naiveRadius) {
    Cartesian3.clone(ritterCenter, result.center)
    result.radius = ritterRadius
  } else {
    Cartesian3.clone(naiveCenter, result.center)
    result.radius = naiveRadius
  }
  return result
}

/**
 * 球心 + 半径包围球。
 * 对标 Cesium `Core/BoundingSphere.js`。
 */
export class BoundingSphere {
  center: Cartesian3
  radius: number

  /**
   * @param center 球心
   * @param radius 半径
   */
  constructor(center?: Cartesian3, radius?: number) {
    this.center = Cartesian3.clone(center ?? Cartesian3.ZERO)
    this.radius = radius ?? 0.0
  }

  /**
   * Ritter + naive 双算法求点集包围球。
   *
   * @param positions 点列
   * @param result 可选结果
   */
  static fromPoints(positions?: Cartesian3[], result?: BoundingSphere): BoundingSphere {
    const out = defined(result) ? result : new BoundingSphere()
    if (!defined(positions) || positions.length === 0) {
      out.center = Cartesian3.clone(Cartesian3.ZERO, out.center)
      out.radius = 0.0
      return out
    }
    return sphereFromCartesian3List(positions, out)
  }

  /**
   * 由 2D 投影矩形构造。
   *
   * @param rectangle 矩形
   * @param projection 投影
   * @param result 可选结果
   */
  static fromRectangle2D(
    rectangle?: Rectangle,
    projection?: BoundingSphereMapProjection,
    result?: BoundingSphere,
  ): BoundingSphere {
    return BoundingSphere.fromRectangleWithHeights2D(rectangle, projection, 0.0, 0.0, result)
  }

  /**
   * 由带高度的 2D 投影矩形构造。
   *
   * @param rectangle 矩形
   * @param projection 投影
   * @param minimumHeight 最小高
   * @param maximumHeight 最大高
   * @param result 可选结果
   */
  static fromRectangleWithHeights2D(
    rectangle?: Rectangle,
    projection?: BoundingSphereMapProjection,
    minimumHeight?: number,
    maximumHeight?: number,
    result?: BoundingSphere,
  ): BoundingSphere {
    const out = defined(result) ? result : new BoundingSphere()
    if (!defined(rectangle)) {
      out.center = Cartesian3.clone(Cartesian3.ZERO, out.center)
      out.radius = 0.0
      return out
    }
    syncDefaultEllipsoid(defaultProjection)
    const proj = projection ?? defaultProjection
    const minH = minimumHeight ?? 0.0
    const maxH = maximumHeight ?? 0.0
    Rectangle.southwest(rectangle, fromRectangle2DSouthwest)
    fromRectangle2DSouthwest.height = minH
    Rectangle.northeast(rectangle, fromRectangle2DNortheast)
    fromRectangle2DNortheast.height = maxH
    const lowerLeft = proj.project(fromRectangle2DSouthwest, fromRectangle2DLowerLeft)
    const upperRight = proj.project(fromRectangle2DNortheast, fromRectangle2DUpperRight)
    const width = upperRight.x - lowerLeft.x
    const height = upperRight.y - lowerLeft.y
    const elevation = upperRight.z - lowerLeft.z
    out.radius = Math.sqrt(width * width + height * height + elevation * elevation) * 0.5
    const center = out.center
    center.x = lowerLeft.x + width * 0.5
    center.y = lowerLeft.y + height * 0.5
    center.z = lowerLeft.z + elevation * 0.5
    return out
  }

  /**
   * 由 3D 椭球上的矩形子采样点构造。
   *
   * @param rectangle 矩形
   * @param ellipsoid 椭球
   * @param surfaceHeight 高程
   * @param result 可选结果
   */
  static fromRectangle3D(
    rectangle?: Rectangle,
    ellipsoid?: Ellipsoid,
    surfaceHeight?: number,
    result?: BoundingSphere,
  ): BoundingSphere {
    const ellip = ellipsoid ?? Ellipsoid.default
    const height = surfaceHeight ?? 0.0
    const out = defined(result) ? result : new BoundingSphere()
    if (!defined(rectangle)) {
      out.center = Cartesian3.clone(Cartesian3.ZERO, out.center)
      out.radius = 0.0
      return out
    }
    const positions = Rectangle.subsample(rectangle, ellip, height, fromRectangle3DScratch)
    return BoundingSphere.fromPoints(positions, out)
  }

  /**
   * 由交错顶点数组（可选 RTC 中心）构造。
   *
   * @param positions 扁平 xyz
   * @param center RTC 中心
   * @param stride 每顶点步长，至少 3
   * @param result 可选结果
   */
  static fromVertices(
    positions?: number[] | TypedArray,
    center?: Cartesian3,
    stride?: number,
    result?: BoundingSphere,
  ): BoundingSphere {
    const out = defined(result) ? result : new BoundingSphere()
    if (!defined(positions) || positions.length === 0) {
      out.center = Cartesian3.clone(Cartesian3.ZERO, out.center)
      out.radius = 0.0
      return out
    }
    const origin = center ?? Cartesian3.ZERO
    const step = stride ?? 3
    Check.typeOf.number.greaterThanOrEquals("stride", step, 3)
    const currentPos = fromPointsCurrentPos
    currentPos.x = positions[0]! + origin.x
    currentPos.y = positions[1]! + origin.y
    currentPos.z = positions[2]! + origin.z
    const xMin = Cartesian3.clone(currentPos, fromPointsXMin)
    const yMin = Cartesian3.clone(currentPos, fromPointsYMin)
    const zMin = Cartesian3.clone(currentPos, fromPointsZMin)
    const xMax = Cartesian3.clone(currentPos, fromPointsXMax)
    const yMax = Cartesian3.clone(currentPos, fromPointsYMax)
    const zMax = Cartesian3.clone(currentPos, fromPointsZMax)
    const numElements = positions.length
    for (let i = 0; i < numElements; i += step) {
      const x = positions[i]! + origin.x
      const y = positions[i + 1]! + origin.y
      const z = positions[i + 2]! + origin.z
      currentPos.x = x
      currentPos.y = y
      currentPos.z = z
      if (x < xMin.x) {
        Cartesian3.clone(currentPos, xMin)
      }
      if (x > xMax.x) {
        Cartesian3.clone(currentPos, xMax)
      }
      if (y < yMin.y) {
        Cartesian3.clone(currentPos, yMin)
      }
      if (y > yMax.y) {
        Cartesian3.clone(currentPos, yMax)
      }
      if (z < zMin.z) {
        Cartesian3.clone(currentPos, zMin)
      }
      if (z > zMax.z) {
        Cartesian3.clone(currentPos, zMax)
      }
    }
    const xSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(xMax, xMin, fromPointsScratch))
    const ySpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(yMax, yMin, fromPointsScratch))
    const zSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(zMax, zMin, fromPointsScratch))
    let diameter1 = xMin
    let diameter2 = xMax
    let maxSpan = xSpan
    if (ySpan > maxSpan) {
      maxSpan = ySpan
      diameter1 = yMin
      diameter2 = yMax
    }
    if (zSpan > maxSpan) {
      diameter1 = zMin
      diameter2 = zMax
    }
    const ritterCenter = fromPointsRitterCenter
    ritterCenter.x = (diameter1.x + diameter2.x) * 0.5
    ritterCenter.y = (diameter1.y + diameter2.y) * 0.5
    ritterCenter.z = (diameter1.z + diameter2.z) * 0.5
    let radiusSquared = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch),
    )
    let ritterRadius = Math.sqrt(radiusSquared)
    const minBoxPt = fromPointsMinBoxPt
    minBoxPt.x = xMin.x
    minBoxPt.y = yMin.y
    minBoxPt.z = zMin.z
    const maxBoxPt = fromPointsMaxBoxPt
    maxBoxPt.x = xMax.x
    maxBoxPt.y = yMax.y
    maxBoxPt.z = zMax.z
    const naiveCenter = Cartesian3.midpoint(minBoxPt, maxBoxPt, fromPointsNaiveCenterScratch)
    let naiveRadius = 0
    for (let i = 0; i < numElements; i += step) {
      currentPos.x = positions[i]! + origin.x
      currentPos.y = positions[i + 1]! + origin.y
      currentPos.z = positions[i + 2]! + origin.z
      const r = Cartesian3.magnitude(
        Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch),
      )
      if (r > naiveRadius) {
        naiveRadius = r
      }
      const oldCenterToPointSquared = Cartesian3.magnitudeSquared(
        Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch),
      )
      if (oldCenterToPointSquared > radiusSquared) {
        const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared)
        ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5
        radiusSquared = ritterRadius * ritterRadius
        const oldToNew = oldCenterToPoint - ritterRadius
        ritterCenter.x =
          (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint
        ritterCenter.y =
          (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint
        ritterCenter.z =
          (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint
      }
    }
    if (ritterRadius < naiveRadius) {
      Cartesian3.clone(ritterCenter, out.center)
      out.radius = ritterRadius
    } else {
      Cartesian3.clone(naiveCenter, out.center)
      out.radius = naiveRadius
    }
    return out
  }

  /**
   * 由高低位交错顶点构造。
   *
   * @param positionsHigh 高位
   * @param positionsLow 低位
   * @param result 可选结果
   */
  static fromEncodedCartesianVertices(
    positionsHigh?: number[],
    positionsLow?: number[],
    result?: BoundingSphere,
  ): BoundingSphere {
    const out = defined(result) ? result : new BoundingSphere()
    if (
      !defined(positionsHigh) ||
      !defined(positionsLow) ||
      positionsHigh.length !== positionsLow.length ||
      positionsHigh.length === 0
    ) {
      out.center = Cartesian3.clone(Cartesian3.ZERO, out.center)
      out.radius = 0.0
      return out
    }
    const currentPos = fromPointsCurrentPos
    currentPos.x = positionsHigh[0]! + positionsLow[0]!
    currentPos.y = positionsHigh[1]! + positionsLow[1]!
    currentPos.z = positionsHigh[2]! + positionsLow[2]!
    const xMin = Cartesian3.clone(currentPos, fromPointsXMin)
    const yMin = Cartesian3.clone(currentPos, fromPointsYMin)
    const zMin = Cartesian3.clone(currentPos, fromPointsZMin)
    const xMax = Cartesian3.clone(currentPos, fromPointsXMax)
    const yMax = Cartesian3.clone(currentPos, fromPointsYMax)
    const zMax = Cartesian3.clone(currentPos, fromPointsZMax)
    const numElements = positionsHigh.length
    for (let i = 0; i < numElements; i += 3) {
      const x = positionsHigh[i]! + positionsLow[i]!
      const y = positionsHigh[i + 1]! + positionsLow[i + 1]!
      const z = positionsHigh[i + 2]! + positionsLow[i + 2]!
      currentPos.x = x
      currentPos.y = y
      currentPos.z = z
      if (x < xMin.x) {
        Cartesian3.clone(currentPos, xMin)
      }
      if (x > xMax.x) {
        Cartesian3.clone(currentPos, xMax)
      }
      if (y < yMin.y) {
        Cartesian3.clone(currentPos, yMin)
      }
      if (y > yMax.y) {
        Cartesian3.clone(currentPos, yMax)
      }
      if (z < zMin.z) {
        Cartesian3.clone(currentPos, zMin)
      }
      if (z > zMax.z) {
        Cartesian3.clone(currentPos, zMax)
      }
    }
    const xSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(xMax, xMin, fromPointsScratch))
    const ySpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(yMax, yMin, fromPointsScratch))
    const zSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(zMax, zMin, fromPointsScratch))
    let diameter1 = xMin
    let diameter2 = xMax
    let maxSpan = xSpan
    if (ySpan > maxSpan) {
      maxSpan = ySpan
      diameter1 = yMin
      diameter2 = yMax
    }
    if (zSpan > maxSpan) {
      diameter1 = zMin
      diameter2 = zMax
    }
    const ritterCenter = fromPointsRitterCenter
    ritterCenter.x = (diameter1.x + diameter2.x) * 0.5
    ritterCenter.y = (diameter1.y + diameter2.y) * 0.5
    ritterCenter.z = (diameter1.z + diameter2.z) * 0.5
    let radiusSquared = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch),
    )
    let ritterRadius = Math.sqrt(radiusSquared)
    const minBoxPt = fromPointsMinBoxPt
    minBoxPt.x = xMin.x
    minBoxPt.y = yMin.y
    minBoxPt.z = zMin.z
    const maxBoxPt = fromPointsMaxBoxPt
    maxBoxPt.x = xMax.x
    maxBoxPt.y = yMax.y
    maxBoxPt.z = zMax.z
    const naiveCenter = Cartesian3.midpoint(minBoxPt, maxBoxPt, fromPointsNaiveCenterScratch)
    let naiveRadius = 0
    for (let i = 0; i < numElements; i += 3) {
      currentPos.x = positionsHigh[i]! + positionsLow[i]!
      currentPos.y = positionsHigh[i + 1]! + positionsLow[i + 1]!
      currentPos.z = positionsHigh[i + 2]! + positionsLow[i + 2]!
      const r = Cartesian3.magnitude(
        Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch),
      )
      if (r > naiveRadius) {
        naiveRadius = r
      }
      const oldCenterToPointSquared = Cartesian3.magnitudeSquared(
        Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch),
      )
      if (oldCenterToPointSquared > radiusSquared) {
        const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared)
        ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5
        radiusSquared = ritterRadius * ritterRadius
        const oldToNew = oldCenterToPoint - ritterRadius
        ritterCenter.x =
          (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint
        ritterCenter.y =
          (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint
        ritterCenter.z =
          (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint
      }
    }
    if (ritterRadius < naiveRadius) {
      Cartesian3.clone(ritterCenter, out.center)
      out.radius = ritterRadius
    } else {
      Cartesian3.clone(naiveCenter, out.center)
      out.radius = naiveRadius
    }
    return out
  }

  /**
   * 由 AABB 对角点构造。
   *
   * @param corner 一角
   * @param oppositeCorner 对角
   * @param result 可选结果
   */
  static fromCornerPoints(
    corner: Cartesian3,
    oppositeCorner: Cartesian3,
    result?: BoundingSphere,
  ): BoundingSphere {
    Check.typeOf.object("corner", corner)
    Check.typeOf.object("oppositeCorner", oppositeCorner)
    const out = defined(result) ? result : new BoundingSphere()
    const center = Cartesian3.midpoint(corner, oppositeCorner, out.center)
    out.radius = Cartesian3.distance(center, oppositeCorner)
    return out
  }

  /**
   * 包住椭球（原点为心）。
   *
   * @param ellipsoid 椭球
   * @param result 可选结果
   */
  static fromEllipsoid(ellipsoid: Ellipsoid, result?: BoundingSphere): BoundingSphere {
    Check.typeOf.object("ellipsoid", ellipsoid)
    const out = defined(result) ? result : new BoundingSphere()
    Cartesian3.clone(Cartesian3.ZERO, out.center)
    out.radius = ellipsoid.maximumRadius
    return out
  }

  /**
   * 多个包围球的紧包围球。
   *
   * @param boundingSpheres 球列
   * @param result 可选结果
   */
  static fromBoundingSpheres(
    boundingSpheres?: BoundingSphere[],
    result?: BoundingSphere,
  ): BoundingSphere {
    const out = defined(result) ? result : new BoundingSphere()
    if (!defined(boundingSpheres) || boundingSpheres.length === 0) {
      out.center = Cartesian3.clone(Cartesian3.ZERO, out.center)
      out.radius = 0.0
      return out
    }
    const length = boundingSpheres.length
    if (length === 1) {
      return BoundingSphere.clone(boundingSpheres[0], out)!
    }
    if (length === 2) {
      return BoundingSphere.union(boundingSpheres[0]!, boundingSpheres[1]!, out)
    }
    const positions: Cartesian3[] = []
    for (let i = 0; i < length; i++) {
      positions.push(boundingSpheres[i]!.center)
    }
    BoundingSphere.fromPoints(positions, out)
    const center = out.center
    let radius = out.radius
    for (let i = 0; i < length; i++) {
      const tmp = boundingSpheres[i]!
      radius = Math.max(radius, Cartesian3.distance(center, tmp.center) + tmp.radius)
    }
    out.radius = radius
    return out
  }

  /**
   * 由 OBB 构造。
   *
   * @param orientedBoundingBox OBB
   * @param result 可选结果
   */
  static fromOrientedBoundingBox(
    orientedBoundingBox: OrientedBoundingBoxLike,
    result?: BoundingSphere,
  ): BoundingSphere {
    Check.defined("orientedBoundingBox", orientedBoundingBox)
    const out = defined(result) ? result : new BoundingSphere()
    const halfAxes = orientedBoundingBox.halfAxes
    const u = Matrix3.getColumn(halfAxes, 0, fromOrientedBoundingBoxScratchU)
    const v = Matrix3.getColumn(halfAxes, 1, fromOrientedBoundingBoxScratchV)
    const w = Matrix3.getColumn(halfAxes, 2, fromOrientedBoundingBoxScratchW)
    Cartesian3.add(u, v, u)
    Cartesian3.add(u, w, u)
    out.center = Cartesian3.clone(orientedBoundingBox.center, out.center)
    out.radius = Cartesian3.magnitude(u)
    return out
  }

  /**
   * 由仿射变换的平移与尺度构造。
   *
   * @param transformation 变换
   * @param result 可选结果
   */
  static fromTransformation(transformation: Matrix4, result?: BoundingSphere): BoundingSphere {
    Check.typeOf.object("transformation", transformation)
    const out = defined(result) ? result : new BoundingSphere()
    const center = Matrix4.getTranslation(transformation, scratchFromTransformationCenter)
    const scale = Matrix4.getScale(transformation, scratchFromTransformationScale)
    out.center = Cartesian3.clone(center, out.center)
    out.radius = 0.5 * Cartesian3.magnitude(scale)
    return out
  }

  /**
   * 复制；源未定义时返回 undefined。
   *
   * @param sphere 源
   * @param result 可选结果
   */
  static clone(sphere?: BoundingSphere, result?: BoundingSphere): BoundingSphere | undefined {
    if (!defined(sphere)) {
      return undefined
    }
    if (!defined(result)) {
      return new BoundingSphere(sphere.center, sphere.radius)
    }
    result.center = Cartesian3.clone(sphere.center, result.center)
    result.radius = sphere.radius
    return result
  }

  /** pack 元素个数 */
  static packedLength = 4

  /**
   * 打包。
   *
   * @param value 实例
   * @param array 目标
   * @param startingIndex 起始下标
   */
  static pack(value: BoundingSphere, array: number[], startingIndex?: number): number[] {
    Check.typeOf.object("value", value)
    Check.defined("array", array)
    let i = startingIndex ?? 0
    const center = value.center
    array[i++] = center.x
    array[i++] = center.y
    array[i++] = center.z
    array[i] = value.radius
    return array
  }

  /**
   * 解包。
   *
   * @param array 源
   * @param startingIndex 起始下标
   * @param result 可选结果
   */
  static unpack(array: number[], startingIndex?: number, result?: BoundingSphere): BoundingSphere {
    Check.defined("array", array)
    let i = startingIndex ?? 0
    const out = defined(result) ? result : new BoundingSphere()
    const center = out.center
    center.x = array[i++]!
    center.y = array[i++]!
    center.z = array[i++]!
    out.radius = array[i]!
    return out
  }

  /**
   * 两球之并。
   *
   * @param left 左
   * @param right 右
   * @param result 可选结果
   */
  static union(
    left: BoundingSphere,
    right: BoundingSphere,
    result?: BoundingSphere,
  ): BoundingSphere {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    const out = defined(result) ? result : new BoundingSphere()
    const leftCenter = left.center
    const leftRadius = left.radius
    const rightCenter = right.center
    const rightRadius = right.radius
    const toRightCenter = Cartesian3.subtract(rightCenter, leftCenter, unionScratch)
    const centerSeparation = Cartesian3.magnitude(toRightCenter)
    if (leftRadius >= centerSeparation + rightRadius) {
      left.clone(out)
      return out
    }
    if (rightRadius >= centerSeparation + leftRadius) {
      right.clone(out)
      return out
    }
    const halfDistanceBetweenTangentPoints = (leftRadius + centerSeparation + rightRadius) * 0.5
    const center = Cartesian3.multiplyByScalar(
      toRightCenter,
      (-leftRadius + halfDistanceBetweenTangentPoints) / centerSeparation,
      unionScratchCenter,
    )
    Cartesian3.add(center, leftCenter, center)
    Cartesian3.clone(center, out.center)
    out.radius = halfDistanceBetweenTangentPoints
    return out
  }

  /**
   * 扩大球体以包含点。
   *
   * @param sphere 球
   * @param point 点
   * @param result 可选结果
   */
  static expand(
    sphere: BoundingSphere,
    point: Cartesian3,
    result?: BoundingSphere,
  ): BoundingSphere {
    Check.typeOf.object("sphere", sphere)
    Check.typeOf.object("point", point)
    const out = BoundingSphere.clone(sphere, result)!
    const radius = Cartesian3.magnitude(Cartesian3.subtract(point, out.center, expandScratch))
    if (radius > out.radius) {
      out.radius = radius
    }
    return out
  }

  /**
   * 球相对平面的内外侧。
   *
   * @param sphere 球
   * @param plane 平面
   */
  static intersectPlane(sphere: BoundingSphere, plane: Plane): IntersectValue {
    Check.typeOf.object("sphere", sphere)
    Check.typeOf.object("plane", plane)
    const distanceToPlane = Cartesian3.dot(plane.normal, sphere.center) + plane.distance
    if (distanceToPlane < -sphere.radius) {
      return Intersect.OUTSIDE
    }
    if (distanceToPlane < sphere.radius) {
      return Intersect.INTERSECTING
    }
    return Intersect.INSIDE
  }

  /**
   * 仿射变换（半径乘最大尺度）。
   *
   * @param sphere 球
   * @param transform 变换
   * @param result 可选结果
   */
  static transform(
    sphere: BoundingSphere,
    transform: Matrix4,
    result?: BoundingSphere,
  ): BoundingSphere {
    Check.typeOf.object("sphere", sphere)
    Check.typeOf.object("transform", transform)
    const out = defined(result) ? result : new BoundingSphere()
    out.center = Matrix4.multiplyByPoint(transform, sphere.center, out.center)
    out.radius = Matrix4.getMaximumScale(transform) * sphere.radius
    return out
  }

  /**
   * 到点的估计距离平方（内部为 0）。
   *
   * @param sphere 球
   * @param cartesian 点
   */
  static distanceSquaredTo(sphere: BoundingSphere, cartesian: Cartesian3): number {
    Check.typeOf.object("sphere", sphere)
    Check.typeOf.object("cartesian", cartesian)
    const diff = Cartesian3.subtract(sphere.center, cartesian, distanceSquaredToScratch)
    const distance = Cartesian3.magnitude(diff) - sphere.radius
    if (distance <= 0.0) {
      return 0.0
    }
    return distance * distance
  }

  /**
   * 无尺度仿射变换。
   *
   * @param sphere 球
   * @param transform 变换
   * @param result 可选结果
   */
  static transformWithoutScale(
    sphere: BoundingSphere,
    transform: Matrix4,
    result?: BoundingSphere,
  ): BoundingSphere {
    Check.typeOf.object("sphere", sphere)
    Check.typeOf.object("transform", transform)
    const out = defined(result) ? result : new BoundingSphere()
    out.center = Matrix4.multiplyByPoint(transform, sphere.center, out.center)
    out.radius = sphere.radius
    return out
  }

  /**
   * 沿方向的最近 / 最远平面距离。
   *
   * @param sphere 球
   * @param position 参考点
   * @param direction 方向
   * @param result 可选区间
   */
  static computePlaneDistances(
    sphere: BoundingSphere,
    position: Cartesian3,
    direction: Cartesian3,
    result?: Interval,
  ): Interval {
    Check.typeOf.object("sphere", sphere)
    Check.typeOf.object("position", position)
    Check.typeOf.object("direction", direction)
    const out = defined(result) ? result : new Interval()
    const toCenter = Cartesian3.subtract(sphere.center, position, scratchCartesian3)
    const mag = Cartesian3.dot(direction, toCenter)
    out.start = mag - sphere.radius
    out.stop = mag + sphere.radius
    return out
  }

  /**
   * 3D 球投影到 2D。
   *
   * @param sphere 球
   * @param projection 投影
   * @param result 可选结果
   */
  static projectTo2D(
    sphere: BoundingSphere,
    projection?: BoundingSphereMapProjection,
    result?: BoundingSphere,
  ): BoundingSphere {
    Check.typeOf.object("sphere", sphere)
    syncDefaultEllipsoid(projectTo2DProjection)
    const proj = projection ?? projectTo2DProjection
    const ellipsoid = proj.ellipsoid
    let center = sphere.center
    const radius = sphere.radius
    let normal: Cartesian3
    if (Cartesian3.equals(center, Cartesian3.ZERO)) {
      normal = Cartesian3.clone(Cartesian3.UNIT_X, projectTo2DNormalScratch)
    } else {
      normal =
        ellipsoid.geodeticSurfaceNormal(center, projectTo2DNormalScratch) ??
        Cartesian3.clone(Cartesian3.UNIT_X, projectTo2DNormalScratch)
    }
    const east = Cartesian3.cross(Cartesian3.UNIT_Z, normal, projectTo2DEastScratch)
    Cartesian3.normalize(east, east)
    const north = Cartesian3.cross(normal, east, projectTo2DNorthScratch)
    Cartesian3.normalize(north, north)
    Cartesian3.multiplyByScalar(normal, radius, normal)
    Cartesian3.multiplyByScalar(north, radius, north)
    Cartesian3.multiplyByScalar(east, radius, east)
    const south = Cartesian3.negate(north, projectTo2DSouthScratch)
    const west = Cartesian3.negate(east, projectTo2DWestScratch)
    const positions = projectTo2DPositionsScratch
    let corner = positions[0]!
    Cartesian3.add(normal, north, corner)
    Cartesian3.add(corner, east, corner)
    corner = positions[1]!
    Cartesian3.add(normal, north, corner)
    Cartesian3.add(corner, west, corner)
    corner = positions[2]!
    Cartesian3.add(normal, south, corner)
    Cartesian3.add(corner, west, corner)
    corner = positions[3]!
    Cartesian3.add(normal, south, corner)
    Cartesian3.add(corner, east, corner)
    Cartesian3.negate(normal, normal)
    corner = positions[4]!
    Cartesian3.add(normal, north, corner)
    Cartesian3.add(corner, east, corner)
    corner = positions[5]!
    Cartesian3.add(normal, north, corner)
    Cartesian3.add(corner, west, corner)
    corner = positions[6]!
    Cartesian3.add(normal, south, corner)
    Cartesian3.add(corner, west, corner)
    corner = positions[7]!
    Cartesian3.add(normal, south, corner)
    Cartesian3.add(corner, east, corner)
    for (let i = 0; i < positions.length; ++i) {
      const position = positions[i]!
      Cartesian3.add(center, position, position)
      const cartographic = ellipsoid.cartesianToCartographic(
        position,
        projectTo2DCartographicScratch,
      )
      if (defined(cartographic)) {
        proj.project(cartographic, position)
      }
    }
    const out = BoundingSphere.fromPoints(positions, result)
    center = out.center
    const x = center.x
    const y = center.y
    const z = center.z
    center.x = z
    center.y = x
    center.z = y
    return out
  }

  /**
   * 是否被遮挡。
   *
   * @param sphere 球
   * @param occluder 遮挡器
   */
  static isOccluded(sphere: BoundingSphere, occluder: BoundingSphereOccluder): boolean {
    Check.typeOf.object("sphere", sphere)
    Check.typeOf.object("occluder", occluder)
    return !occluder.isBoundingSphereVisible(sphere)
  }

  /**
   * 分量比较。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left?: BoundingSphere, right?: BoundingSphere): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Cartesian3.equals(left.center, right.center) &&
        left.radius === right.radius)
    )
  }

  /**
   * 相对平面的内外侧。
   *
   * @param plane 平面
   */
  intersectPlane(plane: Plane): IntersectValue {
    return BoundingSphere.intersectPlane(this, plane)
  }

  /**
   * 到点的距离平方。
   *
   * @param cartesian 点
   */
  distanceSquaredTo(cartesian: Cartesian3): number {
    return BoundingSphere.distanceSquaredTo(this, cartesian)
  }

  /**
   * 沿方向的平面距离。
   *
   * @param position 参考点
   * @param direction 方向
   * @param result 可选区间
   */
  computePlaneDistances(position: Cartesian3, direction: Cartesian3, result?: Interval): Interval {
    return BoundingSphere.computePlaneDistances(this, position, direction, result)
  }

  /**
   * 是否被遮挡。
   *
   * @param occluder 遮挡器
   */
  isOccluded(occluder: BoundingSphereOccluder): boolean {
    return BoundingSphere.isOccluded(this, occluder)
  }

  /**
   * 与另一球比较。
   *
   * @param right 右侧
   */
  equals(right?: BoundingSphere): boolean {
    return BoundingSphere.equals(this, right)
  }

  /**
   * 复制自身。
   *
   * @param result 可选结果
   */
  clone(result?: BoundingSphere): BoundingSphere {
    return BoundingSphere.clone(this, result)!
  }

  /**
   * 球体体积。
   */
  volume(): number {
    const radius = this.radius
    return volumeConstant * radius * radius * radius
  }
}
