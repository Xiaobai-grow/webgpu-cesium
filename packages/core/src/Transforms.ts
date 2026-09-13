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
import type { JulianDate } from "./JulianDate"
import { CesiumMath } from "./CesiumMath"
import { Matrix3 } from "./Matrix3"
import { Matrix4 } from "./Matrix4"
import { Quaternion } from "./Quaternion"

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
