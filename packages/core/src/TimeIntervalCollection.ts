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
import { Frozen } from "./Frozen"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { Event } from "./Event"
import { GregorianDate } from "./GregorianDate"
import { isLeapYear } from "./isLeapYear"
import { Iso8601 } from "./Iso8601"
import { JulianDate } from "./JulianDate"
import {
  TimeInterval,
  type TimeIntervalDataComparer,
  type TimeIntervalMergeCallback,
} from "./TimeInterval"

function compareIntervalStartTimes(left: TimeInterval, right: TimeInterval): number {
  return JulianDate.compare(left.start, right.start)
}

/** 按儒略日数组建集合的选项 */
export interface TimeIntervalCollectionFromJulianDatesOptions {
  julianDates: JulianDate[]
  isStartIncluded?: boolean | undefined
  isStopIncluded?: boolean | undefined
  leadingInterval?: boolean | undefined
  trailingInterval?: boolean | undefined
  dataCallback?: ((interval: TimeInterval, index: number) => unknown) | undefined
}

/** ISO8601 区间字符串选项 */
export interface TimeIntervalCollectionFromIso8601Options {
  iso8601: string
  isStartIncluded?: boolean
  isStopIncluded?: boolean
  leadingInterval?: boolean
  trailingInterval?: boolean
  dataCallback?: (interval: TimeInterval, index: number) => unknown
}

/** ISO8601 日期数组选项 */
export interface TimeIntervalCollectionFromIso8601DatesOptions {
  iso8601Dates: string[]
  isStartIncluded?: boolean
  isStopIncluded?: boolean
  leadingInterval?: boolean
  trailingInterval?: boolean
  dataCallback?: (interval: TimeInterval, index: number) => unknown
}

/** ISO8601 时长数组选项 */
export interface TimeIntervalCollectionFromIso8601DurationsOptions {
  epoch: JulianDate
  iso8601Durations: string[]
  relativeToPrevious?: boolean
  isStartIncluded?: boolean
  isStopIncluded?: boolean
  leadingInterval?: boolean
  trailingInterval?: boolean
  dataCallback?: (interval: TimeInterval, index: number) => unknown
}

/**
 * 不重叠、按 start 排序的 TimeInterval 集合。
 * 对标 Cesium `Core/TimeIntervalCollection.js`。
 */
export class TimeIntervalCollection {
  private readonly _intervals: TimeInterval[] = []
  private readonly _changedEvent = new Event<[TimeIntervalCollection]>()

  /**
   * @param intervals 初始区间
   */
  constructor(intervals?: TimeInterval[]) {
    if (defined(intervals)) {
      for (const interval of intervals) {
        this.addInterval(interval)
      }
    }
  }

  get changedEvent(): Event<[TimeIntervalCollection]> {
    return this._changedEvent
  }

  get start(): JulianDate | undefined {
    return this._intervals.length === 0 ? undefined : this._intervals[0]?.start
  }

  get isStartIncluded(): boolean {
    return this._intervals.length === 0 ? false : (this._intervals[0]?.isStartIncluded ?? false)
  }

  get stop(): JulianDate | undefined {
    const intervals = this._intervals
    const length = intervals.length
    return length === 0 ? undefined : intervals[length - 1]?.stop
  }

  get isStopIncluded(): boolean {
    const intervals = this._intervals
    const length = intervals.length
    return length === 0 ? false : (intervals[length - 1]?.isStopIncluded ?? false)
  }

  get length(): number {
    return this._intervals.length
  }

  get isEmpty(): boolean {
    return this._intervals.length === 0
  }

  equals(right?: TimeIntervalCollection, dataComparer?: TimeIntervalDataComparer): boolean {
    if (this === right) {
      return true
    }
    if (!(right instanceof TimeIntervalCollection)) {
      return false
    }
    const intervals = this._intervals
    const rightIntervals = right._intervals
    if (intervals.length !== rightIntervals.length) {
      return false
    }
    for (let i = 0; i < intervals.length; i++) {
      if (!TimeInterval.equals(intervals[i], rightIntervals[i], dataComparer)) {
        return false
      }
    }
    return true
  }

  get(index: number): TimeInterval | undefined {
    if (!defined(index)) {
      throw new DeveloperError("index is required.")
    }
    return this._intervals[index]
  }

  removeAll(): void {
    if (this._intervals.length > 0) {
      this._intervals.length = 0
      this._changedEvent.raiseEvent(this)
    }
  }

