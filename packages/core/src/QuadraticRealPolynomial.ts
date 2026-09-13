/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { DeveloperError } from "./DeveloperError"
import { CesiumMath } from "./CesiumMath"
/**
 * Defines functions for 2nd order polynomial functions of one variable with only real coefficients.
 *
 * @namespace QuadraticRealPolynomial
 */
const QuadraticRealPolynomial = {} as {
  computeDiscriminant: (a: number, b: number, c: number) => number
  computeRealRoots: (a: number, b: number, c: number) => number[]
}

/**
 * Provides the discriminant of the quadratic equation from the supplied coefficients.
 *
 * @param {number} a The coefficient of the 2nd order monomial.
 * @param {number} b The coefficient of the 1st order monomial.
 * @param {number} c The coefficient of the 0th order monomial.
 * @returns {number} The value of the discriminant.
 */
QuadraticRealPolynomial.computeDiscriminant = function (a: number, b: number, c: number): number {
  if (typeof a !== "number") {
    throw new DeveloperError("a is a required number.")
  }
  if (typeof b !== "number") {
    throw new DeveloperError("b is a required number.")
  }
  if (typeof c !== "number") {
    throw new DeveloperError("c is a required number.")
  }
  const discriminant = b * b - 4.0 * a * c
  return discriminant
}

function addWithCancellationCheck(left: number, right: number, tolerance: number) {
  const difference = left + right
  if (
    CesiumMath.sign(left) !== CesiumMath.sign(right) &&
    Math.abs(difference / Math.max(Math.abs(left), Math.abs(right))) < tolerance
  ) {
    return 0.0
  }

  return difference
}

/**
 * Provides the real valued roots of the quadratic polynomial with the provided coefficients.
 *
 * @param {number} a The coefficient of the 2nd order monomial.
 * @param {number} b The coefficient of the 1st order monomial.
 * @param {number} c The coefficient of the 0th order monomial.
 * @returns {number[]} The real valued roots.
 */
QuadraticRealPolynomial.computeRealRoots = function (a: number, b: number, c: number): number[] {
  if (typeof a !== "number") {
    throw new DeveloperError("a is a required number.")
  }
  if (typeof b !== "number") {
    throw new DeveloperError("b is a required number.")
  }
  if (typeof c !== "number") {
    throw new DeveloperError("c is a required number.")
  }
  let ratio
  if (a === 0.0) {
    if (b === 0.0) {
      // Constant function: c = 0.
      return []
    }

    // Linear function: b * x + c = 0.
    return [-c / b]
  } else if (b === 0.0) {
    if (c === 0.0) {
      // 2nd order monomial: a * x^2 = 0.
      return [0.0, 0.0]
    }

    const cMagnitude = Math.abs(c)
    const aMagnitude = Math.abs(a)

    if (cMagnitude < aMagnitude && cMagnitude / aMagnitude < CesiumMath.EPSILON14) {
      // c ~= 0.0.
      // 2nd order monomial: a * x^2 = 0.
      return [0.0, 0.0]
    } else if (cMagnitude > aMagnitude && aMagnitude / cMagnitude < CesiumMath.EPSILON14) {
      // a ~= 0.0.
      // Constant function: c = 0.
      return []
    }

    // a * x^2 + c = 0
    ratio = -c / a

    if (ratio < 0.0) {
      // Both roots are complex.
      return []
    }

    // Both roots are real.
    const root = Math.sqrt(ratio)
    return [-root, root]
  } else if (c === 0.0) {
    // a * x^2 + b * x = 0
    ratio = -b / a
    if (ratio < 0.0) {
      return [ratio, 0.0]
    }

    return [0.0, ratio]
  }

  // a * x^2 + b * x + c = 0
  const b2 = b * b
  const fourAc = 4.0 * a * c
  const radicand = addWithCancellationCheck(b2, -fourAc, CesiumMath.EPSILON14)

  if (radicand < 0.0) {
    // Both roots are complex.
    return []
  }

  const q =
    -0.5 *
    addWithCancellationCheck(b, CesiumMath.sign(b) * Math.sqrt(radicand), CesiumMath.EPSILON14)
  if (b > 0.0) {
    return [q / a, c / q]
  }

  return [c / q, q / a]
}
export { QuadraticRealPolynomial }
