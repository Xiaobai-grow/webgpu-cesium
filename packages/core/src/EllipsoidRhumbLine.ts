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
import { DeveloperError } from "./DeveloperError"
import { Ellipsoid } from "./Ellipsoid"
import { CesiumMath } from "./CesiumMath"

const scratchCart1 = new Cartesian3()
const scratchCart2 = new Cartesian3()

/**
 * 子午弧长 M(φ)。
 *
 * @param ellipticity 第一偏心率
 * @param major 长半轴
 * @param latitude 纬度
 */
function calculateM(ellipticity: number, major: number, latitude: number): number {
  if (ellipticity === 0.0) {
    return major * latitude
  }

  const e2 = ellipticity * ellipticity
  const e4 = e2 * e2
  const e6 = e4 * e2
  const e8 = e6 * e2
  const e10 = e8 * e2
  const e12 = e10 * e2
  const phi = latitude
  const sin2Phi = Math.sin(2 * phi)
  const sin4Phi = Math.sin(4 * phi)
  const sin6Phi = Math.sin(6 * phi)
  const sin8Phi = Math.sin(8 * phi)
  const sin10Phi = Math.sin(10 * phi)
  const sin12Phi = Math.sin(12 * phi)

  return (
    major *
    ((1 -
      e2 / 4 -
      (3 * e4) / 64 -
      (5 * e6) / 256 -
      (175 * e8) / 16384 -
      (441 * e10) / 65536 -
      (4851 * e12) / 1048576) *
      phi -
      ((3 * e2) / 8 +
        (3 * e4) / 32 +
        (45 * e6) / 1024 +
        (105 * e8) / 4096 +
        (2205 * e10) / 131072 +
        (6237 * e12) / 524288) *
        sin2Phi +
      ((15 * e4) / 256 +
        (45 * e6) / 1024 +
        (525 * e8) / 16384 +
        (1575 * e10) / 65536 +
        (155925 * e12) / 8388608) *
        sin4Phi -
      ((35 * e6) / 3072 + (175 * e8) / 12288 + (3675 * e10) / 262144 + (13475 * e12) / 1048576) *
        sin6Phi +
      ((315 * e8) / 131072 + (2205 * e10) / 524288 + (43659 * e12) / 8388608) * sin8Phi -
      ((693 * e10) / 1310720 + (6237 * e12) / 5242880) * sin10Phi +
      ((1001 * e12) / 8388608) * sin12Phi)
  )
}

/**
 * 子午弧长反函数 φ(M)。
 *
 * @param M 弧长
 * @param ellipticity 第一偏心率
 * @param major 长半轴
 */
