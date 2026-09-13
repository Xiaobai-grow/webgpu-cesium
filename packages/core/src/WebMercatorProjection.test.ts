import { describe, expect, it } from "vitest"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"
import { Ellipsoid } from "./Ellipsoid"
import { WebMercatorProjection } from "./WebMercatorProjection"

describe("WebMercatorProjection", () => {
  it("默认使用 WGS84", () => {
    expect(new WebMercatorProjection().ellipsoid).toBe(Ellipsoid.WGS84)
  })

  it("project / unproject 往返", () => {
    const cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0)
    const projection = new WebMercatorProjection()
    const projected = projection.project(cartographic)
    const unprojected = projection.unproject(projected)
    expect(
      CesiumMath.equalsEpsilon(unprojected.longitude, cartographic.longitude, CesiumMath.EPSILON14),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(unprojected.latitude, cartographic.latitude, CesiumMath.EPSILON14),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(unprojected.height, cartographic.height, CesiumMath.EPSILON14),
    ).toBe(true)
  })

  it("project 符合球面 Mercator 公式", () => {
    const ellipsoid = Ellipsoid.WGS84
    const cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_FOUR, 0.0)
    const expectedY =
      ellipsoid.maximumRadius * Math.log(Math.tan(Math.PI / 4.0 + cartographic.latitude / 2.0))
    const actual = new WebMercatorProjection(ellipsoid).project(cartographic)
    expect(
      CesiumMath.equalsEpsilon(
        actual.x,
        ellipsoid.maximumRadius * cartographic.longitude,
        CesiumMath.EPSILON8,
      ),
    ).toBe(true)
    expect(CesiumMath.equalsEpsilon(actual.y, expectedY, CesiumMath.EPSILON8)).toBe(true)
  })

  it("角点与 Cesium Spec 的 20037508.342787 米一致", () => {
    const projection = new WebMercatorProjection()
    const maxLatitude = WebMercatorProjection.MaximumLatitude
    const northeast = projection.project(new Cartographic(Math.PI, maxLatitude))
    expect(CesiumMath.equalsEpsilon(northeast.x, 20037508.342787, CesiumMath.EPSILON3)).toBe(true)
    expect(CesiumMath.equalsEpsilon(northeast.y, 20037508.342787, CesiumMath.EPSILON3)).toBe(true)

    const southwest = projection.unproject(new Cartesian3(-20037508.342787, -20037508.342787, 0.0))
    expect(CesiumMath.equalsEpsilon(southwest.longitude, -Math.PI, CesiumMath.EPSILON12)).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(
        southwest.latitude,
        CesiumMath.toRadians(-85.05112878),
        CesiumMath.EPSILON11,
      ),
    ).toBe(true)
  })

  it("极点纬度被夹紧到 MaximumLatitude", () => {
    const projection = new WebMercatorProjection()
    const pole = projection.project(new Cartographic(0.0, CesiumMath.PI_OVER_TWO))
    const limit = projection.project(new Cartographic(0.0, WebMercatorProjection.MaximumLatitude))
    expect(pole.y).toBe(limit.y)
  })
})
