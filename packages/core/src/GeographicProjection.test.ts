import { describe, expect, it } from "vitest"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"
import { Ellipsoid } from "./Ellipsoid"
import { GeographicProjection } from "./GeographicProjection"

describe("GeographicProjection", () => {
  it("默认使用 Ellipsoid.default（WGS84）", () => {
    expect(new GeographicProjection().ellipsoid).toBe(Ellipsoid.default)
  })

  it("project / unproject 往返", () => {
    const cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0)
    const projection = new GeographicProjection()
    const projected = projection.project(cartographic)
    const unprojected = projection.unproject(projected)
    expect(unprojected.longitude).toBeCloseTo(cartographic.longitude, 12)
    expect(unprojected.latitude).toBeCloseTo(cartographic.latitude, 12)
    expect(unprojected.height).toBeCloseTo(cartographic.height, 12)
  })

  it("project 等于经纬度乘以最大半径（Cesium Spec）", () => {
    const ellipsoid = Ellipsoid.WGS84
    const cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO, 0.0)
    const expected = new Cartesian3(
      Math.PI * ellipsoid.radii.x,
      CesiumMath.PI_OVER_TWO * ellipsoid.radii.x,
      0.0,
    )
    const result = new GeographicProjection(ellipsoid).project(cartographic)
    expect(result.x).toBe(expected.x)
    expect(result.y).toBe(expected.y)
    expect(result.z).toBe(expected.z)
  })

  it("写入 result 参数并返回同一对象", () => {
    const cartographic = new Cartographic(0.1, -0.2, 5.0)
    const result = new Cartesian3()
    const returned = new GeographicProjection().project(cartographic, result)
    expect(returned).toBe(result)
    expect(result.z).toBe(5.0)
  })
})
