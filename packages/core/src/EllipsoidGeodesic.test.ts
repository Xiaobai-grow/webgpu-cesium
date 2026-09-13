import { describe, expect, it } from "vitest"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"
import { Ellipsoid } from "./Ellipsoid"
import { EllipsoidGeodesic } from "./EllipsoidGeodesic"

describe("EllipsoidGeodesic", () => {
  it("单位球赤道 90° 测地线距离为 π/2", () => {
    const start = new Cartographic(0.0, 0.0)
    const end = new Cartographic(CesiumMath.PI_OVER_TWO, 0.0)
    const geodesic = new EllipsoidGeodesic(start, end, Ellipsoid.UNIT_SPHERE)
    expect(
      CesiumMath.equalsEpsilon(
        geodesic.surfaceDistance,
        CesiumMath.PI_OVER_TWO,
        CesiumMath.EPSILON10,
      ),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(geodesic.startHeading, CesiumMath.PI_OVER_TWO, CesiumMath.EPSILON10),
    ).toBe(true)

    const mid = geodesic.interpolateUsingFraction(0.5)
    expect(
      CesiumMath.equalsEpsilon(mid.longitude, CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON10),
    ).toBe(true)
    expect(CesiumMath.equalsEpsilon(mid.latitude, 0.0, CesiumMath.EPSILON10)).toBe(true)
  })

  it("WGS84 上 15°→30° 插值端点闭合", () => {
    const start = new Cartographic(Math.PI / 12, Math.PI / 12)
    const end = new Cartographic(Math.PI / 6, Math.PI / 6)
    const geodesic = new EllipsoidGeodesic(start, end)
    const atStart = geodesic.interpolateUsingSurfaceDistance(0)
    const atEnd = geodesic.interpolateUsingSurfaceDistance(geodesic.surfaceDistance)
    expect(CesiumMath.equalsEpsilon(atStart.longitude, start.longitude, CesiumMath.EPSILON10)).toBe(
      true,
    )
    expect(CesiumMath.equalsEpsilon(atStart.latitude, start.latitude, CesiumMath.EPSILON10)).toBe(
      true,
    )
    expect(CesiumMath.equalsEpsilon(atEnd.longitude, end.longitude, CesiumMath.EPSILON8)).toBe(true)
    expect(CesiumMath.equalsEpsilon(atEnd.latitude, end.latitude, CesiumMath.EPSILON8)).toBe(true)
  })
})
