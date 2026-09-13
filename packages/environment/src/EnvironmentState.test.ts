import { Cartesian3, Ellipsoid, JulianDate, Matrix4 } from "@webgpu-cesium/core"
import { SunLight } from "@webgpu-cesium/renderer"
import { describe, expect, it } from "vitest"
import { EnvironmentState } from "./EnvironmentState"
import { buildStarCatalog, STAR_CATALOG_COUNT } from "./StarField"

describe("EnvironmentState", () => {
  it("正午与子夜太阳高度不同、月相在 0..1", () => {
    const state = new EnvironmentState()
    const camera = Cartesian3.fromDegrees(0, 0, 1000)
    const identity = Matrix4.IDENTITY.toFloat32Array(new Float32Array(16))
    const noon = JulianDate.fromIso8601("2024-06-21T12:00:00Z")
    const midnight = JulianDate.fromIso8601("2024-06-21T00:00:00Z")
    const light = new SunLight()
    state.update(noon, camera, identity, Ellipsoid.WGS84, light, 0.016)
    const noonZ = state.sunDirectionECEF.x
    const noonPhase = state.moonPhase
    state.update(midnight, camera, identity, Ellipsoid.WGS84, light, 0.016)
    expect(state.moonPhase).toBeGreaterThanOrEqual(0)
    expect(state.moonPhase).toBeLessThanOrEqual(1)
    expect(noonPhase).toBeGreaterThanOrEqual(0)
    expect(Math.abs(state.sunDirectionECEF.x - noonZ)).toBeGreaterThan(0.01)
  })
})

describe("StarField", () => {
  it("星表长度为亮星数且方向单位化", () => {
    const catalog = buildStarCatalog(JulianDate.fromIso8601("2024-01-01T00:00:00Z"))
    expect(catalog.length).toBe(STAR_CATALOG_COUNT * 4)
    const mag = Math.hypot(catalog[0] ?? 0, catalog[1] ?? 0, catalog[2] ?? 0)
    expect(mag).toBeCloseTo(1, 5)
  })
})
