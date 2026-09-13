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
import { Cartesian2 } from "./Cartesian2"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { Check } from "./Check"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { Ellipsoid } from "./Ellipsoid"
import { EllipsoidTangentPlane } from "./EllipsoidTangentPlane"
import { Intersect, type IntersectValue } from "./Intersect"
import { Interval } from "./Interval"
import { CesiumMath } from "./CesiumMath"
import { Matrix3 } from "./Matrix3"
import { Matrix4 } from "./Matrix4"
import { Plane } from "./Plane"
import { Rectangle } from "./Rectangle"
import type { BoundingSphereOccluder } from "./BoundingSphere"

const scratchCartesian1 = new Cartesian3()
const scratchCartesian2 = new Cartesian3()
const scratchCartesian3 = new Cartesian3()
const scratchCartesian4 = new Cartesian3()
const scratchCartesian5 = new Cartesian3()
const scratchCartesian6 = new Cartesian3()
const scratchCovarianceResult = new Matrix3()
const scratchEigenResult = {
  unitary: new Matrix3(),
  diagonal: new Matrix3(),
}
const scratchOffset = new Cartesian3()
const scratchScale = new Cartesian3()
const scratchRectangleCenterCartographic = new Cartographic()
const scratchRectangleCenter = new Cartesian3()
const scratchPerimeterCartographicNC = new Cartographic()
const scratchPerimeterCartographicNW = new Cartographic()
const scratchPerimeterCartographicCW = new Cartographic()
const scratchPerimeterCartographicSW = new Cartographic()
const scratchPerimeterCartographicSC = new Cartographic()
const scratchPerimeterCartesianNC = new Cartesian3()
const scratchPerimeterCartesianNW = new Cartesian3()
const scratchPerimeterCartesianCW = new Cartesian3()
const scratchPerimeterCartesianSW = new Cartesian3()
const scratchPerimeterCartesianSC = new Cartesian3()
const scratchPerimeterProjectedNC = new Cartesian2()
const scratchPerimeterProjectedNW = new Cartesian2()
const scratchPerimeterProjectedCW = new Cartesian2()
const scratchPerimeterProjectedSW = new Cartesian2()
const scratchPerimeterProjectedSC = new Cartesian2()
const scratchPlaneOrigin = new Cartesian3()
const scratchPlaneNormal = new Cartesian3()
const scratchPlaneXAxis = new Cartesian3()
const scratchHorizonCartesian = new Cartesian3()
const scratchHorizonProjected = new Cartesian3()
const scratchMaxY = new Cartesian3()
const scratchMinY = new Cartesian3()
const scratchZ = new Cartesian3()
const scratchPlane = new Plane(Cartesian3.UNIT_X, 0.0)
const scratchCartesianU = new Cartesian3()
const scratchCartesianV = new Cartesian3()
const scratchCartesianW = new Cartesian3()
const scratchValidAxis2 = new Cartesian3()
const scratchValidAxis3 = new Cartesian3()
const scratchPPrime = new Cartesian3()
const scratchCorner = new Cartesian3()
const scratchToCenter = new Cartesian3()
const scratchXAxis = new Cartesian3()
const scratchYAxis = new Cartesian3()
const scratchZAxis = new Cartesian3()
const scratchRotationScale = new Matrix3()
const scratchBoundingSphere = new BoundingSphere()

/**
 * 由切平面局部范围构造 OBB。
 *
 * @param planeOrigin 原点
 * @param planeXAxis X 轴
 * @param planeYAxis Y 轴
 * @param planeZAxis Z 轴
 * @param minimumX 最小 X
 * @param maximumX 最大 X
 * @param minimumY 最小 Y
 * @param maximumY 最大 Y
 * @param minimumZ 最小 Z
 * @param maximumZ 最大 Z
 * @param result 结果
 */
function fromPlaneExtents(
  planeOrigin: Cartesian3,
  planeXAxis: Cartesian3,
  planeYAxis: Cartesian3,
  planeZAxis: Cartesian3,
  minimumX: number,
  maximumX: number,
  minimumY: number,
  maximumY: number,
  minimumZ: number,
  maximumZ: number,
  result?: OrientedBoundingBox,
): OrientedBoundingBox {
  const out = defined(result) ? result : new OrientedBoundingBox()
  const halfAxes = out.halfAxes
  Matrix3.setColumn(halfAxes, 0, planeXAxis, halfAxes)
  Matrix3.setColumn(halfAxes, 1, planeYAxis, halfAxes)
  Matrix3.setColumn(halfAxes, 2, planeZAxis, halfAxes)
  let centerOffset = scratchOffset
  centerOffset.x = (minimumX + maximumX) / 2.0
  centerOffset.y = (minimumY + maximumY) / 2.0
  centerOffset.z = (minimumZ + maximumZ) / 2.0
  const scale = scratchScale
  scale.x = (maximumX - minimumX) / 2.0
  scale.y = (maximumY - minimumY) / 2.0
  scale.z = (maximumZ - minimumZ) / 2.0
  const center = out.center
  centerOffset = Matrix3.multiplyByVector(halfAxes, centerOffset, centerOffset)
  Cartesian3.add(planeOrigin, centerOffset, center)
  Matrix3.multiplyByScale(halfAxes, scale, halfAxes)
  return out
}