function calculateInverseM(M: number, ellipticity: number, major: number): number {
  const d = M / major

  if (ellipticity === 0.0) {
    return d
  }

  const d2 = d * d
  const d3 = d2 * d
  const d4 = d3 * d
  const e = ellipticity
  const e2 = e * e
  const e4 = e2 * e2
  const e6 = e4 * e2
  const e8 = e6 * e2
  const e10 = e8 * e2
  const e12 = e10 * e2
  const sin2D = Math.sin(2 * d)
  const cos2D = Math.cos(2 * d)
  const sin4D = Math.sin(4 * d)
  const cos4D = Math.cos(4 * d)
  const sin6D = Math.sin(6 * d)
  const cos6D = Math.cos(6 * d)
  const sin8D = Math.sin(8 * d)
  const cos8D = Math.cos(8 * d)
  const sin10D = Math.sin(10 * d)
  const cos10D = Math.cos(10 * d)
  const sin12D = Math.sin(12 * d)

  return (
    d +
    (d * e2) / 4 +
    (7 * d * e4) / 64 +
    (15 * d * e6) / 256 +
    (579 * d * e8) / 16384 +
    (1515 * d * e10) / 65536 +
    (16837 * d * e12) / 1048576 +
    ((3 * d * e4) / 16 +
      (45 * d * e6) / 256 -
      (d * (32 * d2 - 561) * e8) / 4096 -
      (d * (232 * d2 - 1677) * e10) / 16384 +
      (d * (399985 - 90560 * d2 + 512 * d4) * e12) / 5242880) *
      cos2D +
    ((21 * d * e6) / 256 +
      (483 * d * e8) / 4096 -
      (d * (224 * d2 - 1969) * e10) / 16384 -
      (d * (33152 * d2 - 112599) * e12) / 1048576) *
      cos4D +
    ((151 * d * e8) / 4096 +
      (4681 * d * e10) / 65536 +
      (1479 * d * e12) / 16384 -
      (453 * d3 * e12) / 32768) *
      cos6D +
    ((1097 * d * e10) / 65536 + (42783 * d * e12) / 1048576) * cos8D +
    ((8011 * d * e12) / 1048576) * cos10D +
    ((3 * e2) / 8 +
      (3 * e4) / 16 +
      (213 * e6) / 2048 -
      (3 * d2 * e6) / 64 +
      (255 * e8) / 4096 -
      (33 * d2 * e8) / 512 +
      (20861 * e10) / 524288 -
      (33 * d2 * e10) / 512 +
      (d4 * e10) / 1024 +
      (28273 * e12) / 1048576 -
      (471 * d2 * e12) / 8192 +
      (9 * d4 * e12) / 4096) *
      sin2D +
    ((21 * e4) / 256 +
      (21 * e6) / 256 +
      (533 * e8) / 8192 -
      (21 * d2 * e8) / 512 +
      (197 * e10) / 4096 -
      (315 * d2 * e10) / 4096 +
      (584039 * e12) / 16777216 -
      (12517 * d2 * e12) / 131072 +
      (7 * d4 * e12) / 2048) *
      sin4D +
    ((151 * e6) / 6144 +
      (151 * e8) / 4096 +
      (5019 * e10) / 131072 -
      (453 * d2 * e10) / 16384 +
      (26965 * e12) / 786432 -
      (8607 * d2 * e12) / 131072) *
      sin6D +
    ((1097 * e8) / 131072 +
      (1097 * e10) / 65536 +
      (225797 * e12) / 10485760 -
      (1097 * d2 * e12) / 65536) *
      sin8D +
    ((8011 * e10) / 2621440 + (8011 * e12) / 1048576) * sin10D +
    ((293393 * e12) / 251658240) * sin12D
  )
}

/**
 * 等角纬度（isometric latitude）σ。
 *
 * @param ellipticity 第一偏心率
 * @param latitude 纬度
 */
function calculateSigma(ellipticity: number, latitude: number): number {
  if (ellipticity === 0.0) {
    return Math.log(Math.tan(0.5 * (CesiumMath.PI_OVER_TWO + latitude)))
  }

  const eSinL = ellipticity * Math.sin(latitude)
  return (
    Math.log(Math.tan(0.5 * (CesiumMath.PI_OVER_TWO + latitude))) -
    (ellipticity / 2.0) * Math.log((1 + eSinL) / (1 - eSinL))
  )
}

/**
 * 恒向线方位角。
 */
function calculateHeading(
  ellipsoidRhumbLine: EllipsoidRhumbLine,
  firstLongitude: number,
  firstLatitude: number,
  secondLongitude: number,
  secondLatitude: number,
): number {
  const sigma1 = calculateSigma(ellipsoidRhumbLine._ellipticity!, firstLatitude)
  const sigma2 = calculateSigma(ellipsoidRhumbLine._ellipticity!, secondLatitude)
  return Math.atan2(CesiumMath.negativePiToPi(secondLongitude - firstLongitude), sigma2 - sigma1)
}

/**
 * 恒向线弧长。
 */
