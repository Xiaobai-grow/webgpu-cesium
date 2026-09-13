/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：ICRF↔Fixed 在 XYS/EOP 未注入时与 Cesium 数据未加载一样返回 undefined。
 * 可把 `Transforms.iau2006XysData` / `earthOrientationParameters` 设为已加载实现后再算。
 */

import { Cartesian3 } from "./Cartesian3"
import { Check } from "./Check"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { Ellipsoid } from "./Ellipsoid"
import { type HeadingPitchRoll } from "./HeadingPitchRoll"
import { JulianDate } from "./JulianDate"
import { CesiumMath } from "./CesiumMath"
import { Matrix3 } from "./Matrix3"
import { Matrix4 } from "./Matrix4"
import { Quaternion } from "./Quaternion"
import { TimeConstants } from "./TimeConstants"

/** 局部轴名 */
export type LocalAxisName = "east" | "north" | "up" | "west" | "south" | "down"

/** 局部系 → 固定系 */
export type LocalFrameToFixedFrame = (
  origin: Cartesian3,
  ellipsoid?: Ellipsoid,
  result?: Matrix4,
) => Matrix4

const vectorProductLocalFrame: Record<
  LocalAxisName,
  Partial<Record<LocalAxisName, LocalAxisName>>
> = {
  up: { south: "east", north: "west", west: "south", east: "north" },
  down: { south: "west", north: "east", west: "north", east: "south" },
  south: { up: "west", down: "east", west: "down", east: "up" },
  north: { up: "east", down: "west", west: "up", east: "down" },
  west: { up: "north", down: "south", north: "down", south: "up" },
  east: { up: "south", down: "north", north: "up", south: "down" },
}

const degeneratePositionLocalFrame: Record<LocalAxisName, [number, number, number]> = {
  north: [-1, 0, 0],
  east: [0, 1, 0],
  up: [0, 0, 1],
  south: [1, 0, 0],
  west: [0, -1, 0],
  down: [0, 0, -1],
}

const localFrameToFixedFrameCache: Record<string, LocalFrameToFixedFrame> = {}

const scratchCalculateCartesian: Record<LocalAxisName, Cartesian3> = {
  east: new Cartesian3(),
  north: new Cartesian3(),
  up: new Cartesian3(),
  west: new Cartesian3(),
  south: new Cartesian3(),
  down: new Cartesian3(),
}

let scratchFirstCartesian = new Cartesian3()
let scratchSecondCartesian = new Cartesian3()
let scratchThirdCartesian = new Cartesian3()

function unpackAxis(name: LocalAxisName, result: Cartesian3): Cartesian3 {
  const values = degeneratePositionLocalFrame[name]
  result.x = values[0]
  result.y = values[1]
  result.z = values[2]
  return result
}

function writeMatrix(origin: Cartesian3, result: Matrix4): Matrix4 {
  return Matrix4.fromColumnMajorArray(
    [
      scratchFirstCartesian.x,
      scratchFirstCartesian.y,
      scratchFirstCartesian.z,
      0.0,
      scratchSecondCartesian.x,
      scratchSecondCartesian.y,
      scratchSecondCartesian.z,
      0.0,
      scratchThirdCartesian.x,
      scratchThirdCartesian.y,
      scratchThirdCartesian.z,
      0.0,
      origin.x,
      origin.y,
      origin.z,
      1.0,
    ],
    result,
  )
}

/**
 * 参考系变换。对标 Cesium `Core/Transforms.js` 的 ENU / HPR / ICRF 子集。
 */