/**
 * 有向包围盒。
 * 对标 Cesium `Core/OrientedBoundingBox.js`。
 */
export class OrientedBoundingBox {
  center: Cartesian3
  halfAxes: Matrix3

  /**
   * @param center 中心
   * @param halfAxes 半轴矩阵
   */
  constructor(center?: Cartesian3, halfAxes?: Matrix3) {
    this.center = Cartesian3.clone(center ?? Cartesian3.ZERO)
    this.halfAxes = Matrix3.clone(halfAxes ?? Matrix3.ZERO)
  }

  /** pack 元素个数 */
  static packedLength = Cartesian3.packedLength + Matrix3.packedLength

  /**
   * 打包。
   *
   * @param value 实例
   * @param array 目标
   * @param startingIndex 起始下标
   */
  static pack(value: OrientedBoundingBox, array: number[], startingIndex?: number): number[] {
    Check.typeOf.object("value", value)
    Check.defined("array", array)
    const i = startingIndex ?? 0
    Cartesian3.pack(value.center, array, i)
    Matrix3.pack(value.halfAxes, array, i + Cartesian3.packedLength)
    return array
  }

  /**
   * 解包。
   *
   * @param array 源
   * @param startingIndex 起始下标
   * @param result 可选结果
   */
  static unpack(
    array: number[],
    startingIndex?: number,
    result?: OrientedBoundingBox,
  ): OrientedBoundingBox {
    Check.defined("array", array)
    const i = startingIndex ?? 0
    const out = defined(result) ? result : new OrientedBoundingBox()
    Cartesian3.unpack(array, i, out.center)
    Matrix3.unpack(array, i + Cartesian3.packedLength, out.halfAxes)
    return out
  }

  /**
   * 由点集（协方差特征分解）构造。
   *
   * @param positions 点列
   * @param result 可选结果
   */
  static fromPoints(positions?: Cartesian3[], result?: OrientedBoundingBox): OrientedBoundingBox {
    const out = defined(result) ? result : new OrientedBoundingBox()
    if (!defined(positions) || positions.length === 0) {
      out.halfAxes = Matrix3.clone(Matrix3.ZERO, out.halfAxes)
      out.center = Cartesian3.clone(Cartesian3.ZERO, out.center)
      return out
    }
    const length = positions.length
    const meanPoint = Cartesian3.clone(positions[0]!, scratchCartesian1)
    for (let i = 1; i < length; i++) {
      Cartesian3.add(meanPoint, positions[i]!, meanPoint)
    }
    const invLength = 1.0 / length
    Cartesian3.multiplyByScalar(meanPoint, invLength, meanPoint)
    let exx = 0.0
    let exy = 0.0
    let exz = 0.0
    let eyy = 0.0
    let eyz = 0.0
    let ezz = 0.0
    for (let i = 0; i < length; i++) {
      const p = Cartesian3.subtract(positions[i]!, meanPoint, scratchCartesian2)
      exx += p.x * p.x
      exy += p.x * p.y
      exz += p.x * p.z
      eyy += p.y * p.y
      eyz += p.y * p.z
      ezz += p.z * p.z
    }
    exx *= invLength
    exy *= invLength
    exz *= invLength
    eyy *= invLength
    eyz *= invLength
    ezz *= invLength
    const covarianceMatrix = scratchCovarianceResult
    covarianceMatrix[0] = exx
    covarianceMatrix[1] = exy
    covarianceMatrix[2] = exz
    covarianceMatrix[3] = exy
    covarianceMatrix[4] = eyy
    covarianceMatrix[5] = eyz
    covarianceMatrix[6] = exz
    covarianceMatrix[7] = eyz
    covarianceMatrix[8] = ezz
    const eigenDecomposition = Matrix3.computeEigenDecomposition(
      covarianceMatrix,
      scratchEigenResult,
    )
    const rotation = Matrix3.clone(eigenDecomposition.unitary, out.halfAxes)!
    let v1 = Matrix3.getColumn(rotation, 0, scratchCartesian4)
    let v2 = Matrix3.getColumn(rotation, 1, scratchCartesian5)
    let v3 = Matrix3.getColumn(rotation, 2, scratchCartesian6)
    let u1 = -Number.MAX_VALUE
    let u2 = -Number.MAX_VALUE
    let u3 = -Number.MAX_VALUE
    let l1 = Number.MAX_VALUE
    let l2 = Number.MAX_VALUE
    let l3 = Number.MAX_VALUE
    for (let i = 0; i < length; i++) {
      const p = positions[i]!
      u1 = Math.max(Cartesian3.dot(v1, p), u1)
      u2 = Math.max(Cartesian3.dot(v2, p), u2)
      u3 = Math.max(Cartesian3.dot(v3, p), u3)
      l1 = Math.min(Cartesian3.dot(v1, p), l1)
      l2 = Math.min(Cartesian3.dot(v2, p), l2)
      l3 = Math.min(Cartesian3.dot(v3, p), l3)
    }
    v1 = Cartesian3.multiplyByScalar(v1, 0.5 * (l1 + u1), v1)
    v2 = Cartesian3.multiplyByScalar(v2, 0.5 * (l2 + u2), v2)
    v3 = Cartesian3.multiplyByScalar(v3, 0.5 * (l3 + u3), v3)
    const center = Cartesian3.add(v1, v2, out.center)
    Cartesian3.add(center, v3, center)
    const scale = scratchCartesian3
    scale.x = u1 - l1
    scale.y = u2 - l2
    scale.z = u3 - l3
    Cartesian3.multiplyByScalar(scale, 0.5, scale)
    Matrix3.multiplyByScale(out.halfAxes, scale, out.halfAxes)
    return out
  }

