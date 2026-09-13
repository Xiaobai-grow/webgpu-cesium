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
import { defined } from "./defined"
import { Iau2000Orientation } from "./Iau2000Orientation"
import type { IauOrientationParameters } from "./IauOrientationParameters"
import { JulianDate } from "./JulianDate"
import { CesiumMath } from "./CesiumMath"
import { Matrix3 } from "./Matrix3"
import { Quaternion } from "./Quaternion"

/** 由日期计算 IAU 定向参数 */
export type IauOrientationComputeFunction = (date: JulianDate) => IauOrientationParameters

const xAxisScratch = new Cartesian3()
const yAxisScratch = new Cartesian3()
const zAxisScratch = new Cartesian3()
const rotMtxScratch = new Matrix3()
const quatScratch = new Quaternion()

function computeRotationMatrix(alpha: number, delta: number, result?: Matrix3): Matrix3 {
  const xAxis = xAxisScratch
  xAxis.x = Math.cos(alpha + CesiumMath.PI_OVER_TWO)
  xAxis.y = Math.sin(alpha + CesiumMath.PI_OVER_TWO)
  xAxis.z = 0.0

  const cosDec = Math.cos(delta)
  const zAxis = zAxisScratch
  zAxis.x = cosDec * Math.cos(alpha)
  zAxis.y = cosDec * Math.sin(alpha)
  zAxis.z = Math.sin(delta)

  Cartesian3.cross(zAxis, xAxis, yAxisScratch)

  if (!defined(result)) {
    result = new Matrix3()
  }
  result[0] = xAxis.x
  result[1] = yAxisScratch.x
  result[2] = zAxis.x
  result[3] = xAxis.y
  result[4] = yAxisScratch.y
  result[5] = zAxis.y
  result[6] = xAxis.z
  result[7] = yAxisScratch.z
  result[8] = zAxis.z
  return result
}

/**
 * IAU 定向轴。对标 Cesium `Core/IauOrientationAxes.js`。
 */
export class IauOrientationAxes {
  private readonly _computeFunction: IauOrientationComputeFunction

  /**
   * @param computeFunction 默认月球 IAU2000
   */
  constructor(computeFunction?: IauOrientationComputeFunction) {
    this._computeFunction = computeFunction ?? Iau2000Orientation.ComputeMoon
  }

  /**
   * ICRF → 天体固连旋转。
   *
   * @param date 时刻
   * @param result 结果矩阵
   */
  evaluate(date: JulianDate, result: Matrix3): Matrix3 {
    const when = defined(date) ? date : JulianDate.now()
    const alphaDeltaW = this._computeFunction(when)
    const precMtx = computeRotationMatrix(
      alphaDeltaW.rightAscension,
      alphaDeltaW.declination,
      result,
    )
    const rot = CesiumMath.zeroToTwoPi(alphaDeltaW.rotation)
    const quat = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, rot, quatScratch)
    const rotMtx = Matrix3.fromQuaternion(Quaternion.conjugate(quat, quat), rotMtxScratch)
    return Matrix3.multiply(rotMtx, precMtx, precMtx)
  }
}