  findIntervalContainingDate(date: JulianDate): TimeInterval | undefined {
    const index = this.indexOf(date)
    return index >= 0 ? this._intervals[index] : undefined
  }

  findDataForIntervalContainingDate(date: JulianDate): unknown {
    const index = this.indexOf(date)
    return index >= 0 ? this._intervals[index]?.data : undefined
  }

  contains(julianDate: JulianDate): boolean {
    return this.indexOf(julianDate) >= 0
  }

  indexOf(date: JulianDate): number {
    if (!defined(date)) {
      throw new DeveloperError("date is required")
    }
    const intervals = this._intervals
    indexOfScratch.start = date
    indexOfScratch.stop = date
    let index = binarySearch(intervals, indexOfScratch, compareIntervalStartTimes)
    if (index >= 0) {
      const at = intervals[index]
      if (at?.isStartIncluded) {
        return index
      }
      const prev = intervals[index - 1]
      if (index > 0 && prev?.stop.equals(date) && prev.isStopIncluded) {
        return index - 1
      }
      return ~index
    }
    index = ~index
    const prev = intervals[index - 1]
    if (
      index > 0 &&
      index - 1 < intervals.length &&
      defined(prev) &&
      TimeInterval.contains(prev, date)
    ) {
      return index - 1
    }
    return ~index
  }

  findInterval(options?: {
    start?: JulianDate
    stop?: JulianDate
    isStartIncluded?: boolean
    isStopIncluded?: boolean
  }): TimeInterval | undefined {
    const resolved = options ?? Frozen.EMPTY_OBJECT
    const start = resolved.start
    const stop = resolved.stop
    const isStartIncluded = resolved.isStartIncluded
    const isStopIncluded = resolved.isStopIncluded
    for (const interval of this._intervals) {
      if (
        (!defined(start) || interval.start.equals(start)) &&
        (!defined(stop) || interval.stop.equals(stop)) &&
        (!defined(isStartIncluded) || interval.isStartIncluded === isStartIncluded) &&
        (!defined(isStopIncluded) || interval.isStopIncluded === isStopIncluded)
      ) {
        return interval
      }
    }
    return undefined
  }

  addInterval(interval: TimeInterval, dataComparer?: TimeIntervalDataComparer): void {
    if (!defined(interval)) {
      throw new DeveloperError("interval is required")
    }
    if (interval.isEmpty) {
      return
    }

    const intervals = this._intervals
    const last = intervals[intervals.length - 1]
    if (
      intervals.length === 0 ||
      (defined(last) && JulianDate.greaterThan(interval.start, last.stop))
    ) {
      intervals.push(interval)
      this._changedEvent.raiseEvent(this)
      return
    }

    let index = binarySearch(intervals, interval, compareIntervalStartTimes)
    if (index < 0) {
      index = ~index
    } else {
      const prev = intervals[index - 1]
      const at = intervals[index]
      if (
        index > 0 &&
        interval.isStartIncluded &&
        prev?.isStartIncluded &&
        prev.start.equals(interval.start)
      ) {
        --index
      } else if (
        index < intervals.length &&
        !interval.isStartIncluded &&
        at?.isStartIncluded &&
        at.start.equals(interval.start)
      ) {
        ++index
      }
    }

    let working = interval
    let comparison: number
    if (index > 0) {
      const before = intervals[index - 1]
      if (defined(before)) {
        comparison = JulianDate.compare(before.stop, working.start)
        if (
          comparison > 0 ||
          (comparison === 0 && (before.isStopIncluded || working.isStartIncluded))
        ) {
          if (
            defined(dataComparer)
              ? dataComparer(before.data, working.data)
              : before.data === working.data
          ) {
            if (JulianDate.greaterThan(working.stop, before.stop)) {
              working = new TimeInterval({
                start: before.start,
                stop: working.stop,
                isStartIncluded: before.isStartIncluded,
                isStopIncluded: working.isStopIncluded,
                data: working.data,
              })
            } else {
              working = new TimeInterval({
                start: before.start,
                stop: before.stop,
                isStartIncluded: before.isStartIncluded,
                isStopIncluded:
                  before.isStopIncluded ||
                  (working.stop.equals(before.stop) && working.isStopIncluded),
                data: working.data,
              })
            }
            intervals.splice(index - 1, 1)
            --index
          } else {
            comparison = JulianDate.compare(before.stop, working.stop)
            if (
              comparison > 0 ||
              (comparison === 0 && before.isStopIncluded && !working.isStopIncluded)
            ) {
              intervals.splice(
                index,
                0,
                new TimeInterval({
                  start: working.stop,
                  stop: before.stop,
                  isStartIncluded: !working.isStopIncluded,
                  isStopIncluded: before.isStopIncluded,
                  data: before.data,
                }),
              )
            }
            intervals[index - 1] = new TimeInterval({
              start: before.start,
              stop: working.start,
              isStartIncluded: before.isStartIncluded,
              isStopIncluded: !working.isStartIncluded,
              data: before.data,
            })
          }
        }
      }
    }

    while (index < intervals.length) {
      const at = intervals[index]
      if (!defined(at)) {
        break
      }
      comparison = JulianDate.compare(working.stop, at.start)
      if (comparison > 0 || (comparison === 0 && (working.isStopIncluded || at.isStartIncluded))) {
        if (
          defined(dataComparer) ? dataComparer(at.data, working.data) : at.data === working.data
        ) {
          working = new TimeInterval({
            start: working.start,
            stop: JulianDate.greaterThan(at.stop, working.stop) ? at.stop : working.stop,
            isStartIncluded: working.isStartIncluded,
            isStopIncluded: JulianDate.greaterThan(at.stop, working.stop)
              ? at.isStopIncluded
              : working.isStopIncluded,
            data: working.data,
          })
          intervals.splice(index, 1)
        } else {
          intervals[index] = new TimeInterval({
            start: working.stop,
            stop: at.stop,
            isStartIncluded: !working.isStopIncluded,
            isStopIncluded: at.isStopIncluded,
            data: at.data,
          })
          if (intervals[index]?.isEmpty) {
            intervals.splice(index, 1)
          } else {
            break
          }
        }
      } else {
        break
      }
    }

    intervals.splice(index, 0, working)
    this._changedEvent.raiseEvent(this)
  }

