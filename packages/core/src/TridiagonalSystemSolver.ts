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
import { DeveloperError } from "./DeveloperError"
/**
 * Uses the Tridiagonal Matrix Algorithm, also known as the Thomas Algorithm, to solve
 * a system of linear equations where the coefficient matrix is a tridiagonal matrix.
 *
 * @namespace TridiagonalSystemSolver
 */
const TridiagonalSystemSolver: {
  solve: (lower: number[], diagonal: number[], upper: number[], right: Cartesian3[]) => Cartesian3[]
} = {} as {
  solve: (lower: number[], diagonal: number[], upper: number[], right: Cartesian3[]) => Cartesian3[]
}

/**
 * Solves a tridiagonal system of linear equations.
 *
 * @param {number[]} diagonal An array with length <code>n</code> that contains the diagonal of the coefficient matrix.
 * @param {number[]} lower An array with length <code>n - 1</code> that contains the lower diagonal of the coefficient matrix.
 * @param {number[]} upper An array with length <code>n - 1</code> that contains the upper diagonal of the coefficient matrix.
 * @param {Cartesian3[]} right An array of Cartesians with length <code>n</code> that is the right side of the system of equations.
 *
 * @exception {DeveloperError} diagonal and right must have the same lengths.
 * @exception {DeveloperError} lower and upper must have the same lengths.
 * @exception {DeveloperError} lower and upper must be one less than the length of diagonal.
 *
 * @performance Linear time.
 *
 * @example
 * const lowerDiagonal = [1.0, 1.0, 1.0, 1.0];
 * const diagonal = [2.0, 4.0, 4.0, 4.0, 2.0];
 * const upperDiagonal = [1.0, 1.0, 1.0, 1.0];
 * const rightHandSide = [
 *     new Cesium.Cartesian3(410757.0, -1595711.0, 1375302.0),
 *     new Cesium.Cartesian3(-5986705.0, -2190640.0, 1099600.0),
 *     new Cesium.Cartesian3(-12593180.0, 288588.0, -1755549.0),
 *     new Cesium.Cartesian3(-5349898.0, 2457005.0, -2685438.0),
 *     new Cesium.Cartesian3(845820.0, 1573488.0, -1205591.0)
 * ];
 *
 * const solution = Cesium.TridiagonalSystemSolver.solve(lowerDiagonal, diagonal, upperDiagonal, rightHandSide);
 *
 * @returns {Cartesian3[]} An array of Cartesians with length <code>n</code> that is the solution to the tridiagonal system of equations.
 */
TridiagonalSystemSolver.solve = function (
  lower: number[],
  diagonal: number[],
  upper: number[],
  right: Cartesian3[],
): Cartesian3[] {
  if (!defined(lower) || !(lower instanceof Array)) {
    throw new DeveloperError("The array lower is required.")
  }
  if (!defined(diagonal) || !(diagonal instanceof Array)) {
    throw new DeveloperError("The array diagonal is required.")
  }
  if (!defined(upper) || !(upper instanceof Array)) {
    throw new DeveloperError("The array upper is required.")
  }
  if (!defined(right) || !(right instanceof Array)) {
    throw new DeveloperError("The array right is required.")
  }
  if (diagonal.length !== right.length) {
    throw new DeveloperError("diagonal and right must have the same lengths.")
  }
  if (lower.length !== upper.length) {
    throw new DeveloperError("lower and upper must have the same lengths.")
  } else if (lower.length !== diagonal.length - 1) {
    throw new DeveloperError("lower and upper must be one less than the length of diagonal.")
  }
  const n = right.length
  const c: number[] = new Array<number>(upper.length)
  const d: Cartesian3[] = []
  const x: Cartesian3[] = []
  for (let k = 0; k < n; k++) {
    d.push(new Cartesian3())
    x.push(new Cartesian3())
  }

  c[0] = (upper[0] ?? 0) / (diagonal[0] ?? 1)
  Cartesian3.multiplyByScalar(right[0]!, 1.0 / (diagonal[0] ?? 1), d[0]!)

  let scalar: number
  for (let i = 1; i < c.length; ++i) {
    scalar = 1.0 / ((diagonal[i] ?? 0) - (c[i - 1] ?? 0) * (lower[i - 1] ?? 0))
    c[i] = (upper[i] ?? 0) * scalar
    Cartesian3.subtract(
      right[i]!,
      Cartesian3.multiplyByScalar(d[i - 1]!, lower[i - 1] ?? 0, d[i]!),
      d[i]!,
    )
    Cartesian3.multiplyByScalar(d[i]!, scalar, d[i]!)
  }

  const last = n - 1
  scalar = 1.0 / ((diagonal[last] ?? 0) - (c[last - 1] ?? 0) * (lower[last - 1] ?? 0))
  Cartesian3.subtract(
    right[last]!,
    Cartesian3.multiplyByScalar(d[last - 1]!, lower[last - 1] ?? 0, d[last]!),
    d[last]!,
  )
  Cartesian3.multiplyByScalar(d[last]!, scalar, d[last]!)

  x[last] = d[last]!
  for (let i = n - 2; i >= 0; --i) {
    Cartesian3.subtract(d[i]!, Cartesian3.multiplyByScalar(x[i + 1]!, c[i] ?? 0, x[i]!), x[i]!)
  }

  return x
}
export { TridiagonalSystemSolver }