  /**
   * 由椭球表面矩形构造（算法与 Cesium 一致）。
   *
   * @param rectangle 矩形
   * @param minimumHeight 最小高
   * @param maximumHeight 最大高
   * @param ellipsoid 椭球
   * @param result 可选结果
   */
  static fromRectangle(
    rectangle: Rectangle,
    minimumHeight?: number,
    maximumHeight?: number,
    ellipsoid?: Ellipsoid,
    result?: OrientedBoundingBox,
  ): OrientedBoundingBox {
    if (!defined(rectangle)) {
      throw new DeveloperError("rectangle is required")
    }
    if (rectangle.width < 0.0 || rectangle.width > CesiumMath.TWO_PI) {
      throw new DeveloperError("Rectangle width must be between 0 and 2 * pi")
    }
    if (rectangle.height < 0.0 || rectangle.height > CesiumMath.PI) {
      throw new DeveloperError("Rectangle height must be between 0 and pi")
    }
    if (
      defined(ellipsoid) &&
      !CesiumMath.equalsEpsilon(ellipsoid.radii.x, ellipsoid.radii.y, CesiumMath.EPSILON15)
    ) {
      throw new DeveloperError("Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)")
    }
    const minH = minimumHeight ?? 0.0
    const maxH = maximumHeight ?? 0.0
    const ellip = ellipsoid ?? Ellipsoid.default
    if (rectangle.width <= CesiumMath.PI) {
      const tangentPointCartographic = Rectangle.center(
        rectangle,
        scratchRectangleCenterCartographic,
      )
      const tangentPoint = ellip.cartographicToCartesian(
        tangentPointCartographic,
        scratchRectangleCenter,
      )
      const tangentPlane = new EllipsoidTangentPlane(tangentPoint, ellip)
      const plane = tangentPlane.plane
      const lonCenter = tangentPointCartographic.longitude
      const latCenter =
        rectangle.south < 0.0 && rectangle.north > 0.0 ? 0.0 : tangentPointCartographic.latitude
      const perimeterCartographicNC = Cartographic.fromRadians(
        lonCenter,
        rectangle.north,
        maxH,
        scratchPerimeterCartographicNC,
      )
      const perimeterCartographicNW = Cartographic.fromRadians(
        rectangle.west,
        rectangle.north,
        maxH,
        scratchPerimeterCartographicNW,
      )
      const perimeterCartographicCW = Cartographic.fromRadians(
        rectangle.west,
        latCenter,
        maxH,
        scratchPerimeterCartographicCW,
      )
      const perimeterCartographicSW = Cartographic.fromRadians(
        rectangle.west,
        rectangle.south,
        maxH,
        scratchPerimeterCartographicSW,
      )
      const perimeterCartographicSC = Cartographic.fromRadians(
        lonCenter,
        rectangle.south,
        maxH,
        scratchPerimeterCartographicSC,
      )
      const perimeterCartesianNC = ellip.cartographicToCartesian(
        perimeterCartographicNC,
        scratchPerimeterCartesianNC,
      )
      let perimeterCartesianNW = ellip.cartographicToCartesian(
        perimeterCartographicNW,
        scratchPerimeterCartesianNW,
      )
      const perimeterCartesianCW = ellip.cartographicToCartesian(
        perimeterCartographicCW,
        scratchPerimeterCartesianCW,
      )
      let perimeterCartesianSW = ellip.cartographicToCartesian(
        perimeterCartographicSW,
        scratchPerimeterCartesianSW,
      )
      const perimeterCartesianSC = ellip.cartographicToCartesian(
        perimeterCartographicSC,
        scratchPerimeterCartesianSC,
      )
      const perimeterProjectedNC = tangentPlane.projectPointToNearestOnPlane(
        perimeterCartesianNC,
        scratchPerimeterProjectedNC,
      )
      const perimeterProjectedNW = tangentPlane.projectPointToNearestOnPlane(
        perimeterCartesianNW,
        scratchPerimeterProjectedNW,
      )
      const perimeterProjectedCW = tangentPlane.projectPointToNearestOnPlane(
        perimeterCartesianCW,
        scratchPerimeterProjectedCW,
      )
      const perimeterProjectedSW = tangentPlane.projectPointToNearestOnPlane(
        perimeterCartesianSW,
        scratchPerimeterProjectedSW,
      )
      const perimeterProjectedSC = tangentPlane.projectPointToNearestOnPlane(
        perimeterCartesianSC,
        scratchPerimeterProjectedSC,
      )
      const minX = Math.min(perimeterProjectedNW.x, perimeterProjectedCW.x, perimeterProjectedSW.x)
      const maxX = -minX
      const maxY = Math.max(perimeterProjectedNW.y, perimeterProjectedNC.y)
      const minY = Math.min(perimeterProjectedSW.y, perimeterProjectedSC.y)
      perimeterCartographicNW.height = minH
      perimeterCartographicSW.height = minH
      perimeterCartesianNW = ellip.cartographicToCartesian(
        perimeterCartographicNW,
        scratchPerimeterCartesianNW,
      )
      perimeterCartesianSW = ellip.cartographicToCartesian(
        perimeterCartographicSW,
        scratchPerimeterCartesianSW,
      )
      const minZ = Math.min(
        Plane.getPointDistance(plane, perimeterCartesianNW),
        Plane.getPointDistance(plane, perimeterCartesianSW),
      )
      return fromPlaneExtents(
        tangentPlane.origin,
        tangentPlane.xAxis,
        tangentPlane.yAxis,
        tangentPlane.zAxis,
        minX,
        maxX,
        minY,
        maxY,
        minZ,
        maxH,
        result,
      )
    }
    const fullyAboveEquator = rectangle.south > 0.0
    const fullyBelowEquator = rectangle.north < 0.0
    const latitudeNearestToEquator = fullyAboveEquator
      ? rectangle.south
      : fullyBelowEquator
        ? rectangle.north
        : 0.0
    const centerLongitude = Rectangle.center(
      rectangle,
      scratchRectangleCenterCartographic,
    ).longitude
    const planeOrigin = Cartesian3.fromRadians(
      centerLongitude,
      latitudeNearestToEquator,
      maxH,
      ellip,
      scratchPlaneOrigin,
    )
    planeOrigin.z = 0.0
    const isPole =
      Math.abs(planeOrigin.x) < CesiumMath.EPSILON10 &&
      Math.abs(planeOrigin.y) < CesiumMath.EPSILON10
    const planeNormal = !isPole
      ? Cartesian3.normalize(planeOrigin, scratchPlaneNormal)
      : Cartesian3.UNIT_X
    const planeYAxis = Cartesian3.UNIT_Z
    const planeXAxis = Cartesian3.cross(planeNormal, planeYAxis, scratchPlaneXAxis)
    const plane = Plane.fromPointNormal(planeOrigin, planeNormal, scratchPlane)
    const horizonCartesian = Cartesian3.fromRadians(
      centerLongitude + CesiumMath.PI_OVER_TWO,
      latitudeNearestToEquator,
      maxH,
      ellip,
      scratchHorizonCartesian,
    )
    const maxX = Cartesian3.dot(
      Plane.projectPointOntoPlane(plane, horizonCartesian, scratchHorizonProjected),
      planeXAxis,
    )
    const minX = -maxX
    const maxY = Cartesian3.fromRadians(
      0.0,
      rectangle.north,
      fullyBelowEquator ? minH : maxH,
      ellip,
      scratchMaxY,
    ).z
    const minY = Cartesian3.fromRadians(
      0.0,
      rectangle.south,
      fullyAboveEquator ? minH : maxH,
      ellip,
      scratchMinY,
    ).z
    const farZ = Cartesian3.fromRadians(
      rectangle.east,
      latitudeNearestToEquator,
      maxH,
      ellip,
      scratchZ,
    )
    const minZ = Plane.getPointDistance(plane, farZ)
    return fromPlaneExtents(
      planeOrigin,
      planeXAxis,
      planeYAxis,
      planeNormal,
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      0.0,
      result,
    )
  }

