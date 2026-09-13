/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { binarySearch } from "./binarySearch"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { GregorianDate } from "./GregorianDate"
import { isLeapYear } from "./isLeapYear"
import { LeapSecond } from "./LeapSecond"
import { TimeConstants } from "./TimeConstants"
import { TimeStandard, type TimeStandardValue } from "./TimeStandard"

const gregorianDateScratch = new GregorianDate()
const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const daysInLeapFebruary = 29

function compareLeapSecondDates(leapSecond: LeapSecond, dateToFind: LeapSecond): number {
  return JulianDate.compare(leapSecond.julianDate, dateToFind.julianDate)
}

const binarySearchScratchLeapSecond = new LeapSecond()

function convertUtcToTai(julianDate: JulianDate): void {
  binarySearchScratchLeapSecond.julianDate = julianDate
  const leapSeconds = JulianDate.leapSeconds
  let index = binarySearch(leapSeconds, binarySearchScratchLeapSecond, compareLeapSecondDates)
  if (index < 0) {
    index = ~index
  }
  if (index >= leapSeconds.length) {
    index = leapSeconds.length - 1
  }
  let offset = leapSeconds[index]?.offset ?? 0
  if (index > 0) {
    const leap = leapSeconds[index]
    if (defined(leap)) {
      const difference = JulianDate.secondsDifference(leap.julianDate, julianDate)
      if (difference > offset) {
        index--
        offset = leapSeconds[index]?.offset ?? 0
      }
    }
  }
  JulianDate.addSeconds(julianDate, offset, julianDate)
}

function convertTaiToUtc(julianDate: JulianDate, result: JulianDate): JulianDate | undefined {
  binarySearchScratchLeapSecond.julianDate = julianDate
  const leapSeconds = JulianDate.leapSeconds
  let index = binarySearch(leapSeconds, binarySearchScratchLeapSecond, compareLeapSecondDates)
  if (index < 0) {
    index = ~index
  }
  if (index === 0) {
    return JulianDate.addSeconds(julianDate, -(leapSeconds[0]?.offset ?? 0), result)
  }
  if (index >= leapSeconds.length) {
    return JulianDate.addSeconds(julianDate, -(leapSeconds[index - 1]?.offset ?? 0), result)
  }
  const found = leapSeconds[index]
  if (!defined(found)) {
    return JulianDate.addSeconds(julianDate, -(leapSeconds[index - 1]?.offset ?? 0), result)
  }
  const difference = JulianDate.secondsDifference(found.julianDate, julianDate)
  if (difference === 0) {
    return JulianDate.addSeconds(julianDate, -found.offset, result)
  }
  if (difference <= 1.0) {
    return undefined
  }
  return JulianDate.addSeconds(julianDate, -(leapSeconds[index - 1]?.offset ?? 0), result)
}

function setComponents(
  wholeDays: number,
  secondsOfDay: number,
  julianDate: JulianDate,
): JulianDate {
  const extraDays = (secondsOfDay / TimeConstants.SECONDS_PER_DAY) | 0
  let days = wholeDays + extraDays
  let seconds = secondsOfDay - TimeConstants.SECONDS_PER_DAY * extraDays
  if (seconds < 0) {
    days--
    seconds += TimeConstants.SECONDS_PER_DAY
  }
  julianDate.dayNumber = days
  julianDate.secondsOfDay = seconds
  return julianDate
}

function computeJulianDateComponents(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): [number, number] {
  const a = ((month - 14) / 12) | 0
  const b = year + 4800 + a
  let dayNumber =
    (((1461 * b) / 4) | 0) +
    (((367 * (month - 2 - 12 * a)) / 12) | 0) -
    (((3 * (((b + 100) / 100) | 0)) / 4) | 0) +
    day -
    32075

  let adjustedHour = hour - 12
  if (adjustedHour < 0) {
    adjustedHour += 24
  }

  const secondsOfDay =
    second +
    (adjustedHour * TimeConstants.SECONDS_PER_HOUR +
      minute * TimeConstants.SECONDS_PER_MINUTE +
      millisecond * TimeConstants.SECONDS_PER_MILLISECOND)

  if (secondsOfDay >= 43200.0) {
    dayNumber -= 1
  }
  return [dayNumber, secondsOfDay]
}