  removeInterval(interval: TimeInterval): boolean {
    if (!defined(interval)) {
      throw new DeveloperError("interval is required")
    }
    if (interval.isEmpty) {
      return false
    }

    const intervals = this._intervals
    let index = binarySearch(intervals, interval, compareIntervalStartTimes)
    if (index < 0) {
      index = ~index
    }

    let result = false
    const before = intervals[index - 1]
    if (
      index > 0 &&
      defined(before) &&
      (JulianDate.greaterThan(before.stop, interval.start) ||
        (before.stop.equals(interval.start) && before.isStopIncluded && interval.isStartIncluded))
    ) {
      result = true
      if (
        JulianDate.greaterThan(before.stop, interval.stop) ||
        (before.isStopIncluded && !interval.isStopIncluded && before.stop.equals(interval.stop))
      ) {
        intervals.splice(
          index,
          0,
          new TimeInterval({
            start: interval.stop,
            stop: before.stop,
            isStartIncluded: !interval.isStopIncluded,
            isStopIncluded: before.isStopIncluded,
            data: before.data,
          }),
        )
      }
      intervals[index - 1] = new TimeInterval({
        start: before.start,
        stop: interval.start,
        isStartIncluded: before.isStartIncluded,
        isStopIncluded: !interval.isStartIncluded,
        data: before.data,
      })
    }

    const atStart = intervals[index]
    if (
      index < intervals.length &&
      !interval.isStartIncluded &&
      atStart?.isStartIncluded &&
      interval.start.equals(atStart.start)
    ) {
      result = true
      intervals.splice(
        index,
        0,
        new TimeInterval({
          start: atStart.start,
          stop: atStart.start,
          isStartIncluded: true,
          isStopIncluded: true,
          data: atStart.data,
        }),
      )
      ++index
    }

    while (index < intervals.length) {
      const at = intervals[index]
      if (!defined(at) || !JulianDate.greaterThan(interval.stop, at.stop)) {
        break
      }
      result = true
      intervals.splice(index, 1)
    }

    const atEnd = intervals[index]
    if (index < intervals.length && defined(atEnd) && interval.stop.equals(atEnd.stop)) {
      result = true
      if (!interval.isStopIncluded && atEnd.isStopIncluded) {
        const next = intervals[index + 1]
        if (
          index + 1 < intervals.length &&
          next?.start.equals(interval.stop) &&
          atEnd.data === next.data
        ) {
          intervals.splice(index, 1)
          const after = intervals[index]
          if (defined(after)) {
            intervals[index] = new TimeInterval({
              start: after.start,
              stop: after.stop,
              isStartIncluded: true,
              isStopIncluded: after.isStopIncluded,
              data: after.data,
            })
          }
        } else {
          intervals[index] = new TimeInterval({
            start: interval.stop,
            stop: interval.stop,
            isStartIncluded: true,
            isStopIncluded: true,
            data: atEnd.data,
          })
        }
      } else {
        intervals.splice(index, 1)
      }
    }

    const truncated = intervals[index]
    if (
      index < intervals.length &&
      defined(truncated) &&
      (JulianDate.greaterThan(interval.stop, truncated.start) ||
        (interval.stop.equals(truncated.start) &&
          interval.isStopIncluded &&
          truncated.isStartIncluded))
    ) {
      result = true
      intervals[index] = new TimeInterval({
        start: interval.stop,
        stop: truncated.stop,
        isStartIncluded: !interval.isStopIncluded,
        isStopIncluded: truncated.isStopIncluded,
        data: truncated.data,
      })
    }

    if (result) {
      this._changedEvent.raiseEvent(this)
    }
    return result
  }

