import { describe, expect, it } from "vitest"
import { Cartesian2 } from "./Cartesian2"
import { Cartesian3 } from "./Cartesian3"
import { CesiumMath } from "./CesiumMath"
import { Cartographic } from "./Cartographic"
import { Ellipsoid } from "./Ellipsoid"
import { EllipsoidTangentPlane } from "./EllipsoidTangentPlane"
import { Stereographic } from "./Stereographic"

describe("EllipsoidTangentPlane", () => {
  it("赤道点的切平面 x 轴朝东、z 轴朝外", () => {
    const origin = Ellipsoid.UNIT_SPHERE.cartographicToCartesian(Cartographic.fromRadians(0, 0, 0))
    const plane = new EllipsoidTangentPlane(origin, Ellipsoid.UNIT_SPHERE)
    expect(CesiumMath.equalsEpsilon(plane.origin.x, 1.0, CesiumMath.EPSILON10)).toBe(true)
    expect(CesiumMath.equalsEpsilon(plane.xAxis.y, 1.0, CesiumMath.EPSILON10)).toBe(true)
    expect(CesiumMath.equalsEpsilon(plane.zAxis.x, 1.0, CesiumMath.EPSILON10)).toBe(true)

    const projected = plane.projectPointOntoPlane(new Cartesian3(1.0, 0.1, 0.0))
    expect(projected).toBeDefined()
    expect(projected!.x).toBeGreaterThan(0)
  })

  it("projectPointOntoEllipsoid 把切平面原点映回椭球面", () => {
    const origin = Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromRadians(0, 0, 0))
    const plane = new EllipsoidTangentPlane(origin, Ellipsoid.WGS84)
    const back = plane.projectPointOntoEllipsoid(new Cartesian2(0, 0))
    expect(CesiumMath.equalsEpsilon(back.x, origin.x, CesiumMath.EPSILON7)).toBe(true)
    expect(CesiumMath.equalsEpsilon(back.y, origin.y, CesiumMath.EPSILON7)).toBe(true)
    expect(CesiumMath.equalsEpsilon(back.z, origin.z, CesiumMath.EPSILON7)).toBe(true)
  })
})

describe("Stereographic", () => {
  it("北极点投影到切平面原点附近", () => {
    const stereo = Stereographic.fromCartesian(new Cartesian3(0.0, 0.0, 0.5))
    expect(CesiumMath.equalsEpsilon(stereo.x, 0.0, CesiumMath.EPSILON10)).toBe(true)
    expect(CesiumMath.equalsEpsilon(stereo.y, 0.0, CesiumMath.EPSILON10)).toBe(true)
    expect(stereo.tangentPlane).toBe(Stereographic.NORTH_POLE_TANGENT_PLANE)
  })
})
