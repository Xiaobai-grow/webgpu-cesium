import { describe, expect, it } from "vitest"
import { JulianDate } from "./JulianDate"
import { TimeStandard } from "./TimeStandard"

describe("JulianDate", () => {
  it("fromDate 与 JS Date UTC 分量一致", () => {
    const date = new Date(Date.UTC(2017, 0, 1, 0, 0, 0, 0))
    const julian = JulianDate.fromDate(date)
    const back = JulianDate.toDate(julian)
    expect(back.getTime()).toBe(date.getTime())
  })

  it("addSeconds / secondsDifference 往返", () => {
    const start = JulianDate.fromIso8601("2017-01-01T00:00:00Z")
    const later = JulianDate.addSeconds(start, 90.5, new JulianDate())
    expect(JulianDate.secondsDifference(later, start)).toBeCloseTo(90.5, 10)
    const earlier = JulianDate.addSeconds(start, -12, new JulianDate())
    expect(JulianDate.secondsDifference(start, earlier)).toBeCloseTo(12, 10)
  })

  it("leap second 附近 TAI-UTC 为 37 秒", () => {
    const afterLastLeap = JulianDate.fromIso8601("2017-01-01T00:00:00Z")
    expect(JulianDate.computeTaiMinusUtc(afterLastLeap)).toBe(37)
    const beforeFirst = new JulianDate(2441316, 0, TimeStandard.TAI)
    expect(JulianDate.computeTaiMinusUtc(beforeFirst)).toBe(10)
  })

  it("闰秒表在 2016-12-31 / 2017-01-01 连续", () => {
    const before = JulianDate.fromIso8601("2016-12-31T23:59:59Z")
    const after = JulianDate.fromIso8601("2017-01-01T00:00:00Z")
    const delta = JulianDate.secondsDifference(after, before)
    expect(delta).toBeGreaterThan(1)
    expect(delta).toBeLessThan(3)
  })
})