function calculateArcLength(
  ellipsoidRhumbLine: EllipsoidRhumbLine,
  major: number,
  minor: number,
  firstLongitude: number,
  firstLatitude: number,
  secondLongitude: number,
  secondLatitude: number,
): number {
  const heading = ellipsoidRhumbLine._heading!
  const deltaLongitude = secondLongitude - firstLongitude

  let distance: number

  if (CesiumMath.equalsEpsilon(Math.abs(heading), CesiumMath.PI_OVER_TWO, CesiumMath.EPSILON8)) {
    if (major === minor) {
      distance = major * Math.cos(firstLatitude) * CesiumMath.negativePiToPi(deltaLongitude)
    } else {
      const sinPhi = Math.sin(firstLatitude)
      distance =
        (major * Math.cos(firstLatitude) * CesiumMath.negativePiToPi(deltaLongitude)) /
        Math.sqrt(1 - ellipsoidRhumbLine._ellipticitySquared! * sinPhi * sinPhi)
    }
  } else {
    const M1 = calculateM(ellipsoidRhumbLine._ellipticity!, major, firstLatitude)
    const M2 = calculateM(ellipsoidRhumbLine._ellipticity!, major, secondLatitude)
    distance = (M2 - M1) / Math.cos(heading)
  }
  return Math.abs(distance)
}

/**
 * 根据起终点计算恒向线属性。
 */
function computeProperties(
  ellipsoidRhumbLine: EllipsoidRhumbLine,
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

  const major = ellipsoid.maximumRadius
  const minor = ellipsoid.minimumRadius
  const majorSquared = major * major
  const minorSquared = minor * minor
  ellipsoidRhumbLine._ellipticitySquared = (majorSquared - minorSquared) / majorSquared
  ellipsoidRhumbLine._ellipticity = Math.sqrt(ellipsoidRhumbLine._ellipticitySquared)

  Cartographic.clone(start, ellipsoidRhumbLine._start)
  ellipsoidRhumbLine._start.height = 0

  Cartographic.clone(end, ellipsoidRhumbLine._end)
  ellipsoidRhumbLine._end.height = 0

  ellipsoidRhumbLine._heading = calculateHeading(
    ellipsoidRhumbLine,
    start.longitude,
    start.latitude,
    end.longitude,
    end.latitude,
  )
  ellipsoidRhumbLine._distance = calculateArcLength(
    ellipsoidRhumbLine,
    ellipsoid.maximumRadius,
    ellipsoid.minimumRadius,
    start.longitude,
    start.latitude,
    end.longitude,
    end.latitude,
  )
}

/**
 * 从起点沿方位角走给定距离。
 */
function interpolateUsingSurfaceDistance(
  start: Cartographic,
  heading: number,
  distance: number,
  major: number,
  ellipticity: number,
  result?: Cartographic,
): Cartographic {
  if (distance === 0.0) {
    return Cartographic.clone(start, result)!
  }

  const ellipticitySquared = ellipticity * ellipticity

  let longitude: number
  let latitude: number
  let deltaLongitude: number

  if (Math.abs(CesiumMath.PI_OVER_TWO - Math.abs(heading)) > CesiumMath.EPSILON8) {
    const M1 = calculateM(ellipticity, major, start.latitude)
    const deltaM = distance * Math.cos(heading)
    const M2 = M1 + deltaM
    latitude = calculateInverseM(M2, ellipticity, major)

    if (Math.abs(heading) < CesiumMath.EPSILON10) {
      longitude = CesiumMath.negativePiToPi(start.longitude)
    } else {
      const sigma1 = calculateSigma(ellipticity, start.latitude)
      const sigma2 = calculateSigma(ellipticity, latitude)
      deltaLongitude = Math.tan(heading) * (sigma2 - sigma1)
      longitude = CesiumMath.negativePiToPi(start.longitude + deltaLongitude)
    }
  } else {
    latitude = start.latitude
    let localRad: number

    if (ellipticity === 0.0) {
      localRad = major * Math.cos(start.latitude)
    } else {
      const sinPhi = Math.sin(start.latitude)
      localRad =
        (major * Math.cos(start.latitude)) / Math.sqrt(1 - ellipticitySquared * sinPhi * sinPhi)
    }

    deltaLongitude = distance / localRad
    if (heading > 0.0) {
      longitude = CesiumMath.negativePiToPi(start.longitude + deltaLongitude)
    } else {
      longitude = CesiumMath.negativePiToPi(start.longitude - deltaLongitude)
    }
  }

  if (defined(result)) {
    result.longitude = longitude
    result.latitude = latitude
    result.height = 0
    return result
  }

  return new Cartographic(longitude, latitude, 0)
}

