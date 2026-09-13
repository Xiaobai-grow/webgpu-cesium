/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Cartesian2 } from "./Cartesian2"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { Check } from "./Check"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { CesiumMath } from "./CesiumMath"
import { scaleToGeodeticSurface } from "./scaleToGeodeticSurface"
import type { Rectangle } from "./Rectangle"

const cartographicToCartesianNormal = new Cartesian3()
const cartographicToCartesianK = new Cartesian3()

const cartesianToCartographicN = new Cartesian3()
const cartesianToCartographicP = new Cartesian3()
const cartesianToCartographicH = new Cartesian3()

const scratchEndpoint = new Cartesian3()

const abscissas = [
  0.14887433898163, 0.43339539412925, 0.67940956829902, 0.86506336668898, 0.97390652851717, 0.0,
]
const weights = [
  0.29552422471475, 0.26926671930999, 0.21908636251598, 0.14945134915058, 0.066671344308684, 0.0,
]

/**
 * 把半径写入椭球缓存字段。
 *
 * @param ellipsoid 目标
 * @param x x 半径
 * @param y y 半径
 * @param z z 半径
 */
function initialize(ellipsoid: Ellipsoid, x?: number, y?: number, z?: number): void {
  const nextX = x ?? 0.0
  const nextY = y ?? 0.0
  const nextZ = z ?? 0.0

  Check.typeOf.number.greaterThanOrEquals("x", nextX, 0.0)
  Check.typeOf.number.greaterThanOrEquals("y", nextY, 0.0)
  Check.typeOf.number.greaterThanOrEquals("z", nextZ, 0.0)

  ellipsoid._radii = new Cartesian3(nextX, nextY, nextZ)

  ellipsoid._radiiSquared = new Cartesian3(nextX * nextX, nextY * nextY, nextZ * nextZ)

  ellipsoid._radiiToTheFourth = new Cartesian3(
    nextX * nextX * nextX * nextX,
    nextY * nextY * nextY * nextY,
    nextZ * nextZ * nextZ * nextZ,
  )

  ellipsoid._oneOverRadii = new Cartesian3(
    nextX === 0.0 ? 0.0 : 1.0 / nextX,
    nextY === 0.0 ? 0.0 : 1.0 / nextY,
    nextZ === 0.0 ? 0.0 : 1.0 / nextZ,
  )

  ellipsoid._oneOverRadiiSquared = new Cartesian3(
    nextX === 0.0 ? 0.0 : 1.0 / (nextX * nextX),
    nextY === 0.0 ? 0.0 : 1.0 / (nextY * nextY),
    nextZ === 0.0 ? 0.0 : 1.0 / (nextZ * nextZ),
  )

  ellipsoid._minimumRadius = Math.min(nextX, nextY, nextZ)
  ellipsoid._maximumRadius = Math.max(nextX, nextY, nextZ)
  ellipsoid._centerToleranceSquared = CesiumMath.EPSILON1

  if (ellipsoid._radiiSquared.z !== 0) {
    ellipsoid._squaredXOverSquaredZ = ellipsoid._radiiSquared.x / ellipsoid._radiiSquared.z
  }
}

/**
 * 10 阶 Gauss-Legendre 求积。
 *
 * @param a 下限
 * @param b 上限
 * @param func 被积函数
 */
function gaussLegendreQuadrature(a: number, b: number, func: (x: number) => number): number {
  Check.typeOf.number("a", a)
  Check.typeOf.number("b", b)
  Check.typeOf.func("func", func)

  const xMean = 0.5 * (b + a)
  const xRange = 0.5 * (b - a)

  let sum = 0.0
  for (let i = 0; i < 5; i++) {
    const dx = xRange * abscissas[i]!
    sum += weights[i]! * (func(xMean + dx) + func(xMean - dx))
  }

  sum *= xRange
  return sum
}

/**
 * 二次曲面 (x/a)² + (y/b)² + (z/c)² = 1。
 * 对标 Cesium `Core/Ellipsoid.js`。
 */
export class Ellipsoid {
  _radii: Cartesian3
  _radiiSquared: Cartesian3
  _radiiToTheFourth: Cartesian3
  _oneOverRadii: Cartesian3
  _oneOverRadiiSquared: Cartesian3
  _minimumRadius: number
  _maximumRadius: number
  _centerToleranceSquared: number
  _squaredXOverSquaredZ: number | undefined