const matchCalendarYear = /^(\d{4})$/
const matchCalendarMonth = /^(\d{4})-(\d{2})$/
const matchOrdinalDate = /^(\d{4})-?(\d{3})$/
const matchWeekDate = /^(\d{4})-?W(\d{2})-?(\d{1})?$/
const matchCalendarDate = /^(\d{4})-?(\d{2})-?(\d{2})$/
const utcOffset = /([Z+\-])?(\d{2})?:?(\d{2})?$/
const matchHours = new RegExp(`^(\\d{2})(\\.\\d+)?${utcOffset.source}`)
const matchHoursMinutes = new RegExp(`^(\\d{2}):?(\\d{2})(\\.\\d+)?${utcOffset.source}`)
const matchHoursMinutesSeconds = new RegExp(
  `^(\\d{2}):?(\\d{2}):?(\\d{2})(\\.\\d+)?${utcOffset.source}`,
)
const iso8601ErrorMessage = "Invalid ISO 8601 date."

/**
 * 天文儒略日，始终以 TAI 存储。对标 Cesium `Core/JulianDate.js`。
 */
export class JulianDate {
  dayNumber: number
  secondsOfDay: number

  static leapSeconds: LeapSecond[] = []

  /**
   * @param julianDayNumber 儒略日整数部分（可含小数）
   * @param secondsOfDay 当天秒数
   * @param timeStandard 输入所用时间标准，默认 UTC
   */
  constructor(julianDayNumber?: number, secondsOfDay?: number, timeStandard?: TimeStandardValue) {
    const day = julianDayNumber ?? 0.0
    let seconds = secondsOfDay ?? 0.0
    const standard = timeStandard ?? TimeStandard.UTC
    const wholeDays = day | 0
    seconds = seconds + (day - wholeDays) * TimeConstants.SECONDS_PER_DAY
    this.dayNumber = 0
    this.secondsOfDay = 0
    setComponents(wholeDays, seconds, this)
    if (standard === TimeStandard.UTC) {
      convertUtcToTai(this)
    }
  }

  static fromGregorianDate(date: GregorianDate, result?: JulianDate): JulianDate {
    if (!(date instanceof GregorianDate)) {
      throw new DeveloperError("date must be a valid GregorianDate.")
    }
    const components = computeJulianDateComponents(
      date.year,
      date.month,
      date.day,
      date.hour,
      date.minute,
      date.second,
      date.millisecond,
    )
    if (!defined(result)) {
      return new JulianDate(components[0], components[1], TimeStandard.UTC)
    }
    setComponents(components[0], components[1], result)
    convertUtcToTai(result)
    return result
  }

