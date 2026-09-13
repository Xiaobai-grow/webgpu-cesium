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
import { CesiumMath } from "./CesiumMath"

/** Vincenty 正反算缓存常量 */
interface GeodesicConstants {
  a: number
  b: number
  f: number
  cosineHeading: number
  sineHeading: number
  tanU: number
  cosineU: number
  sineU: number
  sigma: number
  sineAlpha: number
  sineSquaredAlpha: number
  cosineSquaredAlpha: number
  cosineAlpha: number
  u2Over4: number
  u4Over16: number
  u6Over64: number
  u8Over256: number
  a0: number
  a1: number
  a2: number
  a3: number
  distanceRatio: number
}

const scratchCart1 = new Cartesian3()
const scratchCart2 = new Cartesian3()

/**
 * 写入 Vincenty 正算常数。
 *
 * @param ellipsoidGeodesic 测地线
 */
function setConstants(ellipsoidGeodesic: EllipsoidGeodesic): void {
  const uSquared = ellipsoidGeodesic._uSquared!
  const a = ellipsoidGeodesic._ellipsoid.maximumRadius
  const b = ellipsoidGeodesic._ellipsoid.minimumRadius
  const f = (a - b) / a

  const cosineHeading = Math.cos(ellipsoidGeodesic._startHeading!)
  const sineHeading = Math.sin(ellipsoidGeodesic._startHeading!)

  const tanU = (1 - f) * Math.tan(ellipsoidGeodesic._start.latitude)

  const cosineU = 1.0 / Math.sqrt(1.0 + tanU * tanU)
  const sineU = cosineU * tanU

  const sigma = Math.atan2(tanU, cosineHeading)

  const sineAlpha = cosineU * sineHeading
  const sineSquaredAlpha = sineAlpha * sineAlpha

  const cosineSquaredAlpha = 1.0 - sineSquaredAlpha
  const cosineAlpha = Math.sqrt(cosineSquaredAlpha)

  const u2Over4 = uSquared / 4.0
  const u4Over16 = u2Over4 * u2Over4
  const u6Over64 = u4Over16 * u2Over4
  const u8Over256 = u4Over16 * u4Over16

  const a0 =
    1.0 + u2Over4 - (3.0 * u4Over16) / 4.0 + (5.0 * u6Over64) / 4.0 - (175.0 * u8Over256) / 64.0
  const a1 = 1.0 - u2Over4 + (15.0 * u4Over16) / 8.0 - (35.0 * u6Over64) / 8.0
  const a2 = 1.0 - 3.0 * u2Over4 + (35.0 * u4Over16) / 4.0
  const a3 = 1.0 - 5.0 * u2Over4

  const distanceRatio =
    a0 * sigma -
    (a1 * Math.sin(2.0 * sigma) * u2Over4) / 2.0 -
    (a2 * Math.sin(4.0 * sigma) * u4Over16) / 16.0 -
    (a3 * Math.sin(6.0 * sigma) * u6Over64) / 48.0 -
    (Math.sin(8.0 * sigma) * 5.0 * u8Over256) / 512

  const constants = ellipsoidGeodesic._constants
  constants.a = a
  constants.b = b
  constants.f = f
  constants.cosineHeading = cosineHeading
  constants.sineHeading = sineHeading
  constants.tanU = tanU
  constants.cosineU = cosineU
  constants.sineU = sineU
  constants.sigma = sigma
  constants.sineAlpha = sineAlpha
  constants.sineSquaredAlpha = sineSquaredAlpha
  constants.cosineSquaredAlpha = cosineSquaredAlpha
  constants.cosineAlpha = cosineAlpha
  constants.u2Over4 = u2Over4
  constants.u4Over16 = u4Over16
  constants.u6Over64 = u6Over64
  constants.u8Over256 = u8Over256
  constants.a0 = a0
  constants.a1 = a1
  constants.a2 = a2
  constants.a3 = a3
  constants.distanceRatio = distanceRatio
}

/**
 * Vincenty 经差改正系数 C。
 *
 * @param f 扁率
 * @param cosineSquaredAlpha cos²α
 */
