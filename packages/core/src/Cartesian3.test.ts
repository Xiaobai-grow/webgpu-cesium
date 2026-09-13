import { describe, expect, it } from "vitest"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"

describe("Cartesian3", () => {
  it("加减乘除、点积叉积、归一化", () => {
    const a = new Cartesian3(1, 0, 0)
    const b = new Cartesian3(0, 1, 0)
    const sum = Cartesian3.add(a, b, new Cartesian3())
    expect(sum.equals(new Cartesian3(1, 1, 0))).toBe(true)
    expect(Cartesian3.dot(a, b)).toBe(0)
    const cross = Cartesian3.cross(a, b, new Cartesian3())
    expect(cross.equals(Cartesian3.UNIT_Z)).toBe(true)
    const n = Cartesian3.normalize(new Cartesian3(0, 0, 4), new Cartesian3())
    expect(n.equals(Cartesian3.UNIT_Z)).toBe(true)
    const product = Cartesian3.multiplyByScalar(a, 3, new Cartesian3())
    expect(product.equals(new Cartesian3(3, 0, 0))).toBe(true)
  })

  it("fromDegrees / fromRadians 与 Cartographic 往返", () => {
    const p = Cartesian3.fromDegrees(-115.0, 37.0)
    expect(Cartesian3.magnitude(p)).toBeGreaterThan(6_300_000)
    const c = Cartographic.fromCartesian(p)
    expect(c).toBeDefined()
    expect(
      CesiumMath.equalsEpsilon(c!.longitude, CesiumMath.toRadians(-115), CesiumMath.EPSILON10),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(c!.latitude, CesiumMath.toRadians(37), CesiumMath.EPSILON10),
    ).toBe(true)
    expect(Math.abs(c!.height)).toBeLessThan(1e-6)
    const back = Cartographic.toCartesian(c!)
    expect(Cartesian3.equalsEpsilon(p, back, CesiumMath.EPSILON7)).toBe(true)
  })

  it("pack / unpack", () => {
    const array: number[] = []
    Cartesian3.pack(new Cartesian3(1, 2, 3), array)
    expect(Cartesian3.unpack(array).equals(new Cartesian3(1, 2, 3))).toBe(true)
  })
})