/**
 * 椭球上的恒向线。
 * 对标 Cesium `Core/EllipsoidRhumbLine.js`。
 */
export class EllipsoidRhumbLine {
  readonly _ellipsoid: Ellipsoid
  readonly _start: Cartographic
  readonly _end: Cartographic
  _heading: number | undefined
  _distance: number | undefined
  _ellipticity: number | undefined
  _ellipticitySquared: number | undefined

  /**
   * @param start 起点
   * @param end 终点
   * @param ellipsoid 椭球
   */
  constructor(start?: Cartographic, end?: Cartographic, ellipsoid?: Ellipsoid) {
    const nextEllipsoid = ellipsoid ?? Ellipsoid.default
    this._ellipsoid = nextEllipsoid
    this._start = new Cartographic()
    this._end = new Cartographic()
    this._heading = undefined
    this._distance = undefined
    this._ellipticity = undefined
    this._ellipticitySquared = undefined

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

  /** 方位角 */
  get heading(): number {
    Check.defined("distance", this._distance)
    return this._heading!
  }

  /**
   * 由起点、方位角与距离创建恒向线。
   *
   * @param start 起点
   * @param heading 方位角
   * @param distance 距离
   * @param ellipsoid 椭球
   * @param result 可选结果对象
   */
  static fromStartHeadingDistance(
    start: Cartographic,
    heading: number,
    distance: number,
    ellipsoid?: Ellipsoid,
    result?: EllipsoidRhumbLine,
  ): EllipsoidRhumbLine {
    Check.defined("start", start)
    Check.defined("heading", heading)
    Check.defined("distance", distance)
    Check.typeOf.number.greaterThan("distance", distance, 0.0)

    const nextEllipsoid = ellipsoid ?? Ellipsoid.default
    const major = nextEllipsoid.maximumRadius
    const minor = nextEllipsoid.minimumRadius
    const majorSquared = major * major
    const minorSquared = minor * minor
    const ellipticity = Math.sqrt((majorSquared - minorSquared) / majorSquared)

    const nextHeading = CesiumMath.negativePiToPi(heading)
    const end = interpolateUsingSurfaceDistance(
      start,
      nextHeading,
      distance,
      nextEllipsoid.maximumRadius,
      ellipticity,
    )

    if (!defined(result) || (defined(ellipsoid) && !ellipsoid.equals(result.ellipsoid))) {
      return new EllipsoidRhumbLine(start, end, nextEllipsoid)
    }

    result.setEndPoints(start, end)
    return result
  }

  /**
   * 设置起终点。
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
    return this.interpolateUsingSurfaceDistance(fraction * this._distance!, result)
  }

  /**
   * 按表面距离插值。
   *
   * @param distance 距起点的表面距离
   * @param result 可选结果对象
   */
  interpolateUsingSurfaceDistance(distance: number, result?: Cartographic): Cartographic {
    Check.typeOf.number("distance", distance)
    if (!defined(this._distance) || this._distance === 0.0) {
      throw new DeveloperError("EllipsoidRhumbLine must have distinct start and end set.")
    }

    return interpolateUsingSurfaceDistance(
      this._start,
      this._heading!,
      distance,
      this._ellipsoid.maximumRadius,
      this._ellipticity!,
      result,
    )
  }

  /**
   * 与给定经线的交点。
   *
   * @param intersectionLongitude 经度
   * @param result 可选结果对象
   */
  findIntersectionWithLongitude(
    intersectionLongitude: number,
    result?: Cartographic,
  ): Cartographic | undefined {
    Check.typeOf.number("intersectionLongitude", intersectionLongitude)
    if (!defined(this._distance) || this._distance === 0.0) {
      throw new DeveloperError("EllipsoidRhumbLine must have distinct start and end set.")
    }

    const ellipticity = this._ellipticity!
    const heading = this._heading!
    const absHeading = Math.abs(heading)
    const start = this._start

    let nextLongitude = CesiumMath.negativePiToPi(intersectionLongitude)

    if (CesiumMath.equalsEpsilon(Math.abs(nextLongitude), Math.PI, CesiumMath.EPSILON14)) {
      nextLongitude = CesiumMath.sign(start.longitude) * Math.PI
    }

    if (!defined(result)) {
      result = new Cartographic()
    }

    if (Math.abs(CesiumMath.PI_OVER_TWO - absHeading) <= CesiumMath.EPSILON8) {
      result.longitude = nextLongitude
      result.latitude = start.latitude
      result.height = 0
      return result
    } else if (
      CesiumMath.equalsEpsilon(
        Math.abs(CesiumMath.PI_OVER_TWO - absHeading),
        CesiumMath.PI_OVER_TWO,
        CesiumMath.EPSILON8,
      )
    ) {
      if (CesiumMath.equalsEpsilon(nextLongitude, start.longitude, CesiumMath.EPSILON12)) {
        return undefined
      }

      result.longitude = nextLongitude
      result.latitude = CesiumMath.PI_OVER_TWO * CesiumMath.sign(CesiumMath.PI_OVER_TWO - heading)
      result.height = 0
      return result
    }

    const phi1 = start.latitude
    const eSinPhi1 = ellipticity * Math.sin(phi1)
    const leftComponent =
      Math.tan(0.5 * (CesiumMath.PI_OVER_TWO + phi1)) *
      Math.exp((nextLongitude - start.longitude) / Math.tan(heading))
    const denominator = (1 + eSinPhi1) / (1 - eSinPhi1)

    let newPhi = start.latitude
    let phi: number
    do {
      phi = newPhi
      const eSinPhi = ellipticity * Math.sin(phi)
      const numerator = (1 + eSinPhi) / (1 - eSinPhi)
      newPhi =
        2 * Math.atan(leftComponent * Math.pow(numerator / denominator, ellipticity / 2)) -
        CesiumMath.PI_OVER_TWO
    } while (!CesiumMath.equalsEpsilon(newPhi, phi, CesiumMath.EPSILON12))

    result.longitude = nextLongitude
    result.latitude = newPhi
    result.height = 0
    return result
  }

  /**
   * 与给定纬线的交点。
   *
   * @param intersectionLatitude 纬度
   * @param result 可选结果对象
   */
  findIntersectionWithLatitude(
    intersectionLatitude: number,
    result?: Cartographic,
  ): Cartographic | undefined {
    Check.typeOf.number("intersectionLatitude", intersectionLatitude)
    if (!defined(this._distance) || this._distance === 0.0) {
      throw new DeveloperError("EllipsoidRhumbLine must have distinct start and end set.")
    }

    const ellipticity = this._ellipticity!
    const heading = this._heading!
    const start = this._start

    if (CesiumMath.equalsEpsilon(Math.abs(heading), CesiumMath.PI_OVER_TWO, CesiumMath.EPSILON8)) {
      return undefined
    }

    const sigma1 = calculateSigma(ellipticity, start.latitude)
    const sigma2 = calculateSigma(ellipticity, intersectionLatitude)
    const deltaLongitude = Math.tan(heading) * (sigma2 - sigma1)
    const longitude = CesiumMath.negativePiToPi(start.longitude + deltaLongitude)

    if (defined(result)) {
      result.longitude = longitude
      result.latitude = intersectionLatitude
      result.height = 0
      return result
    }

    return new Cartographic(longitude, intersectionLatitude, 0)
  }
}
