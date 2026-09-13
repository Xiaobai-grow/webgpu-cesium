import { describe, expect, it } from "vitest"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"
import { Ellipsoid } from "./Ellipsoid"
import { EllipsoidRhumbLine } from "./EllipsoidRhumbLine"

describe("EllipsoidRhumbLine", () => {
  it("单位球赤道 90° 恒向线距离为 π/2", () => {
    const start = new Cartographic(0.0, 0.0)
    const end = new Cartographic(CesiumMath.PI_OVER_TWO, 0.0)
    const rhumb = new EllipsoidRhumbLine(start, end, Ellipsoid.UNIT_SPHERE)
    expect(
      CesiumMath.equalsEpsilon(rhumb.surfaceDistance, CesiumMath.PI_OVER_TWO, CesiumMath.EPSILON10),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(rhumb.heading, CesiumMath.PI_OVER_TWO, CesiumMath.EPSILON8),
    ).toBe(true)

    const mid = rhumb.interpolateUsingFraction(0.5)
    expect(
      CesiumMath.equalsEpsilon(mid.longitude, CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON10),
    ).toBe(true)
    expect(CesiumMath.equalsEpsilon(mid.latitude, 0.0, CesiumMath.EPSILON10)).toBe(true)
  })

  it("fromStartHeadingDistance 再插值回到终点", () => {
    const start = Cartographic.fromDegrees(0.0, 30.0)
    const rhumb = EllipsoidRhumbLine.fromStartHeadingDistance(
      start,
      CesiumMath.toRadians(45.0),
      1_000_000.0,
      Ellipsoid.WGS84,
    )
    const end = rhumb.interpolateUsingSurfaceDistance(rhumb.surfaceDistance)
    expect(CesiumMath.equalsEpsilon(end.longitude, rhumb.end.longitude, CesiumMath.EPSILON8)).toBe(
      true,
    )
    expect(CesiumMath.equalsEpsilon(end.latitude, rhumb.end.latitude, CesiumMath.EPSILON8)).toBe(
      true,
    )
  })
})
