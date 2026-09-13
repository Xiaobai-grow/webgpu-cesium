import { describe, expect, it } from "vitest"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"
import { Ellipsoid } from "./Ellipsoid"

describe("Ellipsoid", () => {
  it("WGS84 / UNIT_SPHERE / default 半径与 Cartesian3._ellipsoidRadiiSquared 对齐", () => {
    expect(Ellipsoid.WGS84.radii.x).toBe(6378137.0)
    expect(Ellipsoid.WGS84.radii.y).toBe(6378137.0)
    expect(Ellipsoid.WGS84.radii.z).toBe(6356752.3142451793)
    expect(Ellipsoid.UNIT_SPHERE.radii.x).toBe(1.0)
    expect(Ellipsoid.default).toBe(Ellipsoid.WGS84)

    const previous = Ellipsoid.default
    try {
      Ellipsoid.default = Ellipsoid.UNIT_SPHERE
      expect(Cartesian3._ellipsoidRadiiSquared.x).toBe(1.0)
      expect(Cartesian3._ellipsoidRadiiSquared.y).toBe(1.0)
      expect(Cartesian3._ellipsoidRadiiSquared.z).toBe(1.0)
      expect(Cartographic._ellipsoidOneOverRadii.x).toBe(1.0)
    } finally {
      Ellipsoid.default = previous
    }

    expect(Cartesian3._ellipsoidRadiiSquared.x).toBe(6378137.0 * 6378137.0)
    expect(Cartesian3._ellipsoidRadiiSquared.z).toBe(6356752.3142451793 * 6356752.3142451793)
  })

  it("cartographicToCartesian / cartesianToCartographic 与 Cesium Spec 数值一致", () => {
    const surfaceCartographic = new Cartographic(
      CesiumMath.toRadians(25.0),
      CesiumMath.toRadians(45.0),
      0.0,
    )
    const surfaceCartesian = Ellipsoid.WGS84.cartographicToCartesian(surfaceCartographic)

    expect(
      CesiumMath.equalsEpsilon(surfaceCartesian.x, 4094327.7921465295, CesiumMath.EPSILON7),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(surfaceCartesian.y, 1909216.4044747739, CesiumMath.EPSILON7),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(surfaceCartesian.z, 4487348.4088659193, CesiumMath.EPSILON7),
    ).toBe(true)

    const back = Ellipsoid.WGS84.cartesianToCartographic(surfaceCartesian)
    expect(back).toBeDefined()
    expect(
      CesiumMath.equalsEpsilon(
        back!.longitude,
        surfaceCartographic.longitude,
        CesiumMath.EPSILON10,
      ),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(back!.latitude, surfaceCartographic.latitude, CesiumMath.EPSILON10),
    ).toBe(true)
    expect(CesiumMath.equalsEpsilon(back!.height, 0.0, CesiumMath.EPSILON7)).toBe(true)
  })

  it("带高度的 cartographicToCartesian 往返", () => {
    const spaceCartographic = new Cartographic(
      CesiumMath.toRadians(-45.0),
      CesiumMath.toRadians(15.0),
      330000.0,
    )
    const cartesian = Ellipsoid.WGS84.cartographicToCartesian(spaceCartographic)
    expect(CesiumMath.equalsEpsilon(cartesian.x, 4582719.8827300891, CesiumMath.EPSILON7)).toBe(
      true,
    )
    expect(CesiumMath.equalsEpsilon(cartesian.y, -4582719.8827300882, CesiumMath.EPSILON7)).toBe(
      true,
    )
    expect(CesiumMath.equalsEpsilon(cartesian.z, 1725510.4250797231, CesiumMath.EPSILON7)).toBe(
      true,
    )

    const back = Ellipsoid.WGS84.cartesianToCartographic(cartesian)
    expect(back).toBeDefined()
    expect(
      CesiumMath.equalsEpsilon(back!.longitude, spaceCartographic.longitude, CesiumMath.EPSILON10),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(back!.latitude, spaceCartographic.latitude, CesiumMath.EPSILON10),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(back!.height, spaceCartographic.height, CesiumMath.EPSILON6),
    ).toBe(true)
  })

  it("cartesianToCartographic 在中心返回 undefined", () => {
    expect(Ellipsoid.WGS84.cartesianToCartographic(Cartesian3.ZERO)).toBeUndefined()
  })
})
