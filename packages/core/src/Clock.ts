/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { ClockRange, type ClockRangeValue } from "./ClockRange"
import { ClockStep, type ClockStepValue } from "./ClockStep"
import { Frozen } from "./Frozen"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { Event } from "./Event"
import { getTimestamp } from "./getTimestamp"
import { JulianDate } from "./JulianDate"

/** Clock 构造选项 */
export interface ClockOptions {
  startTime?: JulianDate
  stopTime?: JulianDate
  currentTime?: JulianDate
  multiplier?: number
  clockStep?: ClockStepValue
  clockRange?: ClockRangeValue
  canAnimate?: boolean
  shouldAnimate?: boolean
}

/**
 * 模拟时钟。对标 Cesium `Core/Clock.js`。
 */
export class Clock {
  startTime: JulianDate
  stopTime: JulianDate
  clockRange: ClockRangeValue
  canAnimate: boolean
  onTick: Event<[Clock]>
  onStop: Event<[Clock]>

  private _currentTime: JulianDate
  private _multiplier: number
  private _clockStep: ClockStepValue
  private _shouldAnimate: boolean
  private _lastSystemTime: number

  /**
   * @param options 起止、步进与动画开关
   */
  constructor(options?: ClockOptions) {
    const resolved = options ?? Frozen.EMPTY_OBJECT
    let currentTime = resolved.currentTime
    let startTime = resolved.startTime
    let stopTime = resolved.stopTime

    if (!defined(currentTime)) {
      if (defined(startTime)) {
        currentTime = JulianDate.clone(startTime)!
      } else if (defined(stopTime)) {
        currentTime = JulianDate.addDays(stopTime, -1.0, new JulianDate())
      } else {
        currentTime = JulianDate.now()
      }
    } else {
      currentTime = JulianDate.clone(currentTime)!
    }

    if (!defined(startTime)) {
      startTime = JulianDate.clone(currentTime)!
    } else {
      startTime = JulianDate.clone(startTime)!
    }

    if (!defined(stopTime)) {
      stopTime = JulianDate.addDays(startTime, 1.0, new JulianDate())
    } else {
      stopTime = JulianDate.clone(stopTime)!
    }

    if (JulianDate.greaterThan(startTime, stopTime)) {
      throw new DeveloperError("startTime must come before stopTime.")
    }

    this.startTime = startTime
    this.stopTime = stopTime
    this.clockRange = resolved.clockRange ?? ClockRange.UNBOUNDED
    this.canAnimate = resolved.canAnimate ?? true
    this.onTick = new Event<[Clock]>()
    this.onStop = new Event<[Clock]>()
    this._currentTime = currentTime
    this._multiplier = 1.0
    this._clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER
    this._shouldAnimate = false
    this._lastSystemTime = getTimestamp()

    this.currentTime = currentTime
    this.multiplier = resolved.multiplier ?? 1.0
    this.shouldAnimate = resolved.shouldAnimate ?? false
    this.clockStep = resolved.clockStep ?? ClockStep.SYSTEM_CLOCK_MULTIPLIER
  }

  get currentTime(): JulianDate {
    return this._currentTime
  }

  set currentTime(value: JulianDate) {
    if (JulianDate.equals(this._currentTime, value)) {
      return
    }
    if (this._clockStep === ClockStep.SYSTEM_CLOCK) {
      this._clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER
    }
    this._currentTime = value
  }

  get multiplier(): number {
    return this._multiplier
  }

  set multiplier(value: number) {
    if (this._multiplier === value) {
      return
    }
    if (this._clockStep === ClockStep.SYSTEM_CLOCK) {
      this._clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER
    }
    this._multiplier = value
  }

  get clockStep(): ClockStepValue {
    return this._clockStep
  }

  set clockStep(value: ClockStepValue) {
    if (value === ClockStep.SYSTEM_CLOCK) {
      this._multiplier = 1.0
      this._shouldAnimate = true
      this._currentTime = JulianDate.now()
    }
    this._clockStep = value
  }

  get shouldAnimate(): boolean {
    return this._shouldAnimate
  }

  set shouldAnimate(value: boolean) {
    if (this._shouldAnimate === value) {
      return
    }
    if (this._clockStep === ClockStep.SYSTEM_CLOCK) {
      this._clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER
    }
    this._shouldAnimate = value
  }

  /**
   * 按当前配置推进一步。应每帧调用。
   */
  tick(): JulianDate {
    const currentSystemTime = getTimestamp()
    let currentTime = JulianDate.clone(this._currentTime)!

    if (this.canAnimate && this._shouldAnimate) {
      const clockStep = this._clockStep
      if (clockStep === ClockStep.SYSTEM_CLOCK) {
        currentTime = JulianDate.now(currentTime)
      } else {
        const multiplier = this._multiplier
        if (clockStep === ClockStep.TICK_DEPENDENT) {
          currentTime = JulianDate.addSeconds(currentTime, multiplier, currentTime)
        } else {
          const milliseconds = currentSystemTime - this._lastSystemTime
          currentTime = JulianDate.addSeconds(
            currentTime,
            multiplier * (milliseconds / 1000.0),
            currentTime,
          )
        }

        const clockRange = this.clockRange
        const startTime = this.startTime
        const stopTime = this.stopTime

        if (clockRange === ClockRange.CLAMPED) {
          if (JulianDate.lessThan(currentTime, startTime)) {
            currentTime = JulianDate.clone(startTime, currentTime)!
          } else if (JulianDate.greaterThan(currentTime, stopTime)) {
            currentTime = JulianDate.clone(stopTime, currentTime)!
            this.onStop.raiseEvent(this)
          }
        } else if (clockRange === ClockRange.LOOP_STOP) {
          if (JulianDate.lessThan(currentTime, startTime)) {
            currentTime = JulianDate.clone(startTime, currentTime)!
          }
          while (JulianDate.greaterThan(currentTime, stopTime)) {
            currentTime = JulianDate.addSeconds(
              startTime,
              JulianDate.secondsDifference(currentTime, stopTime),
              currentTime,
            )
            this.onStop.raiseEvent(this)
          }
        }
      }
    }

    this._currentTime = currentTime
    this._lastSystemTime = currentSystemTime
    this.onTick.raiseEvent(this)
    return currentTime
  }
}