  intersect(
    other: TimeIntervalCollection,
    dataComparer?: TimeIntervalDataComparer,
    mergeCallback?: TimeIntervalMergeCallback,
  ): TimeIntervalCollection {
    if (!defined(other)) {
      throw new DeveloperError("other is required.")
    }
    const result = new TimeIntervalCollection()
    let left = 0
    let right = 0
    const intervals = this._intervals
    const otherIntervals = other._intervals
    while (left < intervals.length && right < otherIntervals.length) {
      const leftInterval = intervals[left]
      const rightInterval = otherIntervals[right]
      if (!defined(leftInterval) || !defined(rightInterval)) {
        break
      }
      if (JulianDate.lessThan(leftInterval.stop, rightInterval.start)) {
        ++left
      } else if (JulianDate.lessThan(rightInterval.stop, leftInterval.start)) {
        ++right
      } else {
        if (
          defined(mergeCallback) ||
          (defined(dataComparer) && dataComparer(leftInterval.data, rightInterval.data)) ||
          (!defined(dataComparer) && rightInterval.data === leftInterval.data)
        ) {
          const intersection = TimeInterval.intersect(
            leftInterval,
            rightInterval,
            new TimeInterval(),
            mergeCallback,
          )
          if (!intersection.isEmpty) {
            result.addInterval(intersection, dataComparer)
          }
        }
        if (
          JulianDate.lessThan(leftInterval.stop, rightInterval.stop) ||
          (leftInterval.stop.equals(rightInterval.stop) &&
            !leftInterval.isStopIncluded &&
            rightInterval.isStopIncluded)
        ) {
          ++left
        } else {
          ++right
        }
      }
    }
    return result
  }

  static fromJulianDateArray(
    options: TimeIntervalCollectionFromJulianDatesOptions,
    result?: TimeIntervalCollection,
  ): TimeIntervalCollection {
    if (!defined(options)) {
      throw new DeveloperError("options is required.")
    }
    if (!defined(options.julianDates)) {
      throw new DeveloperError("options.iso8601Array is required.")
    }
    const dest = result ?? new TimeIntervalCollection()
    const julianDates = options.julianDates
    const length = julianDates.length
    const dataCallback = options.dataCallback
    const isStartIncluded = options.isStartIncluded ?? true
    const isStopIncluded = options.isStopIncluded ?? true
    const leadingInterval = options.leadingInterval ?? false
    const trailingInterval = options.trailingInterval ?? false

    let startIndex = 0
    if (leadingInterval) {
      ++startIndex
      const first = julianDates[0]
      if (defined(first)) {
        const interval = new TimeInterval({
          start: Iso8601.MINIMUM_VALUE,
          stop: first,
          isStartIncluded: true,
          isStopIncluded: !isStartIncluded,
        })
        interval.data = defined(dataCallback) ? dataCallback(interval, dest.length) : dest.length
        dest.addInterval(interval)
      }
    }

    for (let i = 0; i < length - 1; ++i) {
      const startDate = julianDates[i]
      const endDate = julianDates[i + 1]
      if (!defined(startDate) || !defined(endDate)) {
        continue
      }
      const interval = new TimeInterval({
        start: startDate,
        stop: endDate,
        isStartIncluded: dest.length === startIndex ? isStartIncluded : true,
        isStopIncluded: i === length - 2 ? isStopIncluded : false,
      })
      interval.data = defined(dataCallback) ? dataCallback(interval, dest.length) : dest.length
      dest.addInterval(interval)
    }

    if (trailingInterval) {
      const last = julianDates[length - 1]
      if (defined(last)) {
        const interval = new TimeInterval({
          start: last,
          stop: Iso8601.MAXIMUM_VALUE,
          isStartIncluded: !isStopIncluded,
          isStopIncluded: true,
        })
        interval.data = defined(dataCallback) ? dataCallback(interval, dest.length) : dest.length
        dest.addInterval(interval)
      }
    }
    return dest
  }