function computeC(f: number, cosineSquaredAlpha: number): number {
  return (f * cosineSquaredAlpha * (4.0 + f * (4.0 - 3.0 * cosineSquaredAlpha))) / 16.0
}

/**
 * Vincenty 经差迭代项。
 */
function computeDeltaLambda(
  f: number,
  sineAlpha: number,
  cosineSquaredAlpha: number,
  sigma: number,
  sineSigma: number,
  cosineSigma: number,
  cosineTwiceSigmaMidpoint: number,
): number {
  const C = computeC(f, cosineSquaredAlpha)

  return (
    (1.0 - C) *
    f *
    sineAlpha *
    (sigma +
      C *
        sineSigma *
        (cosineTwiceSigmaMidpoint +
          C * cosineSigma * (2.0 * cosineTwiceSigmaMidpoint * cosineTwiceSigmaMidpoint - 1.0)))
  )
}

/**
 * Vincenty 反算：距离与起终点方位角。
 */
function vincentyInverseFormula(
  ellipsoidGeodesic: EllipsoidGeodesic,
  major: number,
  minor: number,
  firstLongitude: number,
  firstLatitude: number,
  secondLongitude: number,
  secondLatitude: number,
): void {
  const eff = (major - minor) / major
  const l = secondLongitude - firstLongitude

  const u1 = Math.atan((1 - eff) * Math.tan(firstLatitude))
  const u2 = Math.atan((1 - eff) * Math.tan(secondLatitude))

  const cosineU1 = Math.cos(u1)
  const sineU1 = Math.sin(u1)
  const cosineU2 = Math.cos(u2)
  const sineU2 = Math.sin(u2)

  const cc = cosineU1 * cosineU2
  const cs = cosineU1 * sineU2
  const ss = sineU1 * sineU2
  const sc = sineU1 * cosineU2

  let lambda = l
  let lambdaDot: number

  let cosineLambda: number
  let sineLambda: number

  let sigma: number
  let cosineSigma: number
  let sineSigma: number
  let cosineSquaredAlpha: number
  let cosineTwiceSigmaMidpoint: number

  do {
    cosineLambda = Math.cos(lambda)
    sineLambda = Math.sin(lambda)

    const temp = cs - sc * cosineLambda
    sineSigma = Math.sqrt(cosineU2 * cosineU2 * sineLambda * sineLambda + temp * temp)
    cosineSigma = ss + cc * cosineLambda

    sigma = Math.atan2(sineSigma, cosineSigma)

    let sineAlpha: number

    if (sineSigma === 0.0) {
      sineAlpha = 0.0
      cosineSquaredAlpha = 1.0
    } else {
      sineAlpha = (cc * sineLambda) / sineSigma
      cosineSquaredAlpha = 1.0 - sineAlpha * sineAlpha
    }

    lambdaDot = lambda

    cosineTwiceSigmaMidpoint = cosineSigma - (2.0 * ss) / cosineSquaredAlpha

    if (!isFinite(cosineTwiceSigmaMidpoint)) {
      cosineTwiceSigmaMidpoint = 0.0
    }

    lambda =
      l +
      computeDeltaLambda(
        eff,
        sineAlpha,
        cosineSquaredAlpha,
        sigma,
        sineSigma,
        cosineSigma,
        cosineTwiceSigmaMidpoint,
      )
  } while (Math.abs(lambda - lambdaDot) > CesiumMath.EPSILON12)

  const uSquared = (cosineSquaredAlpha * (major * major - minor * minor)) / (minor * minor)
  const A =
    1.0 +
    (uSquared * (4096.0 + uSquared * (uSquared * (320.0 - 175.0 * uSquared) - 768.0))) / 16384.0
  const B = (uSquared * (256.0 + uSquared * (uSquared * (74.0 - 47.0 * uSquared) - 128.0))) / 1024.0

  const cosineSquaredTwiceSigmaMidpoint = cosineTwiceSigmaMidpoint * cosineTwiceSigmaMidpoint
  const deltaSigma =
    B *
    sineSigma *
    (cosineTwiceSigmaMidpoint +
      (B *
        (cosineSigma * (2.0 * cosineSquaredTwiceSigmaMidpoint - 1.0) -
          (B *
            cosineTwiceSigmaMidpoint *
            (4.0 * sineSigma * sineSigma - 3.0) *
            (4.0 * cosineSquaredTwiceSigmaMidpoint - 3.0)) /
            6.0)) /
        4.0)

  const distance = minor * A * (sigma - deltaSigma)

  const startHeading = Math.atan2(cosineU2 * sineLambda, cs - sc * cosineLambda)
  const endHeading = Math.atan2(cosineU1 * sineLambda, cs * cosineLambda - sc)

  ellipsoidGeodesic._distance = distance
  ellipsoidGeodesic._startHeading = startHeading
  ellipsoidGeodesic._endHeading = endHeading
  ellipsoidGeodesic._uSquared = uSquared
}