  static packedLength = 3

  static readonly WGS84: Ellipsoid = Object.freeze(
    new Ellipsoid(6378137.0, 6378137.0, 6356752.3142451793),
  )

  static readonly UNIT_SPHERE: Ellipsoid = Object.freeze(new Ellipsoid(1.0, 1.0, 1.0))

  static readonly MOON: Ellipsoid = Object.freeze(
    new Ellipsoid(CesiumMath.LUNAR_RADIUS, CesiumMath.LUNAR_RADIUS, CesiumMath.LUNAR_RADIUS),
  )

  static readonly MARS: Ellipsoid = Object.freeze(new Ellipsoid(3396190.0, 3396190.0, 3376200.0))

  static _default: Ellipsoid = Ellipsoid.WGS84

  /**
   * @param x x 半径，米
   * @param y y 半径，米
   * @param z z 半径，米
   */
  constructor(x?: number, y?: number, z?: number) {
    this._radii = new Cartesian3()
    this._radiiSquared = new Cartesian3()
    this._radiiToTheFourth = new Cartesian3()
    this._oneOverRadii = new Cartesian3()
    this._oneOverRadiiSquared = new Cartesian3()
    this._minimumRadius = 0
    this._maximumRadius = 0
    this._centerToleranceSquared = CesiumMath.EPSILON1
    this._squaredXOverSquaredZ = undefined

    initialize(this, x, y, z)
  }

  /** 三轴半径 */
  get radii(): Cartesian3 {
    return this._radii
  }

  /** 半径平方 */
  get radiiSquared(): Cartesian3 {
    return this._radiiSquared
  }

  /** 半径四次方 */
  get radiiToTheFourth(): Cartesian3 {
    return this._radiiToTheFourth
  }

  /** 半径倒数 */
  get oneOverRadii(): Cartesian3 {
    return this._oneOverRadii
  }

  /** 半径平方倒数 */
  get oneOverRadiiSquared(): Cartesian3 {
    return this._oneOverRadiiSquared
  }

  /** 最小半径 */
  get minimumRadius(): number {
    return this._minimumRadius
  }

  /** 最大半径 */
  get maximumRadius(): number {
    return this._maximumRadius
  }

  /**
   * 未另行指定时使用的默认椭球。
   */
  static get default(): Ellipsoid {
    return Ellipsoid._default
  }

  static set default(value: Ellipsoid) {
    Check.typeOf.object("value", value)

    Ellipsoid._default = value
    Cartesian3._ellipsoidRadiiSquared = value.radiiSquared
    Cartographic._ellipsoidOneOverRadii = value.oneOverRadii
    Cartographic._ellipsoidOneOverRadiiSquared = value.oneOverRadiiSquared
    Cartographic._ellipsoidCenterToleranceSquared = value._centerToleranceSquared
  }

  /**
   * 复制椭球；源未定义时返回 undefined。
   *
   * @param ellipsoid 源
   * @param result 可选结果对象
   */
  static clone(ellipsoid?: Ellipsoid, result?: Ellipsoid): Ellipsoid | undefined {
    if (!defined(ellipsoid)) {
      return undefined
    }
    const radii = ellipsoid._radii

    if (!defined(result)) {
      return new Ellipsoid(radii.x, radii.y, radii.z)
    }

    Cartesian3.clone(radii, result._radii)
    Cartesian3.clone(ellipsoid._radiiSquared, result._radiiSquared)
    Cartesian3.clone(ellipsoid._radiiToTheFourth, result._radiiToTheFourth)
    Cartesian3.clone(ellipsoid._oneOverRadii, result._oneOverRadii)
    Cartesian3.clone(ellipsoid._oneOverRadiiSquared, result._oneOverRadiiSquared)
    result._minimumRadius = ellipsoid._minimumRadius
    result._maximumRadius = ellipsoid._maximumRadius
    result._centerToleranceSquared = ellipsoid._centerToleranceSquared
    result._squaredXOverSquaredZ = ellipsoid._squaredXOverSquaredZ

    return result
  }

