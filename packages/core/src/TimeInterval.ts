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
import { Frozen } from "./Frozen"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { JulianDate } from "./JulianDate"

/** 合并区间 data */
export type TimeIntervalMergeCallback<T = unknown> = (
  leftData: T | undefined,
  rightData: T | undefined,
) => T
/** 比较区间 data */
export type TimeIntervalDataComparer<T = unknown> = (
  leftData: T | undefined,
  rightData: T | undefined,
) => boolean

/** TimeInterval 构造选项 */
export interface TimeIntervalOptions<T = unknown> {
  start?: JulianDate | undefined
  stop?: JulianDate | undefined
  isStartIncluded?: boolean | undefined
  isStopIncluded?: boolean | undefined
  data?: T | undefined
}

/** fromIso8601 选项 */
export interface TimeIntervalFromIso8601Options<T = unknown> {
  iso8601: string
  isStartIncluded?: boolean
  isStopIncluded?: boolean
  data?: T
}

/**
 * 由起止儒略日定义的时间区间。对标 Cesium `Core/TimeInterval.js`。
 */
export class TimeInterval<T = unknown> {
  start: JulianDate
  stop: JulianDate
  data: T | undefined
  isStartIncluded: boolean
  isStopIncluded: boolean

  /**
   * @param options 起止、开闭与附加 data
   */
  constructor(options?: TimeIntervalOptions<T>) {
    const resolved = options ?? Frozen.EMPTY_OBJECT
    this.start = defined(resolved.start) ? JulianDate.clone(resolved.start)! : new JulianDate()
    this.stop = defined(resolved.stop) ? JulianDate.clone(resolved.stop)! : new JulianDate()
    this.data = resolved.data
    this.isStartIncluded = resolved.isStartIncluded ?? true
    this.isStopIncluded = resolved.isStopIncluded ?? true
  }

  get isEmpty(): boolean {
    const stopComparedToStart = JulianDate.compare(this.stop, this.start)
    return (
      stopComparedToStart < 0 ||
      (stopComparedToStart === 0 && (!this.isStartIncluded || !this.isStopIncluded))
    )
  }

  static fromIso8601<T>(
    options: TimeIntervalFromIso8601Options<T>,
    result?: TimeInterval<T>,
  ): TimeInterval<T> {
    Check.typeOf.object("options", options)
    Check.typeOf.string("options.iso8601", options.iso8601)
    const dates = options.iso8601.split("/")
    if (dates.length !== 2 || !defined(dates[0]) || !defined(dates[1])) {
      throw new DeveloperError("options.iso8601 is an invalid ISO 8601 interval.")
    }
    const start = JulianDate.fromIso8601(dates[0])
    const stop = JulianDate.fromIso8601(dates[1])
    const isStartIncluded = options.isStartIncluded ?? true
    const isStopIncluded = options.isStopIncluded ?? true
    const data = options.data
    if (!defined(result)) {
      return new TimeInterval({ start, stop, isStartIncluded, isStopIncluded, data })
    }
    result.start = start
    result.stop = stop
    result.isStartIncluded = isStartIncluded
    result.isStopIncluded = isStopIncluded
    result.data = data
    return result
  }

  static toIso8601(timeInterval: TimeInterval, precision?: number): string {
    Check.typeOf.object("timeInterval", timeInterval)
    return `${JulianDate.toIso8601(timeInterval.start, precision)}/${JulianDate.toIso8601(timeInterval.stop, precision)}`
  }

  static clone<T>(
    timeInterval?: TimeInterval<T>,
    result?: TimeInterval<T>,
  ): TimeInterval<T> | undefined {
    if (!defined(timeInterval)) {
      return undefined
    }
    if (!defined(result)) {
      return new TimeInterval(timeInterval)
    }
    result.start = timeInterval.start
    result.stop = timeInterval.stop
    result.isStartIncluded = timeInterval.isStartIncluded
    result.isStopIncluded = timeInterval.isStopIncluded
    result.data = timeInterval.data
    return result
  }