  static fromIso8601(
    options: TimeIntervalCollectionFromIso8601Options,
    result?: TimeIntervalCollection,
  ): TimeIntervalCollection {
    if (!defined(options)) {
      throw new DeveloperError("options is required.")
    }
    if (!defined(options.iso8601)) {
      throw new DeveloperError("options.iso8601 is required.")
    }
    const dates = options.iso8601.split("/")
    const startStr = dates[0]
    const stopStr = dates[1]
    if (!defined(startStr) || !defined(stopStr)) {
      throw new DeveloperError("options.iso8601 is required.")
    }
    const start = JulianDate.fromIso8601(startStr)
    const stop = JulianDate.fromIso8601(stopStr)
    const julianDates: JulianDate[] = []
    if (!parseDuration(dates[2], scratchDuration)) {
      julianDates.push(start, stop)
    } else {
      let date = JulianDate.clone(start)!
      julianDates.push(date)
      while (JulianDate.compare(date, stop) < 0) {
        date = addToDate(date, scratchDuration)
        if (JulianDate.compare(stop, date) <= 0) {
          JulianDate.clone(stop, date)
        }
        julianDates.push(date)
      }
    }
    return TimeIntervalCollection.fromJulianDateArray(
      {
        julianDates,
        isStartIncluded: options.isStartIncluded,
        isStopIncluded: options.isStopIncluded,
        leadingInterval: options.leadingInterval,
        trailingInterval: options.trailingInterval,
        dataCallback: options.dataCallback,
      },
      result,
    )
  }

  static fromIso8601DateArray(
    options: TimeIntervalCollectionFromIso8601DatesOptions,
    result?: TimeIntervalCollection,
  ): TimeIntervalCollection {
    if (!defined(options)) {
      throw new DeveloperError("options is required.")
    }
    if (!defined(options.iso8601Dates)) {
      throw new DeveloperError("options.iso8601Dates is required.")
    }
    return TimeIntervalCollection.fromJulianDateArray(
      {
        julianDates: options.iso8601Dates.map((date) => JulianDate.fromIso8601(date)),
        isStartIncluded: options.isStartIncluded,
        isStopIncluded: options.isStopIncluded,
        leadingInterval: options.leadingInterval,
        trailingInterval: options.trailingInterval,
        dataCallback: options.dataCallback,
      },
      result,
    )
  }

  static fromIso8601DurationArray(
    options: TimeIntervalCollectionFromIso8601DurationsOptions,
    result?: TimeIntervalCollection,
  ): TimeIntervalCollection {
    if (!defined(options)) {
      throw new DeveloperError("options is required.")
    }
    if (!defined(options.epoch)) {
      throw new DeveloperError("options.epoch is required.")
    }
    if (!defined(options.iso8601Durations)) {
      throw new DeveloperError("options.iso8601Durations is required.")
    }
    const epoch = options.epoch
    const iso8601Durations = options.iso8601Durations
    const relativeToPrevious = options.relativeToPrevious ?? false
    const julianDates: JulianDate[] = []
    let previousDate: JulianDate | undefined
    for (let i = 0; i < iso8601Durations.length; ++i) {
      const duration = iso8601Durations[i]
      if ((defined(duration) && parseDuration(duration, scratchDuration)) || i === 0) {
        const date =
          relativeToPrevious && defined(previousDate)
            ? addToDate(previousDate, scratchDuration)
            : addToDate(epoch, scratchDuration)
        julianDates.push(date)
        previousDate = date
      }
    }
    return TimeIntervalCollection.fromJulianDateArray(
      {
        julianDates,
        isStartIncluded: options.isStartIncluded,
        isStopIncluded: options.isStopIncluded,
        leadingInterval: options.leadingInterval,
        trailingInterval: options.trailingInterval,
        dataCallback: options.dataCallback,
      },
      result,
    )
  }
}

