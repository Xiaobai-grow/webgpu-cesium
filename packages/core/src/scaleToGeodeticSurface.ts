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
import { CesiumMath } from "./CesiumMath"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"

const scaleToGeodeticSurfaceIntersection = new Cartesian3()
const scaleToGeodeticSurfaceGradient = new Cartesian3()

/**
 * 沿大地水准面法线把点缩放到椭球面；在中心则返回 undefined。
 * 对标 Cesium `Core/scaleToGeodeticSurface.js`。
 *
 * @param cartesian 点
 * @param oneOverRadii 1/半径
 * @param oneOverRadiiSquared 1/半径²
 * @param centerToleranceSquared 近中心容差
 * @param result 可选结果
 */
export function scaleToGeodeticSurface(
  cartesian: Cartesian3,
  oneOverRadii: Cartesian3,
  oneOverRadiiSquared: Cartesian3,
  centerToleranceSquared: number,
  result?: Cartesian3,
): Cartesian3 | undefined {
  if (!defined(cartesian)) {
    throw new DeveloperError("cartesian is required.")
  }
  if (!defined(oneOverRadii)) {
    throw new DeveloperError("oneOverRadii is required.")
  }
  if (!defined(oneOverRadiiSquared)) {
    throw new DeveloperError("oneOverRadiiSquared is required.")
  }
  if (!defined(centerToleranceSquared)) {
    throw new DeveloperError("centerToleranceSquared is required.")
  }

  const positionX = cartesian.x
  const positionY = cartesian.y
  const positionZ = cartesian.z
  const oneOverRadiiX = oneOverRadii.x
  const oneOverRadiiY = oneOverRadii.y
  const oneOverRadiiZ = oneOverRadii.z
  const x2 = positionX * positionX * oneOverRadiiX * oneOverRadiiX
  const y2 = positionY * positionY * oneOverRadiiY * oneOverRadiiY
  const z2 = positionZ * positionZ * oneOverRadiiZ * oneOverRadiiZ
  const squaredNorm = x2 + y2 + z2
  const ratio = Math.sqrt(1.0 / squaredNorm)
  const intersection = Cartesian3.multiplyByScalar(
    cartesian,
    ratio,
    scaleToGeodeticSurfaceIntersection,
  )

  if (squaredNorm < centerToleranceSquared) {
    return !Number.isFinite(ratio) ? undefined : Cartesian3.clone(intersection, result)
  }

  const oneOverRadiiSquaredX = oneOverRadiiSquared.x
  const oneOverRadiiSquaredY = oneOverRadiiSquared.y
  const oneOverRadiiSquaredZ = oneOverRadiiSquared.z
  const gradient = scaleToGeodeticSurfaceGradient
  gradient.x = intersection.x * oneOverRadiiSquaredX * 2.0
  gradient.y = intersection.y * oneOverRadiiSquaredY * 2.0
  gradient.z = intersection.z * oneOverRadiiSquaredZ * 2.0

  let lambda =
    ((1.0 - ratio) * Cartesian3.magnitude(cartesian)) / (0.5 * Cartesian3.magnitude(gradient))
  let correction = 0.0
  let func: number
  let xMultiplier!: number
  let yMultiplier!: number
  let zMultiplier!: number

  do {
    lambda -= correction
    xMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredX)
    yMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredY)
    zMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredZ)
    const xMultiplier2 = xMultiplier * xMultiplier
    const yMultiplier2 = yMultiplier * yMultiplier
    const zMultiplier2 = zMultiplier * zMultiplier
    const xMultiplier3 = xMultiplier2 * xMultiplier
    const yMultiplier3 = yMultiplier2 * yMultiplier
    const zMultiplier3 = zMultiplier2 * zMultiplier
    func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1.0
    const denominator =
      x2 * xMultiplier3 * oneOverRadiiSquaredX +
      y2 * yMultiplier3 * oneOverRadiiSquaredY +
      z2 * zMultiplier3 * oneOverRadiiSquaredZ
    correction = func / (-2.0 * denominator)
  } while (Math.abs(func) > CesiumMath.EPSILON12)

  if (!defined(result)) {
    return new Cartesian3(positionX * xMultiplier, positionY * yMultiplier, positionZ * zMultiplier)
  }
  result.x = positionX * xMultiplier
  result.y = positionY * yMultiplier
  result.z = positionZ * zMultiplier
  return result
}