  /**
   * 由仿射变换构造。
   *
   * @param transformation 变换
   * @param result 可选结果
   */
  static fromTransformation(
    transformation: Matrix4,
    result?: OrientedBoundingBox,
  ): OrientedBoundingBox {
    Check.typeOf.object("transformation", transformation)
    const out = defined(result) ? result : new OrientedBoundingBox()
    out.center = Matrix4.getTranslation(transformation, out.center)
    out.halfAxes = Matrix4.getMatrix3(transformation, out.halfAxes)
    out.halfAxes = Matrix3.multiplyByScalar(out.halfAxes, 0.5, out.halfAxes)
    return out
  }

  /**
   * 复制；源未定义时返回 undefined。
   *
   * @param box 源
   * @param result 可选结果
   */
  static clone(
    box?: OrientedBoundingBox,
    result?: OrientedBoundingBox,
  ): OrientedBoundingBox | undefined {
    if (!defined(box)) {
      return undefined
    }
    if (!defined(result)) {
      return new OrientedBoundingBox(box.center, box.halfAxes)
    }
    Cartesian3.clone(box.center, result.center)
    Matrix3.clone(box.halfAxes, result.halfAxes)
    return result
  }

  /**
   * 相对平面的内外侧。
   *
   * @param box 盒子
   * @param plane 平面
   */
  static intersectPlane(box: OrientedBoundingBox, plane: Plane): IntersectValue {
    if (!defined(box)) {
      throw new DeveloperError("box is required.")
    }
    if (!defined(plane)) {
      throw new DeveloperError("plane is required.")
    }
    const center = box.center
    const normal = plane.normal
    const halfAxes = box.halfAxes
    const normalX = normal.x
    const normalY = normal.y
    const normalZ = normal.z
    const radEffective =
      Math.abs(
        normalX * halfAxes[Matrix3.COLUMN0ROW0]! +
          normalY * halfAxes[Matrix3.COLUMN0ROW1]! +
          normalZ * halfAxes[Matrix3.COLUMN0ROW2]!,
      ) +
      Math.abs(
        normalX * halfAxes[Matrix3.COLUMN1ROW0]! +
          normalY * halfAxes[Matrix3.COLUMN1ROW1]! +
          normalZ * halfAxes[Matrix3.COLUMN1ROW2]!,
      ) +
      Math.abs(
        normalX * halfAxes[Matrix3.COLUMN2ROW0]! +
          normalY * halfAxes[Matrix3.COLUMN2ROW1]! +
          normalZ * halfAxes[Matrix3.COLUMN2ROW2]!,
      )
    const distanceToPlane = Cartesian3.dot(normal, center) + plane.distance
    if (distanceToPlane <= -radEffective) {
      return Intersect.OUTSIDE
    }
    if (distanceToPlane >= radEffective) {
      return Intersect.INSIDE
    }
    return Intersect.INTERSECTING
  }

