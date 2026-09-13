import { describe, expect, it } from "vitest"
import { JulianDate } from "./JulianDate"
import { TimeInterval } from "./TimeInterval"

describe("TimeInterval", () => {
  it("intersect 取重叠段", () => {
    const left = new TimeInterval({
      start: JulianDate.fromIso8601("2000-01-01T00:00:00Z"),
      stop: JulianDate.fromIso8601("2010-01-01T00:00:00Z"),
      data: 2,
    })
    const right = new TimeInterval({
      start: JulianDate.fromIso8601("1995-01-01T00:00:00Z"),
      stop: JulianDate.fromIso8601("2005-01-01T00:00:00Z"),
      data: 3,
    })
    const intersection = TimeInterval.intersect(
      left,
      right,
      new TimeInterval(),
      (a, b) => (a ?? 0) + (b ?? 0),
    )
    expect(JulianDate.equals(intersection.start, left.start)).toBe(true)
    expect(JulianDate.equals(intersection.stop, right.stop)).toBe(true)
    expect(intersection.data).toBe(5)
    expect(intersection.isEmpty).toBe(false)
  })

  it("intersect 无重叠则为 empty", () => {
    const left = new TimeInterval({
      start: JulianDate.fromIso8601("2000-01-01T00:00:00Z"),
      stop: JulianDate.fromIso8601("2001-01-01T00:00:00Z"),
    })
    const right = new TimeInterval({
      start: JulianDate.fromIso8601("2002-01-01T00:00:00Z"),
      stop: JulianDate.fromIso8601("2003-01-01T00:00:00Z"),
    })
    const intersection = TimeInterval.intersect(left, right, new TimeInterval())
    expect(intersection.isEmpty).toBe(true)
  })

  it("contains 尊重开闭区间", () => {
    const start = JulianDate.fromIso8601("1980-08-01T00:00:00Z")
    const stop = JulianDate.fromIso8601("1980-08-02T00:00:00Z")
    const interval = new TimeInterval({
      start,
      stop,
      isStartIncluded: true,
      isStopIncluded: false,
    })
    expect(TimeInterval.contains(interval, start)).toBe(true)
    expect(TimeInterval.contains(interval, stop)).toBe(false)
    expect(TimeInterval.contains(interval, JulianDate.fromIso8601("1980-08-01T12:00:00Z"))).toBe(
      true,
    )
    expect(TimeInterval.contains(interval, JulianDate.fromIso8601("1979-01-01T00:00:00Z"))).toBe(
      false,
    )
  })
})
