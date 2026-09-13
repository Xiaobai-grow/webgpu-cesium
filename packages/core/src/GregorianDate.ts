/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Check } from "./Check"
import { DeveloperError } from "./DeveloperError"
import { isLeapYear } from "./isLeapYear"

const daysInYear = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/**
 * 比 JS Date 更精确的公历日期（含闰秒）。
 * 对标 Cesium `Core/GregorianDate.js`。
 */
export class GregorianDate {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  millisecond: number
  isLeapSecond: boolean

  /**
   * @param year 年 [1, 9999]
   * @param month 月 [1, 12]
   * @param day 日
   * @param hour 时 [0, 23]
   * @param minute 分 [0, 59]
   * @param second 秒 [0, 60]
   * @param millisecond 毫秒 [0, 1000)
   * @param isLeapSecond 是否闰秒
   */
  constructor(
    year?: number,
    month?: number,
    day?: number,
    hour?: number,
    minute?: number,
    second?: number,
    millisecond?: number,
    isLeapSecond?: boolean,
  ) {
    const resolvedYear = year ?? 1
    const resolvedMonth = month ?? 1
    const resolvedDay = day ?? 1
    const resolvedHour = hour ?? 0
    const resolvedMinute = minute ?? 0
    const resolvedSecond = second ?? 0
    const resolvedMillisecond = millisecond ?? 0
    const resolvedLeap = isLeapSecond ?? false

    Check.typeOf.number.greaterThanOrEquals("Year", resolvedYear, 1)
    Check.typeOf.number.lessThanOrEquals("Year", resolvedYear, 9999)
    Check.typeOf.number.greaterThanOrEquals("Month", resolvedMonth, 1)
    Check.typeOf.number.lessThanOrEquals("Month", resolvedMonth, 12)
    Check.typeOf.number.greaterThanOrEquals("Day", resolvedDay, 1)
    Check.typeOf.number.lessThanOrEquals("Day", resolvedDay, 31)
    Check.typeOf.number.greaterThanOrEquals("Hour", resolvedHour, 0)
    Check.typeOf.number.lessThanOrEquals("Hour", resolvedHour, 23)
    Check.typeOf.number.greaterThanOrEquals("Minute", resolvedMinute, 0)
    Check.typeOf.number.lessThanOrEquals("Minute", resolvedMinute, 59)
    Check.typeOf.bool("IsLeapSecond", resolvedLeap)
    Check.typeOf.number.greaterThanOrEquals("Second", resolvedSecond, 0)
    Check.typeOf.number.lessThanOrEquals("Second", resolvedSecond, resolvedLeap ? 60 : 59)
    Check.typeOf.number.greaterThanOrEquals("Millisecond", resolvedMillisecond, 0)
    Check.typeOf.number.lessThan("Millisecond", resolvedMillisecond, 1000)

    const daysInMonth =
      resolvedMonth === 2 && isLeapYear(resolvedYear)
        ? (daysInYear[1] ?? 28) + 1
        : (daysInYear[resolvedMonth - 1] ?? 31)
    if (resolvedDay > daysInMonth) {
      throw new DeveloperError("Month and Day represents invalid date")
    }

    this.year = resolvedYear
    this.month = resolvedMonth
    this.day = resolvedDay
    this.hour = resolvedHour
    this.minute = resolvedMinute
    this.second = resolvedSecond
    this.millisecond = resolvedMillisecond
    this.isLeapSecond = resolvedLeap
  }
}