  /**
   * 到点的估计距离平方。
   *
   * @param box 盒子
   * @param cartesian 点
   */
  static distanceSquaredTo(box: OrientedBoundingBox, cartesian: Cartesian3): number {
    if (!defined(box)) {
      throw new DeveloperError("box is required.")
    }
    if (!defined(cartesian)) {
      throw new DeveloperError("cartesian is required.")
    }
    const offset = Cartesian3.subtract(cartesian, box.center, scratchOffset)
    const halfAxes = box.halfAxes
    let u = Matrix3.getColumn(halfAxes, 0, scratchCartesianU)
    let v = Matrix3.getColumn(halfAxes, 1, scratchCartesianV)
    let w = Matrix3.getColumn(halfAxes, 2, scratchCartesianW)
    const uHalf = Cartesian3.magnitude(u)
    const vHalf = Cartesian3.magnitude(v)
    const wHalf = Cartesian3.magnitude(w)
    let uValid = true
    let vValid = true
    let wValid = true
    if (uHalf > 0) {
      Cartesian3.divideByScalar(u, uHalf, u)
    } else {
      uValid = false
    }
    if (vHalf > 0) {
      Cartesian3.divideByScalar(v, vHalf, v)
    } else {
      vValid = false
    }
    if (wHalf > 0) {
      Cartesian3.divideByScalar(w, wHalf, w)
    } else {
      wValid = false
    }
    const numberOfDegenerateAxes = Number(!uValid) + Number(!vValid) + Number(!wValid)
    if (numberOfDegenerateAxes === 1) {
      let degenerateAxis = u
      let validAxis1 = v
      let validAxis2 = w
      if (!vValid) {
        degenerateAxis = v
        validAxis1 = u
      } else if (!wValid) {
        degenerateAxis = w
        validAxis2 = u
      }
      const validAxis3 = Cartesian3.cross(validAxis1, validAxis2, scratchValidAxis3)
      if (degenerateAxis === u) {
        u = validAxis3
      } else if (degenerateAxis === v) {
        v = validAxis3
      } else if (degenerateAxis === w) {
        w = validAxis3
      }
    } else if (numberOfDegenerateAxes === 2) {
      let validAxis1 = u
      if (vValid) {
        validAxis1 = v
      } else if (wValid) {
        validAxis1 = w
      }
      let crossVector = Cartesian3.UNIT_Y
      if (crossVector.equalsEpsilon(validAxis1, CesiumMath.EPSILON3)) {
        crossVector = Cartesian3.UNIT_X
      }
      const validAxis2 = Cartesian3.cross(validAxis1, crossVector, scratchValidAxis2)
      Cartesian3.normalize(validAxis2, validAxis2)
      const validAxis3 = Cartesian3.cross(validAxis1, validAxis2, scratchValidAxis3)
      Cartesian3.normalize(validAxis3, validAxis3)
      if (validAxis1 === u) {
        v = validAxis2
        w = validAxis3
      } else if (validAxis1 === v) {
        w = validAxis2
        u = validAxis3
      } else if (validAxis1 === w) {
        u = validAxis2
        v = validAxis3
      }
    } else if (numberOfDegenerateAxes === 3) {
      u = Cartesian3.UNIT_X
      v = Cartesian3.UNIT_Y
      w = Cartesian3.UNIT_Z
    }
    const pPrime = scratchPPrime
    pPrime.x = Cartesian3.dot(offset, u)
    pPrime.y = Cartesian3.dot(offset, v)
    pPrime.z = Cartesian3.dot(offset, w)
    let distanceSquared = 0.0
    let d: number
    if (pPrime.x < -uHalf) {
      d = pPrime.x + uHalf
      distanceSquared += d * d
    } else if (pPrime.x > uHalf) {
      d = pPrime.x - uHalf
      distanceSquared += d * d
    }
    if (pPrime.y < -vHalf) {
      d = pPrime.y + vHalf
      distanceSquared += d * d
    } else if (pPrime.y > vHalf) {
      d = pPrime.y - vHalf
      distanceSquared += d * d
    }
    if (pPrime.z < -wHalf) {
      d = pPrime.z + wHalf
      distanceSquared += d * d
    } else if (pPrime.z > wHalf) {
      d = pPrime.z - wHalf
      distanceSquared += d * d
    }
    return distanceSquared
  }

