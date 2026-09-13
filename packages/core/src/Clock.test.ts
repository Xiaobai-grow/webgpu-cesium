import { describe, expect, it } from "vitest"
import { Clock } from "./Clock"
import { ClockRange } from "./ClockRange"
import { ClockStep } from "./ClockStep"
import { JulianDate } from "./JulianDate"

describe("Clock", () => {
  it("tick CLAMPED 到 stop 后停住", () => {
    const start = JulianDate.fromIso8601("2013-12-25T00:00:00Z")
    const stop = JulianDate.fromIso8601("2013-12-25T00:00:10Z")
    const clock = new Clock({
      startTime: start,
      currentTime: start,
      stopTime: stop,
      clockRange: ClockRange.CLAMPED,
      clockStep: ClockStep.TICK_DEPENDENT,
      multiplier: 100,
      shouldAnimate: true,
    })
    const after = clock.tick()
    expect(JulianDate.equals(after, stop)).toBe(true)
    expect(JulianDate.equals(clock.tick(), stop)).toBe(true)
  })

  it("tick LOOP_STOP 越过 stop 后绕回", () => {
    const start = JulianDate.fromIso8601("2013-12-25T00:00:00Z")
    const stop = JulianDate.fromIso8601("2013-12-25T00:00:10Z")
    const clock = new Clock({
      startTime: start,
      currentTime: JulianDate.fromIso8601("2013-12-25T00:00:08Z"),
      stopTime: stop,
      clockRange: ClockRange.LOOP_STOP,
      clockStep: ClockStep.TICK_DEPENDENT,
      multiplier: 5,
      shouldAnimate: true,
    })
    const after = clock.tick()
    expect(JulianDate.lessThanOrEquals(after, stop)).toBe(true)
    expect(JulianDate.greaterThanOrEquals(after, start)).toBe(true)
    expect(JulianDate.equals(after, start)).toBe(false)
  })
})
