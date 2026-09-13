// @ts-nocheck — 机械移植相交测试，算法与 Cesium 一致
/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import type { AxisAlignedBoundingBox } from "./AxisAlignedBoundingBox"
import type { BoundingSphere } from "./BoundingSphere"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import type { Ellipsoid } from "./Ellipsoid"
import { Interval } from "./Interval"
import { CesiumMath } from "./CesiumMath"
import { Matrix3 } from "./Matrix3"
import type { Plane } from "./Plane"
import { QuadraticRealPolynomial } from "./QuadraticRealPolynomial"
import { QuarticRealPolynomial } from "./QuarticRealPolynomial"
import { Ray } from "./Ray"

interface QuadraticRoots {
  root0: number
  root1: number
}

/** 三角形被平面切开后的网格 */
export interface TrianglePlaneIntersection {
  positions: Cartesian3[]
  indices: number[]
}

const scratchEdge0 = new Cartesian3()
const scratchEdge1 = new Cartesian3()
const scratchPVec = new Cartesian3()
const scratchTVec = new Cartesian3()
const scratchQVec = new Cartesian3()
const scratchLineSegmentTriangleRay = new Ray()
const raySphereRoots: QuadraticRoots = { root0: 0.0, root1: 0.0 }
const scratchLineSegmentRay = new Ray()
const scratchQ = new Cartesian3()
const scratchW = new Cartesian3()
const scratchRayIntervalX = new Interval()
const scratchRayIntervalY = new Interval()
const scratchRayIntervalZ = new Interval()
const lineSegmentPlaneDifference = new Cartesian3()
const firstAxisScratch = new Cartesian3()
const secondAxisScratch = new Cartesian3()
const thirdAxisScratch = new Cartesian3()
const referenceScratch = new Cartesian3()
const bCart = new Cartesian3()
const bScratch = new Matrix3()
const btScratch = new Matrix3()
const diScratch = new Matrix3()
const dScratch = new Matrix3()
const cScratch = new Matrix3()
const tempMatrix = new Matrix3()
const aScratch = new Matrix3()
const sScratch = new Cartesian3()
const closestScratch = new Cartesian3()
const surfPointScratch = new Cartographic()

/**
 * 解二次方程，结果写入 result。
 *
 * @param a 二次项
 * @param b 一次项
 * @param c 常数项
 * @param result 根
 */
function solveQuadratic(
  a: number,
  b: number,
  c: number,
  result: QuadraticRoots,
): QuadraticRoots | undefined {
  const det = b * b - 4.0 * a * c
  if (det < 0.0) {
    return undefined
  }
  if (det > 0.0) {
    const denom = 1.0 / (2.0 * a)
    const disc = Math.sqrt(det)
    const root0 = (-b + disc) * denom
    const root1 = (-b - disc) * denom
    if (root0 < root1) {
      result.root0 = root0
      result.root1 = root1
    } else {
      result.root0 = root1
      result.root1 = root0
    }
    return result
  }
  const root = -b / (2.0 * a)
  if (root === 0.0) {
    return undefined
  }
  result.root0 = root
  result.root1 = root
  return result
}

/**
 * 射线与球的参数区间。
 *
 * @param ray 射线
 * @param sphere 球
 * @param result 区间
 */
function raySphere(ray: Ray, sphere: BoundingSphere, result?: Interval): Interval | undefined {
  const out = defined(result) ? result : new Interval()
  const origin = ray.origin
  const direction = ray.direction
  const center = sphere.center
  const radiusSquared = sphere.radius * sphere.radius
  const diff = Cartesian3.subtract(origin, center, scratchPVec)
  const a = Cartesian3.dot(direction, direction)
  const b = 2.0 * Cartesian3.dot(direction, diff)
  const c = Cartesian3.magnitudeSquared(diff) - radiusSquared
  const roots = solveQuadratic(a, b, c, raySphereRoots)
  if (!defined(roots)) {
    return undefined
  }
  out.start = roots.root0
  out.stop = roots.root1
  return out
}

/**
 * 沿 AABB 单轴的进出参数。
 *
 * @param origin 原点分量
 * @param direction 方向分量
 * @param min 最小
 * @param max 最大
 * @param result 区间
 */