  /**
   * 沿方向的最近 / 最远平面距离。
   *
   * @param box 盒子
   * @param position 参考点
   * @param direction 方向
   * @param result 可选区间
   */
  static computePlaneDistances(
    box: OrientedBoundingBox,
    position: Cartesian3,
    direction: Cartesian3,
    result?: Interval,
  ): Interval {
    if (!defined(box)) {
      throw new DeveloperError("box is required.")
    }
    if (!defined(position)) {
      throw new DeveloperError("position is required.")
    }
    if (!defined(direction)) {
      throw new DeveloperError("direction is required.")
    }
    const out = defined(result) ? result : new Interval()
    let minDist = Number.POSITIVE_INFINITY
    let maxDist = Number.NEGATIVE_INFINITY
    const center = box.center
    const halfAxes = box.halfAxes
    const u = Matrix3.getColumn(halfAxes, 0, scratchCartesianU)
    const v = Matrix3.getColumn(halfAxes, 1, scratchCartesianV)
    const w = Matrix3.getColumn(halfAxes, 2, scratchCartesianW)
    const corner = Cartesian3.add(u, v, scratchCorner)
    Cartesian3.add(corner, w, corner)
    Cartesian3.add(corner, center, corner)
    const toCenter = Cartesian3.subtract(corner, position, scratchToCenter)
    let mag = Cartesian3.dot(direction, toCenter)
    minDist = Math.min(mag, minDist)
    maxDist = Math.max(mag, maxDist)
    Cartesian3.add(center, u, corner)
    Cartesian3.add(corner, v, corner)
    Cartesian3.subtract(corner, w, corner)
    Cartesian3.subtract(corner, position, toCenter)
    mag = Cartesian3.dot(direction, toCenter)
    minDist = Math.min(mag, minDist)
    maxDist = Math.max(mag, maxDist)
    Cartesian3.add(center, u, corner)
    Cartesian3.subtract(corner, v, corner)
    Cartesian3.add(corner, w, corner)
    Cartesian3.subtract(corner, position, toCenter)
    mag = Cartesian3.dot(direction, toCenter)
    minDist = Math.min(mag, minDist)
    maxDist = Math.max(mag, maxDist)
    Cartesian3.add(center, u, corner)
    Cartesian3.subtract(corner, v, corner)
    Cartesian3.subtract(corner, w, corner)
    Cartesian3.subtract(corner, position, toCenter)
    mag = Cartesian3.dot(direction, toCenter)
    minDist = Math.min(mag, minDist)
    maxDist = Math.max(mag, maxDist)
    Cartesian3.subtract(center, u, corner)
    Cartesian3.add(corner, v, corner)
    Cartesian3.add(corner, w, corner)
    Cartesian3.subtract(corner, position, toCenter)
    mag = Cartesian3.dot(direction, toCenter)
    minDist = Math.min(mag, minDist)
    maxDist = Math.max(mag, maxDist)
    Cartesian3.subtract(center, u, corner)
    Cartesian3.add(corner, v, corner)
    Cartesian3.subtract(corner, w, corner)
    Cartesian3.subtract(corner, position, toCenter)
    mag = Cartesian3.dot(direction, toCenter)
    minDist = Math.min(mag, minDist)
    maxDist = Math.max(mag, maxDist)
    Cartesian3.subtract(center, u, corner)
    Cartesian3.subtract(corner, v, corner)
    Cartesian3.add(corner, w, corner)
    Cartesian3.subtract(corner, position, toCenter)
    mag = Cartesian3.dot(direction, toCenter)
    minDist = Math.min(mag, minDist)
    maxDist = Math.max(mag, maxDist)
    Cartesian3.subtract(center, u, corner)
    Cartesian3.subtract(corner, v, corner)
    Cartesian3.subtract(corner, w, corner)
    Cartesian3.subtract(corner, position, toCenter)
    mag = Cartesian3.dot(direction, toCenter)
    minDist = Math.min(mag, minDist)
    maxDist = Math.max(mag, maxDist)
    out.start = minDist
    out.stop = maxDist
    return out
  }