  static equals<T>(
    left?: TimeInterval<T>,
    right?: TimeInterval<T>,
    dataComparer?: TimeIntervalDataComparer<T>,
  ): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        ((left.isEmpty && right.isEmpty) ||
          (left.isStartIncluded === right.isStartIncluded &&
            left.isStopIncluded === right.isStopIncluded &&
            JulianDate.equals(left.start, right.start) &&
            JulianDate.equals(left.stop, right.stop) &&
            (left.data === right.data ||
              (defined(dataComparer) && dataComparer(left.data, right.data))))))
    )
  }

  static equalsEpsilon<T>(
    left?: TimeInterval<T>,
    right?: TimeInterval<T>,
    epsilon?: number,
    dataComparer?: TimeIntervalDataComparer<T>,
  ): boolean {
    const resolved = epsilon ?? 0
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        ((left.isEmpty && right.isEmpty) ||
          (left.isStartIncluded === right.isStartIncluded &&
            left.isStopIncluded === right.isStopIncluded &&
            JulianDate.equalsEpsilon(left.start, right.start, resolved) &&
            JulianDate.equalsEpsilon(left.stop, right.stop, resolved) &&
            (left.data === right.data ||
              (defined(dataComparer) && dataComparer(left.data, right.data))))))
    )
  }

  static intersect<T>(
    left: TimeInterval<T>,
    right?: TimeInterval<T>,
    result?: TimeInterval<T>,
    mergeCallback?: TimeIntervalMergeCallback<T>,
  ): TimeInterval<T> {
    Check.typeOf.object("left", left)
    if (!defined(right)) {
      return TimeInterval.clone(TimeInterval.EMPTY as TimeInterval<T>, result)!
    }

    const leftStart = left.start
    const leftStop = left.stop
    const rightStart = right.start
    const rightStop = right.stop

    const intersectsStartRight =
      JulianDate.greaterThanOrEquals(rightStart, leftStart) &&
      JulianDate.greaterThanOrEquals(leftStop, rightStart)
    const intersectsStartLeft =
      !intersectsStartRight &&
      JulianDate.lessThanOrEquals(rightStart, leftStart) &&
      JulianDate.lessThanOrEquals(leftStart, rightStop)

    if (!intersectsStartRight && !intersectsStartLeft) {
      return TimeInterval.clone(TimeInterval.EMPTY as TimeInterval<T>, result)!
    }

    const dest = result ?? new TimeInterval<T>()
    const leftLessThanRight = JulianDate.lessThan(leftStop, rightStop)
    dest.start = intersectsStartRight ? rightStart : leftStart
    dest.isStartIncluded =
      (left.isStartIncluded && right.isStartIncluded) ||
      (!JulianDate.equals(rightStart, leftStart) &&
        ((intersectsStartRight && right.isStartIncluded) ||
          (intersectsStartLeft && left.isStartIncluded)))
    dest.stop = leftLessThanRight ? leftStop : rightStop
    dest.isStopIncluded = leftLessThanRight
      ? left.isStopIncluded
      : (left.isStopIncluded && right.isStopIncluded) ||
        (!JulianDate.equals(rightStop, leftStop) && right.isStopIncluded)
    dest.data = defined(mergeCallback) ? mergeCallback(left.data, right.data) : left.data
    return dest
  }

  static contains(timeInterval: TimeInterval, julianDate: JulianDate): boolean {
    Check.typeOf.object("timeInterval", timeInterval)
    Check.typeOf.object("julianDate", julianDate)
    if (timeInterval.isEmpty) {
      return false
    }
    const startComparedToDate = JulianDate.compare(timeInterval.start, julianDate)
    if (startComparedToDate === 0) {
      return timeInterval.isStartIncluded
    }
    const dateComparedToStop = JulianDate.compare(julianDate, timeInterval.stop)
    if (dateComparedToStop === 0) {
      return timeInterval.isStopIncluded
    }
    return startComparedToDate < 0 && dateComparedToStop < 0
  }

  clone(result?: TimeInterval<T>): TimeInterval<T> | undefined {
    return TimeInterval.clone(this, result)
  }

  equals(right?: TimeInterval<T>, dataComparer?: TimeIntervalDataComparer<T>): boolean {
    return TimeInterval.equals(this, right, dataComparer)
  }

  equalsEpsilon(
    right?: TimeInterval<T>,
    epsilon?: number,
    dataComparer?: TimeIntervalDataComparer<T>,
  ): boolean {
    return TimeInterval.equalsEpsilon(this, right, epsilon, dataComparer)
  }

  toString(): string {
    return TimeInterval.toIso8601(this)
  }

  static EMPTY = Object.freeze(
    new TimeInterval({
      start: new JulianDate(),
      stop: new JulianDate(),
      isStartIncluded: false,
      isStopIncluded: false,
    }),
  )
}