/**
 * 根据起终点计算测地线属性。
 */
function computeProperties(
  ellipsoidGeodesic: EllipsoidGeodesic,
  start: Cartographic,
  end: Cartographic,
  ellipsoid: Ellipsoid,
): void {
  const firstCartesian = Cartesian3.normalize(
    ellipsoid.cartographicToCartesian(start, scratchCart2),
    scratchCart1,
  )
  const lastCartesian = Cartesian3.normalize(
    ellipsoid.cartographicToCartesian(end, scratchCart2),
    scratchCart2,
  )

  Check.typeOf.number.greaterThanOrEquals(
    "value",
    Math.abs(Math.abs(Cartesian3.angleBetween(firstCartesian, lastCartesian)) - Math.PI),
    0.0125,
  )

  vincentyInverseFormula(
    ellipsoidGeodesic,
    ellipsoid.maximumRadius,
    ellipsoid.minimumRadius,
    start.longitude,
    start.latitude,
    end.longitude,
    end.latitude,
  )

  Cartographic.clone(start, ellipsoidGeodesic._start)
  Cartographic.clone(end, ellipsoidGeodesic._end)
  ellipsoidGeodesic._start.height = 0
  ellipsoidGeodesic._end.height = 0

  setConstants(ellipsoidGeodesic)
}

function createEmptyConstants(): GeodesicConstants {
  return {
    a: 0,
    b: 0,
    f: 0,
    cosineHeading: 0,
    sineHeading: 0,
    tanU: 0,
    cosineU: 0,
    sineU: 0,
    sigma: 0,
    sineAlpha: 0,
    sineSquaredAlpha: 0,
    cosineSquaredAlpha: 0,
    cosineAlpha: 0,
    u2Over4: 0,
    u4Over16: 0,
    u6Over64: 0,
    u8Over256: 0,
    a0: 0,
    a1: 0,
    a2: 0,
    a3: 0,
    distanceRatio: 0,
  }
}

/**
 * 椭球上连接两点的测地线（Vincenty）。
 * 对标 Cesium `Core/EllipsoidGeodesic.js`。
 */
export class EllipsoidGeodesic {
  readonly _ellipsoid: Ellipsoid
  readonly _start: Cartographic
  readonly _end: Cartographic
  readonly _constants: GeodesicConstants
  _startHeading: number | undefined
  _endHeading: number | undefined
  _distance: number | undefined
  _uSquared: number | undefined

  /**
   * @param start 起点经纬高
   * @param end 终点经纬高
   * @param ellipsoid 椭球
   */
  constructor(start?: Cartographic, end?: Cartographic, ellipsoid?: Ellipsoid) {
    const nextEllipsoid = ellipsoid ?? Ellipsoid.default
    this._ellipsoid = nextEllipsoid
    this._start = new Cartographic()
    this._end = new Cartographic()
    this._constants = createEmptyConstants()
    this._startHeading = undefined
    this._endHeading = undefined
    this._distance = undefined
    this._uSquared = undefined

    if (defined(start) && defined(end)) {
      computeProperties(this, start, end, nextEllipsoid)
    }
  }

  /** 椭球 */
  get ellipsoid(): Ellipsoid {
    return this._ellipsoid
  }

  /** 表面距离，米 */
  get surfaceDistance(): number {
    Check.defined("distance", this._distance)
    return this._distance!
  }

  /** 起点（高度为 0） */
  get start(): Cartographic {
    return this._start
  }

  /** 终点（高度为 0） */
  get end(): Cartographic {
    return this._end
  }