  /**
   * 八个角点，顺序 (-X,-Y,-Z) … (+X,+Y,+Z)。
   *
   * @param box 盒子
   * @param result 可选 8 元数组
   */
  static computeCorners(box: OrientedBoundingBox, result?: Cartesian3[]): Cartesian3[] {
    Check.typeOf.object("box", box)
    const out = defined(result)
      ? result
      : [
          new Cartesian3(),
          new Cartesian3(),
          new Cartesian3(),
          new Cartesian3(),
          new Cartesian3(),
          new Cartesian3(),
          new Cartesian3(),
          new Cartesian3(),
        ]
    const center = box.center
    const halfAxes = box.halfAxes
    const xAxis = Matrix3.getColumn(halfAxes, 0, scratchXAxis)
    const yAxis = Matrix3.getColumn(halfAxes, 1, scratchYAxis)
    const zAxis = Matrix3.getColumn(halfAxes, 2, scratchZAxis)
    Cartesian3.clone(center, out[0])
    Cartesian3.subtract(out[0]!, xAxis, out[0]!)
    Cartesian3.subtract(out[0]!, yAxis, out[0]!)
    Cartesian3.subtract(out[0]!, zAxis, out[0]!)
    Cartesian3.clone(center, out[1])
    Cartesian3.subtract(out[1]!, xAxis, out[1]!)
    Cartesian3.subtract(out[1]!, yAxis, out[1]!)
    Cartesian3.add(out[1]!, zAxis, out[1]!)
    Cartesian3.clone(center, out[2])
    Cartesian3.subtract(out[2]!, xAxis, out[2]!)
    Cartesian3.add(out[2]!, yAxis, out[2]!)
    Cartesian3.subtract(out[2]!, zAxis, out[2]!)
    Cartesian3.clone(center, out[3])
    Cartesian3.subtract(out[3]!, xAxis, out[3]!)
    Cartesian3.add(out[3]!, yAxis, out[3]!)
    Cartesian3.add(out[3]!, zAxis, out[3]!)
    Cartesian3.clone(center, out[4])
    Cartesian3.add(out[4]!, xAxis, out[4]!)
    Cartesian3.subtract(out[4]!, yAxis, out[4]!)
    Cartesian3.subtract(out[4]!, zAxis, out[4]!)
    Cartesian3.clone(center, out[5])
    Cartesian3.add(out[5]!, xAxis, out[5]!)
    Cartesian3.subtract(out[5]!, yAxis, out[5]!)
    Cartesian3.add(out[5]!, zAxis, out[5]!)
    Cartesian3.clone(center, out[6])
    Cartesian3.add(out[6]!, xAxis, out[6]!)
    Cartesian3.add(out[6]!, yAxis, out[6]!)
    Cartesian3.subtract(out[6]!, zAxis, out[6]!)
    Cartesian3.clone(center, out[7])
    Cartesian3.add(out[7]!, xAxis, out[7]!)
    Cartesian3.add(out[7]!, yAxis, out[7]!)
    Cartesian3.add(out[7]!, zAxis, out[7]!)
    return out
  }