function rayIntervalAlongAABBAxis(
  origin: number,
  direction: number,
  min: number,
  max: number,
  result: Interval,
): Interval {
  result.start = (min - origin) / direction
  result.stop = (max - origin) / direction
  if (result.stop < result.start) {
    const tmp = result.stop
    result.stop = result.start
    result.start = tmp
  }
  return result
}

/**
 * 异号相加时的抵消检查。
 *
 * @param left 左
 * @param right 右
 * @param tolerance 容差
 */
function addWithCancellationCheck(left: number, right: number, tolerance?: number): number {
  const difference = left + right
  if (
    CesiumMath.sign(left) !== CesiumMath.sign(right) &&
    Math.abs(difference / Math.max(Math.abs(left), Math.abs(right))) < (tolerance ?? 0)
  ) {
    return 0.0
  }
  return difference
}

/**
 * 射线 / 平面 / 三角形 / 椭球求交。
 * 对标 Cesium `Core/IntersectionTests.js`。
 */
export const IntersectionTests = {
  /**
   * 射线与平面交点；平行或反向则 undefined。
   *
   * @param ray 射线
   * @param plane 平面
   * @param result 可选结果
   */
  rayPlane(ray: Ray, plane: Plane, result?: Cartesian3): Cartesian3 | undefined {
    if (!defined(ray)) {
      throw new DeveloperError("ray is required.")
    }
    if (!defined(plane)) {
      throw new DeveloperError("plane is required.")
    }
    const out = defined(result) ? result : new Cartesian3()
    const origin = ray.origin
    const direction = ray.direction
    const normal = plane.normal
    const denominator = Cartesian3.dot(normal, direction)
    if (Math.abs(denominator) < CesiumMath.EPSILON15) {
      return undefined
    }
    const t = (-plane.distance - Cartesian3.dot(normal, origin)) / denominator
    if (t < 0) {
      return undefined
    }
    Cartesian3.multiplyByScalar(direction, t, out)
    return Cartesian3.add(origin, out, out)
  },

  /**
   * 射线与三角形的参数 t（Möller–Trumbore）。
   *
   * @param ray 射线
   * @param p0 顶点 0
   * @param p1 顶点 1
   * @param p2 顶点 2
   * @param cullBackFaces 是否剔除背面
   */
  rayTriangleParametric(
    ray: Ray,
    p0: Cartesian3,
    p1: Cartesian3,
    p2: Cartesian3,
    cullBackFaces?: boolean,
  ): number | undefined {
    if (!defined(ray)) {
      throw new DeveloperError("ray is required.")
    }
    if (!defined(p0)) {
      throw new DeveloperError("p0 is required.")
    }
    if (!defined(p1)) {
      throw new DeveloperError("p1 is required.")
    }
    if (!defined(p2)) {
      throw new DeveloperError("p2 is required.")
    }
    const cull = cullBackFaces ?? false
    const origin = ray.origin
    const direction = ray.direction
    const edge0 = Cartesian3.subtract(p1, p0, scratchEdge0)
    const edge1 = Cartesian3.subtract(p2, p0, scratchEdge1)
    const p = Cartesian3.cross(direction, edge1, scratchPVec)
    const det = Cartesian3.dot(edge0, p)
    if (cull) {
      if (det < CesiumMath.EPSILON6) {
        return undefined
      }
      const tvec = Cartesian3.subtract(origin, p0, scratchTVec)
      const u = Cartesian3.dot(tvec, p)
      if (u < 0.0 || u > det) {
        return undefined
      }
      const q = Cartesian3.cross(tvec, edge0, scratchQVec)
      const v = Cartesian3.dot(direction, q)
      if (v < 0.0 || u + v > det) {
        return undefined
      }
      return Cartesian3.dot(edge1, q) / det
    }
    if (Math.abs(det) < CesiumMath.EPSILON6) {
      return undefined
    }
    const invDet = 1.0 / det
    const tvec = Cartesian3.subtract(origin, p0, scratchTVec)
    const u = Cartesian3.dot(tvec, p) * invDet
    if (u < 0.0 || u > 1.0) {
      return undefined
    }
    const q = Cartesian3.cross(tvec, edge0, scratchQVec)
    const v = Cartesian3.dot(direction, q) * invDet
    if (v < 0.0 || u + v > 1.0) {
      return undefined
    }
    return Cartesian3.dot(edge1, q) * invDet
  },

  /**
   * 射线与三角形交点。
   *
   * @param ray 射线
   * @param p0 顶点 0
   * @param p1 顶点 1
   * @param p2 顶点 2
   * @param cullBackFaces 是否剔除背面
   * @param result 可选结果
   */
  rayTriangle(
    ray: Ray,
    p0: Cartesian3,
    p1: Cartesian3,
    p2: Cartesian3,
    cullBackFaces?: boolean,
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    const t = IntersectionTests.rayTriangleParametric(ray, p0, p1, p2, cullBackFaces)
    if (!defined(t) || t < 0.0) {
      return undefined
    }
    const out = defined(result) ? result : new Cartesian3()
    Cartesian3.multiplyByScalar(ray.direction, t, out)
    return Cartesian3.add(ray.origin, out, out)
  },

  /**
   * 线段与三角形交点。
   *
   * @param v0 线段端点
   * @param v1 另一端点
   * @param p0 顶点 0
   * @param p1 顶点 1
   * @param p2 顶点 2
   * @param cullBackFaces 是否剔除背面
   * @param result 可选结果
   */
  lineSegmentTriangle(
    v0: Cartesian3,
    v1: Cartesian3,
    p0: Cartesian3,
    p1: Cartesian3,
    p2: Cartesian3,
    cullBackFaces?: boolean,
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    if (!defined(v0)) {
      throw new DeveloperError("v0 is required.")
    }
    if (!defined(v1)) {
      throw new DeveloperError("v1 is required.")
    }
    if (!defined(p0)) {
      throw new DeveloperError("p0 is required.")
    }
    if (!defined(p1)) {
      throw new DeveloperError("p1 is required.")
    }
    if (!defined(p2)) {
      throw new DeveloperError("p2 is required.")
    }
    const ray = scratchLineSegmentTriangleRay
    Cartesian3.clone(v0, ray.origin)
    Cartesian3.subtract(v1, v0, ray.direction)
    Cartesian3.normalize(ray.direction, ray.direction)
    const t = IntersectionTests.rayTriangleParametric(ray, p0, p1, p2, cullBackFaces)
    if (!defined(t) || t < 0.0 || t > Cartesian3.distance(v0, v1)) {
      return undefined
    }
    const out = defined(result) ? result : new Cartesian3()
    Cartesian3.multiplyByScalar(ray.direction, t, out)
    return Cartesian3.add(ray.origin, out, out)
  },

  /**
   * 射线与球的参数区间。
   *
   * @param ray 射线
   * @param sphere 球
   * @param result 可选区间
   */
  raySphere(ray: Ray, sphere: BoundingSphere, result?: Interval): Interval | undefined {
    if (!defined(ray)) {
      throw new DeveloperError("ray is required.")
    }
    if (!defined(sphere)) {
      throw new DeveloperError("sphere is required.")
    }
    const out = raySphere(ray, sphere, result)
    if (!defined(out) || out.stop < 0.0) {
      return undefined
    }
    out.start = Math.max(out.start, 0.0)
    return out
  },

  /**
   * 线段与球的参数区间。
   *
   * @param p0 端点
   * @param p1 另一端点
   * @param sphere 球
   * @param result 可选区间
   */
  lineSegmentSphere(
    p0: Cartesian3,
    p1: Cartesian3,
    sphere: BoundingSphere,
    result?: Interval,
  ): Interval | undefined {
    if (!defined(p0)) {
      throw new DeveloperError("p0 is required.")
    }
    if (!defined(p1)) {
      throw new DeveloperError("p1 is required.")
    }
    if (!defined(sphere)) {
      throw new DeveloperError("sphere is required.")
    }
    const ray = scratchLineSegmentRay
    Cartesian3.clone(p0, ray.origin)
    const direction = Cartesian3.subtract(p1, p0, ray.direction)
    const maxT = Cartesian3.magnitude(direction)
    Cartesian3.normalize(direction, direction)
    const out = raySphere(ray, sphere, result)
    if (!defined(out) || out.stop < 0.0 || out.start > maxT) {
      return undefined
    }
    out.start = Math.max(out.start, 0.0)
    out.stop = Math.min(out.stop, maxT)
    return out
  },

  /**
   * 射线与椭球的参数区间。
   *
   * @param ray 射线
   * @param ellipsoid 椭球
   */
  rayEllipsoid(ray: Ray, ellipsoid: Ellipsoid): Interval | undefined {
    if (!defined(ray)) {
      throw new DeveloperError("ray is required.")
    }
    if (!defined(ellipsoid)) {
      throw new DeveloperError("ellipsoid is required.")
    }
    const inverseRadii = ellipsoid.oneOverRadii
    const q = Cartesian3.multiplyComponents(inverseRadii, ray.origin, scratchQ)
    const w = Cartesian3.multiplyComponents(inverseRadii, ray.direction, scratchW)
    const q2 = Cartesian3.magnitudeSquared(q)
    const qw = Cartesian3.dot(q, w)
    if (q2 > 1.0) {
      if (qw >= 0.0) {
        return undefined
      }
      const qw2 = qw * qw
      const difference = q2 - 1.0
      const w2 = Cartesian3.magnitudeSquared(w)
      const product = w2 * difference
      if (qw2 < product) {
        return undefined
      }
      if (qw2 > product) {
        const discriminant = qw * qw - product
        const temp = -qw + Math.sqrt(discriminant)
        const root0 = temp / w2
        const root1 = difference / temp
        if (root0 < root1) {
          return new Interval(root0, root1)
        }
        return new Interval(root1, root0)
      }
      const root = Math.sqrt(difference / w2)
      return new Interval(root, root)
    }
    if (q2 < 1.0) {
      const difference = q2 - 1.0
      const w2 = Cartesian3.magnitudeSquared(w)
      const product = w2 * difference
      const discriminant = qw * qw - product
      const temp = -qw + Math.sqrt(discriminant)
      return new Interval(0.0, temp / w2)
    }
    if (qw < 0.0) {
      const w2 = Cartesian3.magnitudeSquared(w)
      return new Interval(0.0, -qw / w2)
    }
    return undefined
  },

  /**
   * 射线与 AABB 的参数区间。
   *
   * @param ray 射线
   * @param box AABB
   * @param result 可选区间
   */
  rayAxisAlignedBoundingBox(
    ray: Ray,
    box: AxisAlignedBoundingBox,
    result?: Interval,
  ): Interval | undefined {
    if (!defined(ray)) {
      throw new DeveloperError("ray is required.")
    }
    if (!defined(box)) {
      throw new DeveloperError("box is required.")
    }
    const out = defined(result) ? result : new Interval()
    const tx = rayIntervalAlongAABBAxis(
      ray.origin.x,
      ray.direction.x,
      box.minimum.x,
      box.maximum.x,
      scratchRayIntervalX,
    )
    const ty = rayIntervalAlongAABBAxis(
      ray.origin.y,
      ray.direction.y,
      box.minimum.y,
      box.maximum.y,
      scratchRayIntervalY,
    )
    const tz = rayIntervalAlongAABBAxis(
      ray.origin.z,
      ray.direction.z,
      box.minimum.z,
      box.maximum.z,
      scratchRayIntervalZ,
    )
    out.start = tx.start > ty.start ? tx.start : ty.start
    out.stop = tx.stop < ty.stop ? tx.stop : ty.stop
    if (tx.start > ty.stop || ty.start > tx.stop) {
      return undefined
    }
    if (out.start > tz.stop || tz.start > out.stop) {
      return undefined
    }
    if (tz.start > out.start) {
      out.start = tz.start
    }
    if (tz.stop < out.stop) {
      out.stop = tz.stop
    }
    return out
  },

  /**
   * 二次向量表达式的实根（grazingAltitudeLocation 内部）。
   *
   * @param A 矩阵
   * @param b 向量
   * @param c 常数
   * @param x x
   * @param w w
   */
  quadraticVectorExpression(
    A: Matrix3,
    b: Cartesian3,
    c: number,
    x: number,
    w: number,
  ): Cartesian3[] {
    const xSquared = x * x
    const wSquared = w * w
    const l2 = (A[Matrix3.COLUMN1ROW1] - A[Matrix3.COLUMN2ROW2]) * wSquared
    const l1 =
      w *
      (x *
        addWithCancellationCheck(
          A[Matrix3.COLUMN1ROW0],
          A[Matrix3.COLUMN0ROW1],
          CesiumMath.EPSILON15,
        ) +
        b.y)
    const l0 = A[Matrix3.COLUMN0ROW0] * xSquared + A[Matrix3.COLUMN2ROW2] * wSquared + x * b.x + c
    const r1 =
      wSquared *
      addWithCancellationCheck(A[Matrix3.COLUMN2ROW1], A[Matrix3.COLUMN1ROW2], CesiumMath.EPSILON15)
    const r0 =
      w * (x * addWithCancellationCheck(A[Matrix3.COLUMN2ROW0], A[Matrix3.COLUMN0ROW2]) + b.z)
    const solutions: Cartesian3[] = []
    if (r0 === 0.0 && r1 === 0.0) {
      const cosines = QuadraticRealPolynomial.computeRealRoots(l2, l1, l0)
      if (cosines.length === 0) {
        return solutions
      }
      const cosine0 = cosines[0]!
      const sine0 = Math.sqrt(Math.max(1.0 - cosine0 * cosine0, 0.0))
      solutions.push(new Cartesian3(x, w * cosine0, w * -sine0))
      solutions.push(new Cartesian3(x, w * cosine0, w * sine0))
      if (cosines.length === 2) {
        const cosine1 = cosines[1]!
        const sine1 = Math.sqrt(Math.max(1.0 - cosine1 * cosine1, 0.0))
        solutions.push(new Cartesian3(x, w * cosine1, w * -sine1))
        solutions.push(new Cartesian3(x, w * cosine1, w * sine1))
      }
      return solutions
    }
    const r0Squared = r0 * r0
    const r1Squared = r1 * r1
    const l2Squared = l2 * l2
    const r0r1 = r0 * r1
    const c4 = l2Squared + r1Squared
    const c3 = 2.0 * (l1 * l2 + r0r1)
    const c2 = 2.0 * l0 * l2 + l1 * l1 - r1Squared + r0Squared
    const c1 = 2.0 * (l0 * l1 - r0r1)
    const c0 = l0 * l0 - r0Squared
    if (c4 === 0.0 && c3 === 0.0 && c2 === 0.0 && c1 === 0.0) {
      return solutions
    }
    const cosines = QuarticRealPolynomial.computeRealRoots(c4, c3, c2, c1, c0)
    const length = cosines.length
    for (let i = 0; i < length; ++i) {
      const cosine = cosines[i]!
      const cosineSquared = cosine * cosine
      const sineSquared = Math.max(1.0 - cosineSquared, 0.0)
      const sine = Math.sqrt(sineSquared)
      let left: number
      if (CesiumMath.sign(l2) === CesiumMath.sign(l0)) {
        left = addWithCancellationCheck(l2 * cosineSquared + l0, l1 * cosine, CesiumMath.EPSILON12)
      } else if (CesiumMath.sign(l0) === CesiumMath.sign(l1 * cosine)) {
        left = addWithCancellationCheck(l2 * cosineSquared, l1 * cosine + l0, CesiumMath.EPSILON12)
      } else {
        left = addWithCancellationCheck(l2 * cosineSquared + l1 * cosine, l0, CesiumMath.EPSILON12)
      }
      const right = addWithCancellationCheck(r1 * cosine, r0, CesiumMath.EPSILON15)
      const product = left * right
      if (product < 0.0) {
        solutions.push(new Cartesian3(x, w * cosine, w * sine))
      } else if (product > 0.0) {
        solutions.push(new Cartesian3(x, w * cosine, w * -sine))
      } else if (sine !== 0.0) {
        solutions.push(new Cartesian3(x, w * cosine, w * -sine))
        solutions.push(new Cartesian3(x, w * cosine, w * sine))
        ++i
      } else {
        solutions.push(new Cartesian3(x, w * cosine, w * sine))
      }
    }
    return solutions
  },

  /**
   * 射线上距椭球最近的点（擦地高度位置）。
   *
   * @param ray 射线
   * @param ellipsoid 椭球
   */
  grazingAltitudeLocation(ray: Ray, ellipsoid: Ellipsoid): Cartesian3 | undefined {
    if (!defined(ray)) {
      throw new DeveloperError("ray is required.")
    }
    if (!defined(ellipsoid)) {
      throw new DeveloperError("ellipsoid is required.")
    }
    const position = ray.origin
    const direction = ray.direction
    if (!Cartesian3.equals(position, Cartesian3.ZERO)) {
      const normal = ellipsoid.geodeticSurfaceNormal(position, firstAxisScratch)
      if (Cartesian3.dot(direction, normal) >= 0.0) {
        return position
      }
    }
    const intersects = defined(IntersectionTests.rayEllipsoid(ray, ellipsoid))
    const f = ellipsoid.transformPositionToScaledSpace(direction, firstAxisScratch)
    const firstAxis = Cartesian3.normalize(f, f)
    const reference = Cartesian3.mostOrthogonalAxis(f, referenceScratch)
    const secondAxis = Cartesian3.normalize(
      Cartesian3.cross(reference, firstAxis, secondAxisScratch),
      secondAxisScratch,
    )
    const thirdAxis = Cartesian3.normalize(
      Cartesian3.cross(firstAxis, secondAxis, thirdAxisScratch),
      thirdAxisScratch,
    )
    const B = bScratch
    B[0] = firstAxis.x
    B[1] = firstAxis.y
    B[2] = firstAxis.z
    B[3] = secondAxis.x
    B[4] = secondAxis.y
    B[5] = secondAxis.z
    B[6] = thirdAxis.x
    B[7] = thirdAxis.y
    B[8] = thirdAxis.z
    const B_T = Matrix3.transpose(B, btScratch)
    const D_I = Matrix3.fromScale(ellipsoid.radii, diScratch)
    const D = Matrix3.fromScale(ellipsoid.oneOverRadii, dScratch)
    const C = cScratch
    C[0] = 0.0
    C[1] = -direction.z
    C[2] = direction.y
    C[3] = direction.z
    C[4] = 0.0
    C[5] = -direction.x
    C[6] = -direction.y
    C[7] = direction.x
    C[8] = 0.0
    const temp = Matrix3.multiply(Matrix3.multiply(B_T, D, tempMatrix), C, tempMatrix)
    const A = Matrix3.multiply(Matrix3.multiply(temp, D_I, aScratch), B, aScratch)
    const b = Matrix3.multiplyByVector(temp, position, bCart)
    const solutions = IntersectionTests.quadraticVectorExpression(
      A,
      Cartesian3.negate(b, firstAxisScratch),
      0.0,
      0.0,
      1.0,
    )
    const length = solutions.length
    if (length > 0) {
      let closest = Cartesian3.clone(Cartesian3.ZERO, closestScratch)
      let maximumValue = Number.NEGATIVE_INFINITY
      for (let i = 0; i < length; ++i) {
        const s = Matrix3.multiplyByVector(
          D_I,
          Matrix3.multiplyByVector(B, solutions[i]!, sScratch),
          sScratch,
        )
        const v = Cartesian3.normalize(
          Cartesian3.subtract(s, position, referenceScratch),
          referenceScratch,
        )
        const dotProduct = Cartesian3.dot(v, direction)
        if (dotProduct > maximumValue) {
          maximumValue = dotProduct
          closest = Cartesian3.clone(s, closest)
        }
      }
      const surfacePoint = ellipsoid.cartesianToCartographic(closest, surfPointScratch)
      maximumValue = CesiumMath.clamp(maximumValue, 0.0, 1.0)
      let altitude =
        Cartesian3.magnitude(Cartesian3.subtract(closest, position, referenceScratch)) *
        Math.sqrt(1.0 - maximumValue * maximumValue)
      altitude = intersects ? -altitude : altitude
      surfacePoint.height = altitude
      return ellipsoid.cartographicToCartesian(surfacePoint, new Cartesian3())
    }
    return undefined
  },

  /**
   * 线段与平面交点。
   *
   * @param endPoint0 端点
   * @param endPoint1 另一端点
   * @param plane 平面
   * @param result 可选结果
   */
  lineSegmentPlane(
    endPoint0: Cartesian3,
    endPoint1: Cartesian3,
    plane: Plane,
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    if (!defined(endPoint0)) {
      throw new DeveloperError("endPoint0 is required.")
    }
    if (!defined(endPoint1)) {
      throw new DeveloperError("endPoint1 is required.")
    }
    if (!defined(plane)) {
      throw new DeveloperError("plane is required.")
    }
    const out = defined(result) ? result : new Cartesian3()
    const difference = Cartesian3.subtract(endPoint1, endPoint0, lineSegmentPlaneDifference)
    const normal = plane.normal
    const nDotDiff = Cartesian3.dot(normal, difference)
    if (Math.abs(nDotDiff) < CesiumMath.EPSILON6) {
      return undefined
    }
    const nDotP0 = Cartesian3.dot(normal, endPoint0)
    const t = -(plane.distance + nDotP0) / nDotDiff
    if (t < 0.0 || t > 1.0) {
      return undefined
    }
    Cartesian3.multiplyByScalar(difference, t, out)
    Cartesian3.add(endPoint0, out, out)
    return out
  },

  /**
   * 三角形被平面切开后的前后网格；不相交返回 undefined。
   *
   * @param p0 顶点 0
   * @param p1 顶点 1
   * @param p2 顶点 2
   * @param plane 平面
   */
  trianglePlaneIntersection(
    p0: Cartesian3,
    p1: Cartesian3,
    p2: Cartesian3,
    plane: Plane,
  ): TrianglePlaneIntersection | undefined {
    if (!defined(p0) || !defined(p1) || !defined(p2) || !defined(plane)) {
      throw new DeveloperError("p0, p1, p2, and plane are required.")
    }
    const planeNormal = plane.normal
    const planeD = plane.distance
    const p0Behind = Cartesian3.dot(planeNormal, p0) + planeD < 0.0
    const p1Behind = Cartesian3.dot(planeNormal, p1) + planeD < 0.0
    const p2Behind = Cartesian3.dot(planeNormal, p2) + planeD < 0.0
    let numBehind = 0
    numBehind += p0Behind ? 1 : 0
    numBehind += p1Behind ? 1 : 0
    numBehind += p2Behind ? 1 : 0
    let u1: Cartesian3 | undefined
    let u2: Cartesian3 | undefined
    if (numBehind === 1 || numBehind === 2) {
      u1 = new Cartesian3()
      u2 = new Cartesian3()
    }
    if (numBehind === 1 && defined(u1) && defined(u2)) {
      if (p0Behind) {
        IntersectionTests.lineSegmentPlane(p0, p1, plane, u1)
        IntersectionTests.lineSegmentPlane(p0, p2, plane, u2)
        return { positions: [p0, p1, p2, u1, u2], indices: [0, 3, 4, 1, 2, 4, 1, 4, 3] }
      }
      if (p1Behind) {
        IntersectionTests.lineSegmentPlane(p1, p2, plane, u1)
        IntersectionTests.lineSegmentPlane(p1, p0, plane, u2)
        return { positions: [p0, p1, p2, u1, u2], indices: [1, 3, 4, 2, 0, 4, 2, 4, 3] }
      }
      if (p2Behind) {
        IntersectionTests.lineSegmentPlane(p2, p0, plane, u1)
        IntersectionTests.lineSegmentPlane(p2, p1, plane, u2)
        return { positions: [p0, p1, p2, u1, u2], indices: [2, 3, 4, 0, 1, 4, 0, 4, 3] }
      }
    } else if (numBehind === 2 && defined(u1) && defined(u2)) {
      if (!p0Behind) {
        IntersectionTests.lineSegmentPlane(p1, p0, plane, u1)
        IntersectionTests.lineSegmentPlane(p2, p0, plane, u2)
        return { positions: [p0, p1, p2, u1, u2], indices: [1, 2, 4, 1, 4, 3, 0, 3, 4] }
      }
      if (!p1Behind) {
        IntersectionTests.lineSegmentPlane(p2, p1, plane, u1)
        IntersectionTests.lineSegmentPlane(p0, p1, plane, u2)
        return { positions: [p0, p1, p2, u1, u2], indices: [2, 0, 4, 2, 4, 3, 1, 3, 4] }
      }
      if (!p2Behind) {
        IntersectionTests.lineSegmentPlane(p0, p2, plane, u1)
        IntersectionTests.lineSegmentPlane(p1, p2, plane, u2)
        return { positions: [p0, p1, p2, u1, u2], indices: [0, 1, 4, 0, 4, 3, 2, 3, 4] }
      }
    }
    return undefined
  },
}
