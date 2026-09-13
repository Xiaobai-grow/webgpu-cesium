import { describe, expect, it } from "vitest"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"
import { Ellipsoid } from "./Ellipsoid"

describe("Cartographic", () => {
  it("fromDegrees 把角度写成弧度并保留高度", () => {
    const c = Cartographic.fromDegrees(25.0, 45.0, 100.0)
    expect(c.longitude).toBeCloseTo(CesiumMath.toRadians(25.0), 12)
    expect(c.latitude).toBeCloseTo(CesiumMath.toRadians(45.0), 12)
    expect(c.height).toBe(100.0)
  })

  it("fromDegrees / toCartesian / fromCartesian 在 WGS84 上往返", () => {
    const original = Cartographic.fromDegrees(-115.0, 37.0, 2500.0)
    const cartesian = Cartographic.toCartesian(original, Ellipsoid.WGS84)
    const roundTrip = Cartographic.fromCartesian(cartesian, Ellipsoid.WGS84)

    expect(roundTrip).toBeDefined()
    expect(
      CesiumMath.equalsEpsilon(roundTrip!.longitude, original.longitude, CesiumMath.EPSILON10),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(roundTrip!.latitude, original.latitude, CesiumMath.EPSILON10),
    ).toBe(true)
    expect(CesiumMath.equalsEpsilon(roundTrip!.height, original.height, CesiumMath.EPSILON7)).toBe(
      true,
    )
  })

  it("toCartesian 与 Ellipsoid.cartographicToCartesian 一致", () => {
    const lon = CesiumMath.toRadians(150)
    const lat = CesiumMath.toRadians(-40)
    const height = 100000
    const cartographic = new Cartographic(lon, lat, height)
    const actual = Cartographic.toCartesian(cartographic, Ellipsoid.WGS84)
    const expected = Ellipsoid.WGS84.cartographicToCartesian(cartographic)
    expect(CesiumMath.equalsEpsilon(actual.x, expected.x, CesiumMath.EPSILON8)).toBe(true)
    expect(CesiumMath.equalsEpsilon(actual.y, expected.y, CesiumMath.EPSILON8)).toBe(true)
    expect(CesiumMath.equalsEpsilon(actual.z, expected.z, CesiumMath.EPSILON8)).toBe(true)
  })

  it("fromCartesian 使用 Cesium Spec 的 WGS84 表面点", () => {
    const surfaceCartesian = new Cartesian3(
      4094327.7921465295,
      1909216.4044747739,
      4487348.4088659193,
    )
    const c = Cartographic.fromCartesian(surfaceCartesian, Ellipsoid.WGS84)
    expect(c).toBeDefined()
    expect(
      CesiumMath.equalsEpsilon(c!.longitude, CesiumMath.toRadians(25.0), CesiumMath.EPSILON10),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(c!.latitude, CesiumMath.toRadians(45.0), CesiumMath.EPSILON10),
    ).toBe(true)
    expect(CesiumMath.equalsEpsilon(c!.height, 0.0, CesiumMath.EPSILON7)).toBe(true)
  })

  it("fromCartesian 在椭球中心返回 undefined", () => {
    expect(Cartographic.fromCartesian(new Cartesian3(0, 0, 0), Ellipsoid.WGS84)).toBeUndefined()
  })
})