  /** 起点方位角 */
  get startHeading(): number {
    Check.defined("distance", this._distance)
    return this._startHeading!
  }

  /** 终点方位角 */
  get endHeading(): number {
    Check.defined("distance", this._distance)
    return this._endHeading!
  }

  /**
   * 设置测地线起终点。
   *
   * @param start 起点
   * @param end 终点
   */
  setEndPoints(start: Cartographic, end: Cartographic): void {
    Check.defined("start", start)
    Check.defined("end", end)
    computeProperties(this, start, end, this._ellipsoid)
  }

  /**
   * 按距离比例插值。
   *
   * @param fraction 比例
   * @param result 可选结果对象
   */
  interpolateUsingFraction(fraction: number, result?: Cartographic): Cartographic {
    return this.interpolateUsingSurfaceDistance(this._distance! * fraction, result)
  }

  /**
   * 按表面距离插值。
   *
   * @param distance 距起点的表面距离
   * @param result 可选结果对象
   */
  interpolateUsingSurfaceDistance(distance: number, result?: Cartographic): Cartographic {
    Check.defined("distance", this._distance)

    const constants = this._constants
    const s = constants.distanceRatio + distance / constants.b

    const cosine2S = Math.cos(2.0 * s)
    const cosine4S = Math.cos(4.0 * s)
    const cosine6S = Math.cos(6.0 * s)
    const sine2S = Math.sin(2.0 * s)
    const sine4S = Math.sin(4.0 * s)
    const sine6S = Math.sin(6.0 * s)
    const sine8S = Math.sin(8.0 * s)

    const s2 = s * s
    const s3 = s * s2

    const u8Over256 = constants.u8Over256
    const u2Over4 = constants.u2Over4
    const u6Over64 = constants.u6Over64
    const u4Over16 = constants.u4Over16
    let sigma =
      (2.0 * s3 * u8Over256 * cosine2S) / 3.0 +
      s *
        (1.0 -
          u2Over4 +
          (7.0 * u4Over16) / 4.0 -
          (15.0 * u6Over64) / 4.0 +
          (579.0 * u8Over256) / 64.0 -
          (u4Over16 - (15.0 * u6Over64) / 4.0 + (187.0 * u8Over256) / 16.0) * cosine2S -
          ((5.0 * u6Over64) / 4.0 - (115.0 * u8Over256) / 16.0) * cosine4S -
          (29.0 * u8Over256 * cosine6S) / 16.0) +
      (u2Over4 / 2.0 - u4Over16 + (71.0 * u6Over64) / 32.0 - (85.0 * u8Over256) / 16.0) * sine2S +
      ((5.0 * u4Over16) / 16.0 - (5.0 * u6Over64) / 4.0 + (383.0 * u8Over256) / 96.0) * sine4S -
      s2 * ((u6Over64 - (11.0 * u8Over256) / 2.0) * sine2S + (5.0 * u8Over256 * sine4S) / 2.0) +
      ((29.0 * u6Over64) / 96.0 - (29.0 * u8Over256) / 16.0) * sine6S +
      (539.0 * u8Over256 * sine8S) / 1536.0

    const theta = Math.asin(Math.sin(sigma) * constants.cosineAlpha)
    const latitude = Math.atan((constants.a / constants.b) * Math.tan(theta))

    sigma = sigma - constants.sigma

    const cosineTwiceSigmaMidpoint = Math.cos(2.0 * constants.sigma + sigma)
    const sineSigma = Math.sin(sigma)
    const cosineSigma = Math.cos(sigma)

    const cc = constants.cosineU * cosineSigma
    const ss = constants.sineU * sineSigma

    const lambda = Math.atan2(sineSigma * constants.sineHeading, cc - ss * constants.cosineHeading)

    const l =
      lambda -
      computeDeltaLambda(
        constants.f,
        constants.sineAlpha,
        constants.cosineSquaredAlpha,
        sigma,
        sineSigma,
        cosineSigma,
        cosineTwiceSigmaMidpoint,
      )

    if (defined(result)) {
      result.longitude = this._start.longitude + l
      result.latitude = latitude
      result.height = 0.0
      return result
    }

    return new Cartographic(this._start.longitude + l, latitude, 0.0)
  }
}