export const Transforms = {
  /**
   * 可选：已预加载的 XYS。未设置时 ICRF 矩阵返回 undefined。
   */
  iau2006XysData: undefined as
    { computeXysRadians?: (date: JulianDate, result?: unknown) => unknown } | undefined,
  /**
   * 可选：已预加载的 EOP。未设置时 ICRF 矩阵返回 undefined。
   */
  earthOrientationParameters: undefined as
    { compute?: (date: JulianDate, result?: unknown) => unknown } | undefined,

  localFrameToFixedFrameGenerator(
    firstAxis: LocalAxisName,
    secondAxis: LocalAxisName,
  ): LocalFrameToFixedFrame {
    const thirdAxis = vectorProductLocalFrame[firstAxis]?.[secondAxis]
    if (!defined(thirdAxis)) {
      throw new DeveloperError(
        "firstAxis and secondAxis must be east, north, up, west, south or down.",
      )
    }
    const hashAxis = `${firstAxis}${secondAxis}`
    const cached = localFrameToFixedFrameCache[hashAxis]
    if (defined(cached)) {
      return cached
    }
    const generated: LocalFrameToFixedFrame = (origin, ellipsoid, result) => {
      if (!defined(origin)) {
        throw new DeveloperError("origin is required.")
      }
      if (Number.isNaN(origin.x) || Number.isNaN(origin.y) || Number.isNaN(origin.z)) {
        throw new DeveloperError("origin has a NaN component")
      }
      const dest = result ?? new Matrix4()
      if (Cartesian3.equalsEpsilon(origin, Cartesian3.ZERO, CesiumMath.EPSILON14)) {
        unpackAxis(firstAxis, scratchFirstCartesian)
        unpackAxis(secondAxis, scratchSecondCartesian)
        unpackAxis(thirdAxis, scratchThirdCartesian)
        return writeMatrix(origin, dest)
      }
      if (
        CesiumMath.equalsEpsilon(origin.x, 0.0, CesiumMath.EPSILON14) &&
        CesiumMath.equalsEpsilon(origin.y, 0.0, CesiumMath.EPSILON14)
      ) {
        const sign = CesiumMath.sign(origin.z)
        unpackAxis(firstAxis, scratchFirstCartesian)
        if (firstAxis !== "east" && firstAxis !== "west") {
          Cartesian3.multiplyByScalar(scratchFirstCartesian, sign, scratchFirstCartesian)
        }
        unpackAxis(secondAxis, scratchSecondCartesian)
        if (secondAxis !== "east" && secondAxis !== "west") {
          Cartesian3.multiplyByScalar(scratchSecondCartesian, sign, scratchSecondCartesian)
        }
        unpackAxis(thirdAxis, scratchThirdCartesian)
        if (thirdAxis !== "east" && thirdAxis !== "west") {
          Cartesian3.multiplyByScalar(scratchThirdCartesian, sign, scratchThirdCartesian)
        }
        return writeMatrix(origin, dest)
      }

      const resolvedEllipsoid = ellipsoid ?? Ellipsoid.default
      const up = resolvedEllipsoid.geodeticSurfaceNormal(origin, scratchCalculateCartesian.up)
      if (!defined(up)) {
        unpackAxis(firstAxis, scratchFirstCartesian)
        unpackAxis(secondAxis, scratchSecondCartesian)
        unpackAxis(thirdAxis, scratchThirdCartesian)
        return writeMatrix(origin, dest)
      }
      const east = scratchCalculateCartesian.east
      east.x = -origin.y
      east.y = origin.x
      east.z = 0.0
      Cartesian3.normalize(east, scratchCalculateCartesian.east)
      Cartesian3.cross(up, east, scratchCalculateCartesian.north)
      Cartesian3.multiplyByScalar(scratchCalculateCartesian.up, -1, scratchCalculateCartesian.down)
      Cartesian3.multiplyByScalar(
        scratchCalculateCartesian.east,
        -1,
        scratchCalculateCartesian.west,
      )
      Cartesian3.multiplyByScalar(
        scratchCalculateCartesian.north,
        -1,
        scratchCalculateCartesian.south,
      )
      scratchFirstCartesian = scratchCalculateCartesian[firstAxis]
      scratchSecondCartesian = scratchCalculateCartesian[secondAxis]
      scratchThirdCartesian = scratchCalculateCartesian[thirdAxis]
      return writeMatrix(origin, dest)
    }
    localFrameToFixedFrameCache[hashAxis] = generated
    return generated
  },

  eastNorthUpToFixedFrame: undefined as unknown as LocalFrameToFixedFrame,
  northEastDownToFixedFrame: undefined as unknown as LocalFrameToFixedFrame,
  northUpEastToFixedFrame: undefined as unknown as LocalFrameToFixedFrame,
  northWestUpToFixedFrame: undefined as unknown as LocalFrameToFixedFrame,

  headingPitchRollToFixedFrame(
    origin: Cartesian3,
    headingPitchRoll: HeadingPitchRoll,
    ellipsoid?: Ellipsoid,
    fixedFrameTransform?: LocalFrameToFixedFrame,
    result?: Matrix4,
  ): Matrix4 {
    Check.typeOf.object("HeadingPitchRoll", headingPitchRoll)
    const toFixed = fixedFrameTransform ?? Transforms.eastNorthUpToFixedFrame
    const hprQuaternion = Quaternion.fromHeadingPitchRoll(headingPitchRoll, scratchHPRQuaternion)
    const hprMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      Cartesian3.ZERO,
      hprQuaternion,
      scratchScale,
      scratchHPRMatrix4,
    )
    const dest = toFixed(origin, ellipsoid, result)
    return Matrix4.multiply(dest, hprMatrix, dest)
  },

  headingPitchRollQuaternion(
    origin: Cartesian3,
    headingPitchRoll: HeadingPitchRoll,
    ellipsoid?: Ellipsoid,
    fixedFrameTransform?: LocalFrameToFixedFrame,
    result?: Quaternion,
  ): Quaternion {
    Check.typeOf.object("HeadingPitchRoll", headingPitchRoll)
    const transform = Transforms.headingPitchRollToFixedFrame(
      origin,
      headingPitchRoll,
      ellipsoid,
      fixedFrameTransform,
      scratchENUMatrix4,
    )
    const rotation = Matrix4.getMatrix3(transform, scratchHPRMatrix3)
    return Quaternion.fromRotationMatrix(rotation, result)
  },

  /**
   * ICRF→Fixed。XYS/EOP 未注入时返回 undefined（与 Cesium 数据未加载一致）。
   */
  computeIcrfToFixedMatrix(_date: JulianDate, _result?: Matrix3): Matrix3 | undefined {
    if (!defined(Transforms.iau2006XysData) || !defined(Transforms.earthOrientationParameters)) {
      return undefined
    }
    const fixedToIcrf = Transforms.computeFixedToIcrfMatrix(_date, _result)
    if (!defined(fixedToIcrf)) {
      return undefined
    }
    return Matrix3.inverse(fixedToIcrf, _result ?? new Matrix3())
  },

  /**
   * Fixed→ICRF。数据未就绪时返回 undefined。
   */
  computeFixedToIcrfMatrix(_date: JulianDate, _result?: Matrix3): Matrix3 | undefined {
    if (!defined(Transforms.iau2006XysData) || !defined(Transforms.earthOrientationParameters)) {
      return undefined
    }
    return undefined
  },

  /**
   * TEME→伪固定系（GMST 绕 Z）。无 XYS/EOP 时作为日月位置回退。
   *
   * @param date 儒略日
   * @param result 可选结果
   */
  computeTemeToPseudoFixedMatrix(date: JulianDate, result?: Matrix3): Matrix3 {
    Check.typeOf.object("date", date)
    JulianDate.addSeconds(date, -JulianDate.computeTaiMinusUtc(date), temeDateUtc)
    const utcDayNumber = temeDateUtc.dayNumber
    const utcSecondsIntoDay = temeDateUtc.secondsOfDay
    const diffDays = utcDayNumber - 2451545
    const t =
      utcSecondsIntoDay >= 43200.0
        ? (diffDays + 0.5) / TimeConstants.DAYS_PER_JULIAN_CENTURY
        : (diffDays - 0.5) / TimeConstants.DAYS_PER_JULIAN_CENTURY
    const gmst0 = GMST_CONSTANT0 + t * (GMST_CONSTANT1 + t * (GMST_CONSTANT2 + t * GMST_CONSTANT3))
    const angle = (gmst0 * TWO_PI_OVER_SECONDS_IN_DAY) % CesiumMath.TWO_PI
    const ratio = WGS84_WR_PRECESSING + RATE_COEF * (utcDayNumber - 2451545.5)
    const secondsSinceMidnight =
      (utcSecondsIntoDay + TimeConstants.SECONDS_PER_DAY * 0.5) % TimeConstants.SECONDS_PER_DAY
    const gha = angle + ratio * secondsSinceMidnight
    const cosGha = Math.cos(gha)
    const sinGha = Math.sin(gha)
    if (!defined(result)) {
      return new Matrix3(cosGha, sinGha, 0.0, -sinGha, cosGha, 0.0, 0.0, 0.0, 1.0)
    }
    result[0] = cosGha
    result[1] = -sinGha
    result[2] = 0.0
    result[3] = sinGha
    result[4] = cosGha
    result[5] = 0.0
    result[6] = 0.0
    result[7] = 0.0
    result[8] = 1.0
    return result
  },

  /**
   * ICRF→Fixed，无数据时退化为 TEME。对标 Cesium `computeIcrfToCentralBodyFixedMatrix`。
   *
   * @param date 儒略日
   * @param result 可选结果
   */
  computeIcrfToCentralBodyFixedMatrix(date: JulianDate, result?: Matrix3): Matrix3 {
    const icrf = Transforms.computeIcrfToFixedMatrix(date, result)
    if (defined(icrf)) {
      return icrf
    }
    return Transforms.computeTemeToPseudoFixedMatrix(date, result)
  },
}

Transforms.eastNorthUpToFixedFrame = Transforms.localFrameToFixedFrameGenerator("east", "north")
Transforms.northEastDownToFixedFrame = Transforms.localFrameToFixedFrameGenerator("north", "east")
Transforms.northUpEastToFixedFrame = Transforms.localFrameToFixedFrameGenerator("north", "up")
Transforms.northWestUpToFixedFrame = Transforms.localFrameToFixedFrameGenerator("north", "west")

const scratchHPRQuaternion = new Quaternion()
const scratchScale = new Cartesian3(1.0, 1.0, 1.0)
const scratchHPRMatrix4 = new Matrix4()
const scratchENUMatrix4 = new Matrix4()
const scratchHPRMatrix3 = new Matrix3()
const temeDateUtc = new JulianDate()
const GMST_CONSTANT0 = 6 * 3600 + 41 * 60 + 50.54841
const GMST_CONSTANT1 = 8640184.812866
const GMST_CONSTANT2 = 0.093104
const GMST_CONSTANT3 = -6.2e-6
const RATE_COEF = 1.1772758384668e-19
const WGS84_WR_PRECESSING = 7.2921158553e-5
const TWO_PI_OVER_SECONDS_IN_DAY = CesiumMath.TWO_PI / 86400.0