  static fromDate(date: Date, result?: JulianDate): JulianDate {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new DeveloperError("date must be a valid JavaScript Date.")
    }
    const components = computeJulianDateComponents(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    )
    if (!defined(result)) {
      return new JulianDate(components[0], components[1], TimeStandard.UTC)
    }
    setComponents(components[0], components[1], result)
    convertUtcToTai(result)
    return result
  }

  static fromIso8601(iso8601String: string, result?: JulianDate): JulianDate {
    if (typeof iso8601String !== "string") {
      throw new DeveloperError(iso8601ErrorMessage)
    }
    const normalized = iso8601String.replace(",", ".")
    const split = normalized.split("T")
    const date = split[0]
    const time = split[1]
    if (!defined(date)) {
      throw new DeveloperError(iso8601ErrorMessage)
    }

    let year = 1
    let month = 1
    let day = 1
    let hour = 0
    let minute = 0
    let second = 0
    let millisecond = 0
    let inLeapYear = false
    let dayOfYear = 1

    let tokens = matchCalendarDate.exec(date)
    if (tokens !== null) {
      const dashCount = date.split("-").length - 1
      if (dashCount > 0 && dashCount !== 2) {
        throw new DeveloperError(iso8601ErrorMessage)
      }
      year = +(tokens[1] ?? 0)
      month = +(tokens[2] ?? 0)
      day = +(tokens[3] ?? 0)
    } else {
      tokens = matchCalendarMonth.exec(date)
      if (tokens !== null) {
        year = +(tokens[1] ?? 0)
        month = +(tokens[2] ?? 0)
      } else {
        tokens = matchCalendarYear.exec(date)
        if (tokens !== null) {
          year = +(tokens[1] ?? 0)
        } else {
          tokens = matchOrdinalDate.exec(date)
          if (tokens !== null) {
            year = +(tokens[1] ?? 0)
            dayOfYear = +(tokens[2] ?? 0)
            inLeapYear = isLeapYear(year)
            if (
              dayOfYear < 1 ||
              (inLeapYear && dayOfYear > 366) ||
              (!inLeapYear && dayOfYear > 365)
            ) {
              throw new DeveloperError(iso8601ErrorMessage)
            }
          } else {
            tokens = matchWeekDate.exec(date)
            if (tokens !== null) {
              year = +(tokens[1] ?? 0)
              const weekNumber = +(tokens[2] ?? 0)
              const dayOfWeek = +(tokens[3] ?? 0)
              const dashCount = date.split("-").length - 1
              if (
                dashCount > 0 &&
                ((!defined(tokens[3]) && dashCount !== 1) ||
                  (defined(tokens[3]) && dashCount !== 2))
              ) {
                throw new DeveloperError(iso8601ErrorMessage)
              }
              const january4 = new Date(Date.UTC(year, 0, 4))
              dayOfYear = weekNumber * 7 + dayOfWeek - january4.getUTCDay() - 3
            } else {
              throw new DeveloperError(iso8601ErrorMessage)
            }
          }
          const tmp = new Date(Date.UTC(year, 0, 1))
          tmp.setUTCDate(dayOfYear)
          month = tmp.getUTCMonth() + 1
          day = tmp.getUTCDate()
        }
      }
    }

    inLeapYear = isLeapYear(year)
    const monthDays = daysInMonth[month - 1] ?? 31
    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      ((month !== 2 || !inLeapYear) && day > monthDays) ||
      (inLeapYear && month === 2 && day > daysInLeapFebruary)
    ) {
      throw new DeveloperError(iso8601ErrorMessage)
    }

    if (defined(time)) {
      let offsetIndex: number
      tokens = matchHoursMinutesSeconds.exec(time)
      if (tokens !== null) {
        const colonCount = time.split(":").length - 1
        if (colonCount > 0 && colonCount !== 2 && colonCount !== 3) {
          throw new DeveloperError(iso8601ErrorMessage)
        }
        hour = +(tokens[1] ?? 0)
        minute = +(tokens[2] ?? 0)
        second = +(tokens[3] ?? 0)
        millisecond = +(tokens[4] ?? 0) * 1000.0
        offsetIndex = 5
      } else {
        tokens = matchHoursMinutes.exec(time)
        if (tokens !== null) {
          const colonCount = time.split(":").length - 1
          if (colonCount > 2) {
            throw new DeveloperError(iso8601ErrorMessage)
          }
          hour = +(tokens[1] ?? 0)
          minute = +(tokens[2] ?? 0)
          second = +(tokens[3] ?? 0) * 60.0
          offsetIndex = 4
        } else {
          tokens = matchHours.exec(time)
          if (tokens !== null) {
            hour = +(tokens[1] ?? 0)
            minute = +(tokens[2] ?? 0) * 60.0
            offsetIndex = 3
          } else {
            throw new DeveloperError(iso8601ErrorMessage)
          }
        }
      }

      if (
        minute >= 60 ||
        second >= 61 ||
        hour > 24 ||
        (hour === 24 && (minute > 0 || second > 0 || millisecond > 0))
      ) {
        throw new DeveloperError(iso8601ErrorMessage)
      }

      const offset = tokens[offsetIndex]
      const offsetHours = +(tokens[offsetIndex + 1] ?? 0)
      const offsetMinutes = +(tokens[offsetIndex + 2] ?? 0)
      switch (offset) {
        case "+":
          hour = hour - offsetHours
          minute = minute - offsetMinutes
          break
        case "-":
          hour = hour + offsetHours
          minute = minute + offsetMinutes
          break
        case "Z":
          break
        default:
          minute =
            minute + new Date(Date.UTC(year, month - 1, day, hour, minute)).getTimezoneOffset()
          break
      }
    }

    const isLeapSecond = second === 60
    if (isLeapSecond) {
      second--
    }

    while (minute >= 60) {
      minute -= 60
      hour++
    }
    while (hour >= 24) {
      hour -= 24
      day++
    }

    let tmpDays = inLeapYear && month === 2 ? daysInLeapFebruary : (daysInMonth[month - 1] ?? 31)
    while (day > tmpDays) {
      day -= tmpDays
      month++
      if (month > 12) {
        month -= 12
        year++
      }
      tmpDays = inLeapYear && month === 2 ? daysInLeapFebruary : (daysInMonth[month - 1] ?? 31)
    }

    while (minute < 0) {
      minute += 60
      hour--
    }
    while (hour < 0) {
      hour += 24
      day--
    }
    while (day < 1) {
      month--
      if (month < 1) {
        month += 12
        year--
      }
      tmpDays = inLeapYear && month === 2 ? daysInLeapFebruary : (daysInMonth[month - 1] ?? 31)
      day += tmpDays
    }

    const components = computeJulianDateComponents(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
    )
    let dest: JulianDate
    if (!defined(result)) {
      dest = new JulianDate(components[0], components[1], TimeStandard.UTC)
    } else {
      setComponents(components[0], components[1], result)
      convertUtcToTai(result)
      dest = result
    }
    if (isLeapSecond) {
      JulianDate.addSeconds(dest, 1, dest)
    }
    return dest
  }

  static now(result?: JulianDate): JulianDate {
    return JulianDate.fromDate(new Date(), result)
  }

  static toGregorianDate(julianDate: JulianDate, result?: GregorianDate): GregorianDate {
    if (!defined(julianDate)) {
      throw new DeveloperError("julianDate is required.")
    }
    let isLeapSecond = false
    let thisUtc = convertTaiToUtc(julianDate, toGregorianDateScratch)
    if (!defined(thisUtc)) {
      JulianDate.addSeconds(julianDate, -1, toGregorianDateScratch)
      thisUtc = convertTaiToUtc(toGregorianDateScratch, toGregorianDateScratch)
      isLeapSecond = true
    }
    if (!defined(thisUtc)) {
      throw new DeveloperError("julianDate is required.")
    }

    let julianDayNumber = thisUtc.dayNumber
    const secondsOfDay = thisUtc.secondsOfDay
    if (secondsOfDay >= 43200.0) {
      julianDayNumber += 1
    }

    let L = (julianDayNumber + 68569) | 0
    const N = ((4 * L) / 146097) | 0
    L = (L - (((146097 * N + 3) / 4) | 0)) | 0
    const I = ((4000 * (L + 1)) / 1461001) | 0
    L = (L - (((1461 * I) / 4) | 0) + 31) | 0
    const J = ((80 * L) / 2447) | 0
    const day = (L - (((2447 * J) / 80) | 0)) | 0
    L = (J / 11) | 0
    const month = (J + 2 - 12 * L) | 0
    const year = (100 * (N - 49) + I + L) | 0

    let hour = (secondsOfDay / TimeConstants.SECONDS_PER_HOUR) | 0
    let remainingSeconds = secondsOfDay - hour * TimeConstants.SECONDS_PER_HOUR
    const minute = (remainingSeconds / TimeConstants.SECONDS_PER_MINUTE) | 0
    remainingSeconds = remainingSeconds - minute * TimeConstants.SECONDS_PER_MINUTE
    let second = remainingSeconds | 0
    const millisecond = (remainingSeconds - second) / TimeConstants.SECONDS_PER_MILLISECOND

    hour += 12
    if (hour > 23) {
      hour -= 24
    }
    if (isLeapSecond) {
      second += 1
    }

    if (!defined(result)) {
      return new GregorianDate(year, month, day, hour, minute, second, millisecond, isLeapSecond)
    }
    result.year = year
    result.month = month
    result.day = day
    result.hour = hour
    result.minute = minute
    result.second = second
    result.millisecond = millisecond
    result.isLeapSecond = isLeapSecond
    return result
  }

  static toDate(julianDate: JulianDate): Date {
    if (!defined(julianDate)) {
      throw new DeveloperError("julianDate is required.")
    }
    const gDate = JulianDate.toGregorianDate(julianDate, gregorianDateScratch)
    let second = gDate.second
    if (gDate.isLeapSecond) {
      second -= 1
    }
    return new Date(
      Date.UTC(
        gDate.year,
        gDate.month - 1,
        gDate.day,
        gDate.hour,
        gDate.minute,
        second,
        gDate.millisecond,
      ),
    )
  }

  static toIso8601(julianDate: JulianDate, precision?: number): string {
    if (!defined(julianDate)) {
      throw new DeveloperError("julianDate is required.")
    }
    const gDate = JulianDate.toGregorianDate(julianDate, gregorianDateScratch)
    let year = gDate.year
    let month = gDate.month
    let day = gDate.day
    let hour = gDate.hour
    const minute = gDate.minute
    const second = gDate.second
    const millisecond = gDate.millisecond

    if (
      year === 10000 &&
      month === 1 &&
      day === 1 &&
      hour === 0 &&
      minute === 0 &&
      second === 0 &&
      millisecond === 0
    ) {
      year = 9999
      month = 12
      day = 31
      hour = 24
    }

    const y = year.toString().padStart(4, "0")
    const mo = month.toString().padStart(2, "0")
    const d = day.toString().padStart(2, "0")
    const h = hour.toString().padStart(2, "0")
    const mi = minute.toString().padStart(2, "0")
    const s = second.toString().padStart(2, "0")

    if (!defined(precision) && millisecond !== 0) {
      const millisecondHundreds = millisecond * 0.01
      const millisecondStr =
        millisecondHundreds < 1e-6
          ? millisecondHundreds.toFixed(20).replace(".", "").replace(/0+$/, "")
          : millisecondHundreds.toString().replace(".", "")
      return `${y}-${mo}-${d}T${h}:${mi}:${s}.${millisecondStr}Z`
    }
    if (!defined(precision) || precision === 0) {
      return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`
    }
    const millisecondStr = (millisecond * 0.01)
      .toFixed(precision)
      .replace(".", "")
      .slice(0, precision)
    return `${y}-${mo}-${d}T${h}:${mi}:${s}.${millisecondStr}Z`
  }

  static clone(julianDate?: JulianDate, result?: JulianDate): JulianDate | undefined {
    if (!defined(julianDate)) {
      return undefined
    }
    if (!defined(result)) {
      return new JulianDate(julianDate.dayNumber, julianDate.secondsOfDay, TimeStandard.TAI)
    }
    result.dayNumber = julianDate.dayNumber
    result.secondsOfDay = julianDate.secondsOfDay
    return result
  }

  static compare(left: JulianDate, right: JulianDate): number {
    if (!defined(left)) {
      throw new DeveloperError("left is required.")
    }
    if (!defined(right)) {
      throw new DeveloperError("right is required.")
    }
    const julianDayNumberDifference = left.dayNumber - right.dayNumber
    if (julianDayNumberDifference !== 0) {
      return julianDayNumberDifference
    }
    return left.secondsOfDay - right.secondsOfDay
  }

  static equals(left?: JulianDate, right?: JulianDate): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left.dayNumber === right.dayNumber &&
        left.secondsOfDay === right.secondsOfDay)
    )
  }

  static equalsEpsilon(left?: JulianDate, right?: JulianDate, epsilon?: number): boolean {
    const resolved = epsilon ?? 0
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Math.abs(JulianDate.secondsDifference(left, right)) <= resolved)
    )
  }

  static totalDays(julianDate: JulianDate): number {
    if (!defined(julianDate)) {
      throw new DeveloperError("julianDate is required.")
    }
    return julianDate.dayNumber + julianDate.secondsOfDay / TimeConstants.SECONDS_PER_DAY
  }

  static secondsDifference(left: JulianDate, right: JulianDate): number {
    if (!defined(left)) {
      throw new DeveloperError("left is required.")
    }
    if (!defined(right)) {
      throw new DeveloperError("right is required.")
    }
    const dayDifference = (left.dayNumber - right.dayNumber) * TimeConstants.SECONDS_PER_DAY
    return dayDifference + (left.secondsOfDay - right.secondsOfDay)
  }

  static daysDifference(left: JulianDate, right: JulianDate): number {
    if (!defined(left)) {
      throw new DeveloperError("left is required.")
    }
    if (!defined(right)) {
      throw new DeveloperError("right is required.")
    }
    const dayDifference = left.dayNumber - right.dayNumber
    const secondDifference =
      (left.secondsOfDay - right.secondsOfDay) / TimeConstants.SECONDS_PER_DAY
    return dayDifference + secondDifference
  }

  static computeTaiMinusUtc(julianDate: JulianDate): number {
    binarySearchScratchLeapSecond.julianDate = julianDate
    const leapSeconds = JulianDate.leapSeconds
    let index = binarySearch(leapSeconds, binarySearchScratchLeapSecond, compareLeapSecondDates)
    if (index < 0) {
      index = ~index
      --index
      if (index < 0) {
        index = 0
      }
    }
    return leapSeconds[index]?.offset ?? 0
  }

  static addSeconds(julianDate: JulianDate, seconds: number, result: JulianDate): JulianDate {
    if (!defined(julianDate)) {
      throw new DeveloperError("julianDate is required.")
    }
    if (!defined(seconds)) {
      throw new DeveloperError("seconds is required.")
    }
    if (!defined(result)) {
      throw new DeveloperError("result is required.")
    }
    return setComponents(julianDate.dayNumber, julianDate.secondsOfDay + seconds, result)
  }

  static addMinutes(julianDate: JulianDate, minutes: number, result: JulianDate): JulianDate {
    if (!defined(julianDate)) {
      throw new DeveloperError("julianDate is required.")
    }
    if (!defined(minutes)) {
      throw new DeveloperError("minutes is required.")
    }
    if (!defined(result)) {
      throw new DeveloperError("result is required.")
    }
    return setComponents(
      julianDate.dayNumber,
      julianDate.secondsOfDay + minutes * TimeConstants.SECONDS_PER_MINUTE,
      result,
    )
  }

  static addHours(julianDate: JulianDate, hours: number, result: JulianDate): JulianDate {
    if (!defined(julianDate)) {
      throw new DeveloperError("julianDate is required.")
    }
    if (!defined(hours)) {
      throw new DeveloperError("hours is required.")
    }
    if (!defined(result)) {
      throw new DeveloperError("result is required.")
    }
    return setComponents(
      julianDate.dayNumber,
      julianDate.secondsOfDay + hours * TimeConstants.SECONDS_PER_HOUR,
      result,
    )
  }

  static addDays(julianDate: JulianDate, days: number, result: JulianDate): JulianDate {
    if (!defined(julianDate)) {
      throw new DeveloperError("julianDate is required.")
    }
    if (!defined(days)) {
      throw new DeveloperError("days is required.")
    }
    if (!defined(result)) {
      throw new DeveloperError("result is required.")
    }
    return setComponents(julianDate.dayNumber + days, julianDate.secondsOfDay, result)
  }

  static lessThan(left: JulianDate, right: JulianDate): boolean {
    return JulianDate.compare(left, right) < 0
  }

  static lessThanOrEquals(left: JulianDate, right: JulianDate): boolean {
    return JulianDate.compare(left, right) <= 0
  }

  static greaterThan(left: JulianDate, right: JulianDate): boolean {
    return JulianDate.compare(left, right) > 0
  }

  static greaterThanOrEquals(left: JulianDate, right: JulianDate): boolean {
    return JulianDate.compare(left, right) >= 0
  }

  clone(result?: JulianDate): JulianDate | undefined {
    return JulianDate.clone(this, result)
  }

  equals(right?: JulianDate): boolean {
    return JulianDate.equals(this, right)
  }

  equalsEpsilon(right?: JulianDate, epsilon?: number): boolean {
    return JulianDate.equalsEpsilon(this, right, epsilon)
  }

  toString(): string {
    return JulianDate.toIso8601(this)
  }
}

const toGregorianDateScratch = new JulianDate(0, 0, TimeStandard.TAI)

JulianDate.leapSeconds = [
  new LeapSecond(new JulianDate(2441317, 43210.0, TimeStandard.TAI), 10),
  new LeapSecond(new JulianDate(2441499, 43211.0, TimeStandard.TAI), 11),
  new LeapSecond(new JulianDate(2441683, 43212.0, TimeStandard.TAI), 12),
  new LeapSecond(new JulianDate(2442048, 43213.0, TimeStandard.TAI), 13),
  new LeapSecond(new JulianDate(2442413, 43214.0, TimeStandard.TAI), 14),
  new LeapSecond(new JulianDate(2442778, 43215.0, TimeStandard.TAI), 15),
  new LeapSecond(new JulianDate(2443144, 43216.0, TimeStandard.TAI), 16),
  new LeapSecond(new JulianDate(2443509, 43217.0, TimeStandard.TAI), 17),
  new LeapSecond(new JulianDate(2443874, 43218.0, TimeStandard.TAI), 18),
  new LeapSecond(new JulianDate(2444239, 43219.0, TimeStandard.TAI), 19),
  new LeapSecond(new JulianDate(2444786, 43220.0, TimeStandard.TAI), 20),
  new LeapSecond(new JulianDate(2445151, 43221.0, TimeStandard.TAI), 21),
  new LeapSecond(new JulianDate(2445516, 43222.0, TimeStandard.TAI), 22),
  new LeapSecond(new JulianDate(2446247, 43223.0, TimeStandard.TAI), 23),
  new LeapSecond(new JulianDate(2447161, 43224.0, TimeStandard.TAI), 24),
  new LeapSecond(new JulianDate(2447892, 43225.0, TimeStandard.TAI), 25),
  new LeapSecond(new JulianDate(2448257, 43226.0, TimeStandard.TAI), 26),
  new LeapSecond(new JulianDate(2448804, 43227.0, TimeStandard.TAI), 27),
  new LeapSecond(new JulianDate(2449169, 43228.0, TimeStandard.TAI), 28),
  new LeapSecond(new JulianDate(2449534, 43229.0, TimeStandard.TAI), 29),
  new LeapSecond(new JulianDate(2450083, 43230.0, TimeStandard.TAI), 30),
  new LeapSecond(new JulianDate(2450630, 43231.0, TimeStandard.TAI), 31),
  new LeapSecond(new JulianDate(2451179, 43232.0, TimeStandard.TAI), 32),
  new LeapSecond(new JulianDate(2453736, 43233.0, TimeStandard.TAI), 33),
  new LeapSecond(new JulianDate(2454832, 43234.0, TimeStandard.TAI), 34),
  new LeapSecond(new JulianDate(2456109, 43235.0, TimeStandard.TAI), 35),
  new LeapSecond(new JulianDate(2457204, 43236.0, TimeStandard.TAI), 36),
  new LeapSecond(new JulianDate(2457754, 43237.0, TimeStandard.TAI), 37),
]