  /**
   * 从半径向量创建。
   *
   * @param cartesian 半径
   * @param result 可选结果对象
   */
  static fromCartesian3(cartesian?: Cartesian3, result?: Ellipsoid): Ellipsoid {
    if (!defined(result)) {
      result = new Ellipsoid()
    }

    if (!defined(cartesian)) {
      return result
    }

    initialize(result, cartesian.x, cartesian.y, cartesian.z)
    return result
  }

  /**
   * 打包半径到数组。
   *
   * @param value 椭球
   * @param array 目标数组
   * @param startingIndex 起始下标
   */
  static pack(value: Ellipsoid, array: number[], startingIndex?: number): number[] {
    Check.typeOf.object("value", value)
    Check.defined("array", array)

    Cartesian3.pack(value._radii, array, startingIndex ?? 0)
    return array
  }

  /**
   * 从数组解包。
   *
   * @param array 打包数组
   * @param startingIndex 起始下标
   * @param result 可选结果对象
   */
  static unpack(array: number[], startingIndex?: number, result?: Ellipsoid): Ellipsoid {
    Check.defined("array", array)

    const radii = Cartesian3.unpack(array, startingIndex ?? 0)
    return Ellipsoid.fromCartesian3(radii, result)
  }

  /**
   * 复制本实例。
   *
   * @param result 可选结果对象
   */
  clone(result?: Ellipsoid): Ellipsoid {
    return Ellipsoid.clone(this, result)!
  }

  /**
   * 大地水准面法线（经纬高）。
   *
   * @param cartographic 经纬高
   * @param result 可选结果对象
   */
  geodeticSurfaceNormalCartographic(cartographic: Cartographic, result?: Cartesian3): Cartesian3 {
    Check.typeOf.object("cartographic", cartographic)

    const longitude = cartographic.longitude
    const latitude = cartographic.latitude
    const cosLatitude = Math.cos(latitude)

    const x = cosLatitude * Math.cos(longitude)
    const y = cosLatitude * Math.sin(longitude)
    const z = Math.sin(latitude)

    if (!defined(result)) {
      result = new Cartesian3()
    }
    result.x = x
    result.y = y
    result.z = z
    return Cartesian3.normalize(result, result)
  }

  /**
   * 大地水准面法线（笛卡尔）。中心点返回 undefined。
   *
   * @param cartesian ECEF 位置
   * @param result 可选结果对象
   */
  geodeticSurfaceNormal(cartesian: Cartesian3, result?: Cartesian3): Cartesian3 | undefined {
    Check.typeOf.object("cartesian", cartesian)
    if (isNaN(cartesian.x) || isNaN(cartesian.y) || isNaN(cartesian.z)) {
      throw new DeveloperError("cartesian has a NaN component")
    }
    if (Cartesian3.equalsEpsilon(cartesian, Cartesian3.ZERO, CesiumMath.EPSILON14)) {
      return undefined
    }
    if (!defined(result)) {
      result = new Cartesian3()
    }
    result = Cartesian3.multiplyComponents(cartesian, this._oneOverRadiiSquared, result)
    return Cartesian3.normalize(result, result)
  }

  /**
   * 经纬高转笛卡尔。
   *
   * @param cartographic 经纬高
   * @param result 可选结果对象
   */
  cartographicToCartesian(cartographic: Cartographic, result?: Cartesian3): Cartesian3 {
    const n = cartographicToCartesianNormal
    const k = cartographicToCartesianK
    this.geodeticSurfaceNormalCartographic(cartographic, n)
    Cartesian3.multiplyComponents(this._radiiSquared, n, k)
    const gamma = Math.sqrt(Cartesian3.dot(n, k))
    Cartesian3.divideByScalar(k, gamma, k)
    Cartesian3.multiplyByScalar(n, cartographic.height, n)

    if (!defined(result)) {
      result = new Cartesian3()
    }
    return Cartesian3.add(k, n, result)
  }