  /**
   * 由 OBB 还原变换矩阵。
   *
   * @param box 盒子
   * @param result 结果矩阵
   */
  static computeTransformation(box: OrientedBoundingBox, result?: Matrix4): Matrix4 {
    Check.typeOf.object("box", box)
    const out = defined(result) ? result : new Matrix4()
    const translation = box.center
    const rotationScale = Matrix3.multiplyByUniformScale(box.halfAxes, 2.0, scratchRotationScale)
    return Matrix4.fromRotationTranslation(rotationScale, translation, out)
  }

  /**
   * 是否被遮挡。
   *
   * @param box 盒子
   * @param occluder 遮挡器
   */
  static isOccluded(box: OrientedBoundingBox, occluder: BoundingSphereOccluder): boolean {
    if (!defined(box)) {
      throw new DeveloperError("box is required.")
    }
    if (!defined(occluder)) {
      throw new DeveloperError("occluder is required.")
    }
    const sphere = BoundingSphere.fromOrientedBoundingBox(box, scratchBoundingSphere)
    return !occluder.isBoundingSphereVisible(sphere)
  }

  /**
   * 分量比较。
   *
   * @param left 左
   * @param right 右
   */
  static equals(left?: OrientedBoundingBox, right?: OrientedBoundingBox): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Cartesian3.equals(left.center, right.center) &&
        Matrix3.equals(left.halfAxes, right.halfAxes))
    )
  }

  /**
   * 相对平面的内外侧。
   *
   * @param plane 平面
   */
  intersectPlane(plane: Plane): IntersectValue {
    return OrientedBoundingBox.intersectPlane(this, plane)
  }

  /**
   * 到点的距离平方。
   *
   * @param cartesian 点
   */
  distanceSquaredTo(cartesian: Cartesian3): number {
    return OrientedBoundingBox.distanceSquaredTo(this, cartesian)
  }

  /**
   * 沿方向的平面距离。
   *
   * @param position 参考点
   * @param direction 方向
   * @param result 可选区间
   */
  computePlaneDistances(position: Cartesian3, direction: Cartesian3, result?: Interval): Interval {
    return OrientedBoundingBox.computePlaneDistances(this, position, direction, result)
  }

  /**
   * 八角点。
   *
   * @param result 可选数组
   */
  computeCorners(result?: Cartesian3[]): Cartesian3[] {
    return OrientedBoundingBox.computeCorners(this, result)
  }

  /**
   * 变换矩阵。
   *
   * @param result 结果
   */
  computeTransformation(result?: Matrix4): Matrix4 {
    return OrientedBoundingBox.computeTransformation(this, result)
  }

  /**
   * 是否被遮挡。
   *
   * @param occluder 遮挡器
   */
  isOccluded(occluder: BoundingSphereOccluder): boolean {
    return OrientedBoundingBox.isOccluded(this, occluder)
  }

  /**
   * 复制自身。
   *
   * @param result 可选结果
   */
  clone(result?: OrientedBoundingBox): OrientedBoundingBox {
    return OrientedBoundingBox.clone(this, result)!
  }

  /**
   * 与另一盒子比较。
   *
   * @param right 右侧
   */
  equals(right?: OrientedBoundingBox): boolean {
    return OrientedBoundingBox.equals(this, right)
  }
}
