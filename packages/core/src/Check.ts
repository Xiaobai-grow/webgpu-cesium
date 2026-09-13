/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"

function getUndefinedErrorMessage(name: string): string {
  return `${name} is required, actual value was undefined`
}

function getFailedTypeErrorMessage(actual: string, expected: string, name: string): string {
  return `Expected ${name} to be typeof ${expected}, actual typeof was ${actual}`
}

/**
 * 断言 `test` 已定义。
 *
 * @param name 参数名（用于报错）
 * @param test 待检查值
 */
export function checkDefined<T>(name: string, test: T | undefined | null): void {
  if (!defined(test)) {
    throw new DeveloperError(getUndefinedErrorMessage(name))
  }
}

/**
 * 断言 `test` 为 function。
 */
export function checkFunc(name: string, test: unknown): void {
  if (typeof test !== "function") {
    throw new DeveloperError(getFailedTypeErrorMessage(typeof test, "function", name))
  }
}

/**
 * 断言 `test` 为 string。
 */
export function checkString(name: string, test: unknown): void {
  if (typeof test !== "string") {
    throw new DeveloperError(getFailedTypeErrorMessage(typeof test, "string", name))
  }
}

/**
 * 断言 `test` 为 number。
 */
export function checkNumber(name: string, test: unknown): asserts test is number {
  if (typeof test !== "number") {
    throw new DeveloperError(getFailedTypeErrorMessage(typeof test, "number", name))
  }
}

/**
 * 断言 `test` 为 number 且 `< limit`。
 */
export function checkNumberLessThan(name: string, test: unknown, limit: number): void {
  checkNumber(name, test)
  if (test >= limit) {
    throw new DeveloperError(`Expected ${name} to be less than ${limit}, actual value was ${test}`)
  }
}

/**
 * 断言 `test` 为 number 且 `<= limit`。
 */
export function checkNumberLessThanOrEquals(name: string, test: unknown, limit: number): void {
  checkNumber(name, test)
  if (test > limit) {
    throw new DeveloperError(
      `Expected ${name} to be less than or equal to ${limit}, actual value was ${test}`,
    )
  }
}

/**
 * 断言 `test` 为 number 且 `> limit`。
 */
export function checkNumberGreaterThan(name: string, test: unknown, limit: number): void {
  checkNumber(name, test)
  if (test <= limit) {
    throw new DeveloperError(
      `Expected ${name} to be greater than ${limit}, actual value was ${test}`,
    )
  }
}

/**
 * 断言 `test` 为 number 且 `>= limit`。
 */
export function checkNumberGreaterThanOrEquals(name: string, test: unknown, limit: number): void {
  checkNumber(name, test)
  if (test < limit) {
    throw new DeveloperError(
      `Expected ${name} to be greater than or equal to ${limit}, actual value was ${test}`,
    )
  }
}

/**
 * 断言两个 number 值相等。
 */
export function checkNumberEquals(
  name1: string,
  name2: string,
  test1: unknown,
  test2: unknown,
): void {
  checkNumber(name1, test1)
  checkNumber(name2, test2)
  if (test1 !== test2) {
    throw new DeveloperError(
      `${name1} must be equal to ${name2}, the actual values are ${test1} and ${test2}`,
    )
  }
}

/**
 * 断言 `typeof test === "object"`（与 Cesium 一致，`null` 也会通过）。
 */
export function checkObject(name: string, test: unknown): void {
  if (typeof test !== "object") {
    throw new DeveloperError(getFailedTypeErrorMessage(typeof test, "object", name))
  }
}

/**
 * 断言 `test` 为 boolean。
 */
export function checkBool(name: string, test: unknown): void {
  if (typeof test !== "boolean") {
    throw new DeveloperError(getFailedTypeErrorMessage(typeof test, "boolean", name))
  }
}

/**
 * 断言 `test` 为 bigint。
 */
export function checkBigint(name: string, test: unknown): void {
  if (typeof test !== "bigint") {
    throw new DeveloperError(getFailedTypeErrorMessage(typeof test, "bigint", name))
  }
}

/** `Check.typeOf.number` 及其比较子函数 */
export type NumberCheck = ((name: string, test: unknown) => void) & {
  lessThan: typeof checkNumberLessThan
  lessThanOrEquals: typeof checkNumberLessThanOrEquals
  greaterThan: typeof checkNumberGreaterThan
  greaterThanOrEquals: typeof checkNumberGreaterThanOrEquals
  equals: typeof checkNumberEquals
}

const numberCheck: NumberCheck = Object.assign(checkNumber, {
  lessThan: checkNumberLessThan,
  lessThanOrEquals: checkNumberLessThanOrEquals,
  greaterThan: checkNumberGreaterThan,
  greaterThanOrEquals: checkNumberGreaterThanOrEquals,
  equals: checkNumberEquals,
})

export interface CheckTypeOf {
  func: typeof checkFunc
  string: typeof checkString
  number: NumberCheck
  object: typeof checkObject
  bool: typeof checkBool
  bigint: typeof checkBigint
}

export interface CheckNamespace {
  defined: typeof checkDefined
  typeOf: CheckTypeOf
}

/**
 * 参数检查工具，对标 Cesium `Core/Check.js`。
 * 显式标注类型，以便 `asserts` 在 `Check.typeOf.number(...)` 调用链上生效。
 */
export const Check: CheckNamespace = {
  defined: checkDefined,
  typeOf: {
    func: checkFunc,
    string: checkString,
    number: numberCheck,
    object: checkObject,
    bool: checkBool,
    bigint: checkBigint,
  },
}