  /**
   * 批量经纬高转笛卡尔。
   *
   * @param cartographics 经纬高数组
   * @param result 可选结果数组
   */
  cartographicArrayToCartesianArray(
    cartographics: Cartographic[],
    result?: Cartesian3[],
  ): Cartesian3[] {
    Check.defined("cartographics", cartographics)

    const length = cartographics.length
    if (!defined(result)) {
      result = new Array<Cartesian3>(length)
    } else {
      result.length = length
    }
    for (let i = 0; i < length; i++) {
      const existing = result[i]
      result[i] = this.cartographicToCartesian(
        cartographics[i]!,
        defined(existing) ? existing : undefined,
      )
    }
    return result
  }

  /**
   * 笛卡尔转经纬高。中心点返回 undefined。
   *
   * @param cartesian ECEF 位置
   * @param result 可选结果对象
   */
  cartesianToCartographic(cartesian: Cartesian3, result?: Cartographic): Cartographic | undefined {
    const p = this.scaleToGeodeticSurface(cartesian, cartesianToCartographicP)

    if (!defined(p)) {
      return undefined
    }

    const n = this.geodeticSurfaceNormal(p, cartesianToCartographicN)!
    const h = Cartesian3.subtract(cartesian, p, cartesianToCartographicH)

    const longitude = Math.atan2(n.y, n.x)
    const latitude = Math.asin(n.z)
    const height = CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h)

