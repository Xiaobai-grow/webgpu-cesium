import { describe, expect, it } from "vitest"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"
import { Rectangle } from "./Rectangle"

describe("Rectangle", () => {
  it("fromDegrees 写入弧度范围", () => {
    const rectangle = Rectangle.fromDegrees(-10.0, 20.0, 10.0, 30.0)
    expect(rectangle.west).toBeCloseTo(CesiumMath.toRadians(-10.0), 12)
    expect(rectangle.south).toBeCloseTo(CesiumMath.toRadians(20.0), 12)
    expect(rectangle.east).toBeCloseTo(CesiumMath.toRadians(10.0), 12)
    expect(rectangle.north).toBeCloseTo(CesiumMath.toRadians(30.0), 12)
    expect(rectangle.width).toBeCloseTo(CesiumMath.toRadians(20.0), 12)
    expect(rectangle.height).toBeCloseTo(CesiumMath.toRadians(10.0), 12)
  })

  it("东西半球：east < west 时 width 跨日界线展开", () => {
    const crossing = Rectangle.fromDegrees(170.0, -10.0, -170.0, 10.0)
    expect(crossing.east).toBeLessThan(crossing.west)
    expect(crossing.width).toBeCloseTo(CesiumMath.toRadians(20.0), 12)

    const western = Rectangle.fromDegrees(-80.0, 0.0, -10.0, 20.0)
    expect(western.west).toBeLessThan(0)
    expect(western.east).toBeLessThan(0)
    expect(western.width).toBeCloseTo(CesiumMath.toRadians(70.0), 12)

    const eastern = Rectangle.fromDegrees(10.0, 0.0, 80.0, 20.0)
    expect(eastern.west).toBeGreaterThan(0)
    expect(eastern.east).toBeGreaterThan(0)
    expect(eastern.width).toBeCloseTo(CesiumMath.toRadians(70.0), 12)
  })

  it("center / contains 支持日界线（antimeridian）", () => {
    const rectangle = Rectangle.fromDegrees(170.0, 0.0, -170.0, 0.0)
    const center = Rectangle.center(rectangle)
    expect(CesiumMath.equalsEpsilon(center.longitude, Math.PI, CesiumMath.EPSILON11)).toBe(true)

    expect(Rectangle.contains(rectangle, Cartographic.fromDegrees(180.0, 0.0))).toBe(true)
    expect(Rectangle.contains(rectangle, Cartographic.fromDegrees(175.0, 0.0))).toBe(true)
    expect(Rectangle.contains(rectangle, Cartographic.fromDegrees(-175.0, 0.0))).toBe(true)
    expect(Rectangle.contains(rectangle, Cartographic.fromDegrees(160.0, 0.0))).toBe(false)
  })

  it("fromCartographicArray 选择跨越 IDL 的较短区间", () => {
    const rectangle = Rectangle.fromCartographicArray([
      Cartographic.fromDegrees(-179, -4),
      Cartographic.fromDegrees(-178, 3),
      Cartographic.fromDegrees(179, 4),
      Cartographic.fromDegrees(178, 3),
    ])
    expect(rectangle.west).toBeCloseTo(CesiumMath.toRadians(178), 12)
    expect(rectangle.east).toBeCloseTo(CesiumMath.toRadians(-178), 12)
    expect(rectangle.south).toBeCloseTo(CesiumMath.toRadians(-4), 12)
    expect(rectangle.north).toBeCloseTo(CesiumMath.toRadians(4), 12)
  })

  it("intersection 在日界线两侧求交", () => {
    const rectangle1 = Rectangle.fromDegrees(170.0, -10.0, -170.0, 10.0)
    const rectangle2 = Rectangle.fromDegrees(-175.0, 5.0, -160.0, 15.0)
    const expected = Rectangle.fromDegrees(-175.0, 5.0, -170.0, 10.0)
    const actual = Rectangle.intersection(rectangle1, rectangle2)
    expect(actual).toBeDefined()
    expect(Rectangle.equalsEpsilon(actual, expected, CesiumMath.EPSILON14)).toBe(true)
  })
})