const indexOfScratch = new TimeInterval()
const scratchGregorianDate = new GregorianDate()
const monthLengths = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function addToDate(
  julianDate: JulianDate,
  duration: GregorianDate,
  result?: JulianDate,
): JulianDate {
  const dest = result ?? new JulianDate()
  JulianDate.toGregorianDate(julianDate, scratchGregorianDate)
  let millisecond = scratchGregorianDate.millisecond + duration.millisecond
  let second = scratchGregorianDate.second + duration.second
  let minute = scratchGregorianDate.minute + duration.minute
  let hour = scratchGregorianDate.hour + duration.hour
  let day = scratchGregorianDate.day + duration.day
  let month = scratchGregorianDate.month + duration.month
  let year = scratchGregorianDate.year + duration.year

  if (millisecond >= 1000) {
    second += Math.floor(millisecond / 1000)
    millisecond = millisecond % 1000
  }
  if (second >= 60) {
    minute += Math.floor(second / 60)
    second = second % 60
  }
  if (minute >= 60) {
    hour += Math.floor(minute / 60)
    minute = minute % 60
  }
  if (hour >= 24) {
    day += Math.floor(hour / 24)
    hour = hour % 24
  }

  monthLengths[2] = isLeapYear(year) ? 29 : 28
  while (day > (monthLengths[month] ?? 31) || month >= 13) {
    const daysThisMonth = monthLengths[month] ?? 31
    if (day > daysThisMonth) {
      day -= daysThisMonth
      ++month
    }
    if (month >= 13) {
      --month
      year += Math.floor(month / 12)
      month = month % 12
      ++month
    }
    monthLengths[2] = isLeapYear(year) ? 29 : 28
  }

  scratchGregorianDate.millisecond = millisecond
  scratchGregorianDate.second = second
  scratchGregorianDate.minute = minute
  scratchGregorianDate.hour = hour
  scratchGregorianDate.day = day
  scratchGregorianDate.month = month
  scratchGregorianDate.year = year
  return JulianDate.fromGregorianDate(scratchGregorianDate, dest)
}

const scratchJulianDate = new JulianDate()
const durationRegex =
  /P(?:([\d.,]+)Y)?(?:([\d.,]+)M)?(?:([\d.,]+)W)?(?:([\d.,]+)D)?(?:T(?:([\d.,]+)H)?(?:([\d.,]+)M)?(?:([\d.,]+)S)?)?/

function parseDuration(iso8601: string | undefined, result: GregorianDate): boolean {
  if (!defined(iso8601) || iso8601.length === 0) {
    return false
  }
  result.year = 0
  result.month = 0
  result.day = 0
  result.hour = 0
  result.minute = 0
  result.second = 0
  result.millisecond = 0

  if (iso8601.startsWith("P")) {
    const matches = durationRegex.exec(iso8601)
    if (!defined(matches)) {
      return false
    }
    if (defined(matches[1])) {
      result.year = Number(matches[1].replace(",", "."))
    }
    if (defined(matches[2])) {
      result.month = Number(matches[2].replace(",", "."))
    }
    if (defined(matches[3])) {
      result.day = Number(matches[3].replace(",", ".")) * 7
    }
    if (defined(matches[4])) {
      result.day += Number(matches[4].replace(",", "."))
    }
    if (defined(matches[5])) {
      result.hour = Number(matches[5].replace(",", "."))
    }
    if (defined(matches[6])) {
      result.minute = Number(matches[6].replace(",", "."))
    }
    if (defined(matches[7])) {
      const seconds = Number(matches[7].replace(",", "."))
      result.second = Math.floor(seconds)
      result.millisecond = (seconds % 1) * 1000
    }
  } else {
    let text = iso8601
    if (!text.endsWith("Z")) {
      text += "Z"
    }
    JulianDate.toGregorianDate(JulianDate.fromIso8601(text, scratchJulianDate), result)
  }

  return Boolean(
    result.year ||
    result.month ||
    result.day ||
    result.hour ||
    result.minute ||
    result.second ||
    result.millisecond,
  )
}

const scratchDuration = new GregorianDate()