    if (!defined(result)) {
      return new Cartographic(longitude, latitude, height)
    }
    result.longitude = longitude
    result.latitude = latitude
    result.height = height
    return result
  }

  /**
   * 批量笛卡尔转经纬高。
   *
   * @param cartesians ECEF 数组
   * @param result 可选结果数组
   */
  cartesianArrayToCartographicArray(
    cartesians: Cartesian3[],
    result?: (Cartographic | undefined)[],
  ): (Cartographic | undefined)[] {
    Check.defined("cartesians", cartesians)

    const length = cartesians.length
    if (!defined(result)) {
      result = new Array<Cartographic | undefined>(length)
    } else {
      result.length = length
    }
    for (let i = 0; i < length; ++i) {
      const existing = result[i]
      result[i] = this.cartesianToCartographic(
        cartesians[i]!,
        defined(existing) ? existing : undefined,
      )
    }
    return result
  }

  /**
   * 沿大地水准面法线缩放到椭球面。
   *
   * @param cartesian ECEF 位置
   * @param result 可选结果对象
   */
  scaleToGeodeticSurface(cartesian: Cartesian3, result?: Cartesian3): Cartesian3 | undefined {
    return scaleToGeodeticSurface(
      cartesian,
      this._oneOverRadii,
      this._oneOverRadiiSquared,
      this._centerToleranceSquared,
      result,
    )
  }

  /**
   * 沿地心法线缩放到椭球面。
   *
   * @param cartesian ECEF 位置
   * @param result 可选结果对象
   */
  scaleToGeocentricSurface(cartesian: Cartesian3, result?: Cartesian3): Cartesian3 {
    Check.typeOf.object("cartesian", cartesian)

    if (!defined(result)) {
      result = new Cartesian3()
    }

    const positionX = cartesian.x
    const positionY = cartesian.y
    const positionZ = cartesian.z
    const oneOverRadiiSquared = this._oneOverRadiiSquared

    const beta =
      1.0 /
      Math.sqrt(
        positionX * positionX * oneOverRadiiSquared.x +
          positionY * positionY * oneOverRadiiSquared.y +
          positionZ * positionZ * oneOverRadiiSquared.z,
      )

    return Cartesian3.multiplyByScalar(cartesian, beta, result)
  }

  /**
   * 乘以 oneOverRadii，变换到缩放空间。
   *
   * @param position ECEF 位置
   * @param result 可选结果对象
   */
  transformPositionToScaledSpace(position: Cartesian3, result?: Cartesian3): Cartesian3 {
    if (!defined(result)) {
      result = new Cartesian3()
    }
    return Cartesian3.multiplyComponents(position, this._oneOverRadii, result)
  }

  /**
   * 乘以 radii，从缩放空间还原。
   *
   * @param position 缩放空间位置
   * @param result 可选结果对象
   */
  transformPositionFromScaledSpace(position: Cartesian3, result?: Cartesian3): Cartesian3 {
    if (!defined(result)) {
      result = new Cartesian3()
    }
    return Cartesian3.multiplyComponents(position, this._radii, result)
  }

  /**
   * 半径分量相等。
   *
   * @param right 另一椭球
   */
  equals(right?: Ellipsoid): boolean {
    return this === right || (defined(right) && Cartesian3.equals(this._radii, right._radii))
  }

  /**
   * `(radii.x, radii.y, radii.z)` 字符串。
   */
  toString(): string {
    return this._radii.toString()
  }

  /**
   * 表面法线与 z 轴的交点（旋转椭球）。
   *
   * @param position 椭球面上的点
   * @param buffer 与椭球尺寸比较时的缓冲
   * @param result 可选结果对象
   */
  getSurfaceNormalIntersectionWithZAxis(
    position: Cartesian3,
    buffer?: number,
    result?: Cartesian3,
  ): Cartesian3 | undefined {
    Check.typeOf.object("position", position)

    if (!CesiumMath.equalsEpsilon(this._radii.x, this._radii.y, CesiumMath.EPSILON15)) {
      throw new DeveloperError("Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)")
    }

    Check.typeOf.number.greaterThan("Ellipsoid.radii.z", this._radii.z, 0)

    const nextBuffer = buffer ?? 0.0
    const squaredXOverSquaredZ = this._squaredXOverSquaredZ!

    if (!defined(result)) {
      result = new Cartesian3()
    }

    result.x = 0.0
    result.y = 0.0
    result.z = position.z * (1 - squaredXOverSquaredZ)

    if (Math.abs(result.z) >= this._radii.z - nextBuffer) {
      return undefined
    }

    return result
  }

  /**
   * 表面曲率（东向 / 北向）。
   *
   * @param surfacePosition 椭球面位置
   * @param result 可选结果对象
   */
  getLocalCurvature(surfacePosition: Cartesian3, result?: Cartesian2): Cartesian2 {
    Check.typeOf.object("surfacePosition", surfacePosition)

    if (!defined(result)) {
      result = new Cartesian2()
    }

    const primeVerticalEndpoint = this.getSurfaceNormalIntersectionWithZAxis(
      surfacePosition,
      0.0,
      scratchEndpoint,
    )!
    const primeVerticalRadius = Cartesian3.distance(surfacePosition, primeVerticalEndpoint)
    const radiusRatio = (this.minimumRadius * primeVerticalRadius) / this.maximumRadius ** 2
    const meridionalRadius = primeVerticalRadius * radiusRatio ** 2

    return Cartesian2.fromElements(1.0 / primeVerticalRadius, 1.0 / meridionalRadius, result)
  }

  /**
   * 矩形在椭球面的近似面积（Gauss-Legendre 10 阶）。
   *
   * @param rectangle 经纬矩形
   */
  surfaceArea(rectangle: Rectangle): number {
    Check.typeOf.object("rectangle", rectangle)
    const minLongitude = rectangle.west
    let maxLongitude = rectangle.east
    const minLatitude = rectangle.south
    const maxLatitude = rectangle.north

    while (maxLongitude < minLongitude) {
      maxLongitude += CesiumMath.TWO_PI
    }

    const radiiSquared = this._radiiSquared
    const a2 = radiiSquared.x
    const b2 = radiiSquared.y
    const c2 = radiiSquared.z
    const a2b2 = a2 * b2
    return gaussLegendreQuadrature(minLatitude, maxLatitude, (lat) => {
      const sinPhi = Math.cos(lat)
      const cosPhi = Math.sin(lat)
      return (
        Math.cos(lat) *
        gaussLegendreQuadrature(minLongitude, maxLongitude, (lon) => {
          const cosTheta = Math.cos(lon)
          const sinTheta = Math.sin(lon)
          return Math.sqrt(
            a2b2 * cosPhi * cosPhi +
              c2 * (b2 * cosTheta * cosTheta + a2 * sinTheta * sinTheta) * sinPhi * sinPhi,
          )
        })
      )
    })
  }

  /**
   * 从中心指向笛卡尔点的单位向量（地心法线）。
   *
   * @param cartesian ECEF 位置
   * @param result 可选结果对象
   */
  geocentricSurfaceNormal(cartesian: Cartesian3, result?: Cartesian3): Cartesian3 {
    if (!defined(result)) {
      result = new Cartesian3()
    }
    return Cartesian3.normalize(cartesian, result)
  }
}
