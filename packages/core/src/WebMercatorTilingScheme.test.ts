import { describe, expect, it } from "vitest"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"
import { Ellipsoid } from "./Ellipsoid"
import { WebMercatorTilingScheme } from "./WebMercatorTilingScheme"

describe("WebMercatorTilingScheme", () => {
  it("默认 1×1 根瓦片，level 0 本地矩形为 ±Rπ", () => {
    const tilingScheme = new WebMercatorTilingScheme()
    expect(tilingScheme.ellipsoid).toBe(Ellipsoid.default)
    expect(tilingScheme.getNumberOfXTilesAtLevel(0)).toBe(1)
    expect(tilingScheme.getNumberOfYTilesAtLevel(0)).toBe(1)
    expect(tilingScheme.getNumberOfXTilesAtLevel(1)).toBe(2)

    const rPi = Ellipsoid.WGS84.maximumRadius * Math.PI
    const root = tilingScheme.tileXYToNativeRectangle(0, 0, 0)
    expect(root.west).toBeCloseTo(-rPi, 8)
    expect(root.south).toBeCloseTo(-rPi, 8)
    expect(root.east).toBeCloseTo(rPi, 8)
    expect(root.north).toBeCloseTo(rPi, 8)
  })

  it("level 1 四块本地矩形与 Cesium 源码公式一致", () => {
    const tilingScheme = new WebMercatorTilingScheme()
    const rPi = Ellipsoid.WGS84.maximumRadius * Math.PI

    const northwest = tilingScheme.tileXYToNativeRectangle(0, 0, 1)
    expect(northwest.west).toBeCloseTo(-rPi, 8)
    expect(northwest.south).toBeCloseTo(0, 8)
    expect(northwest.east).toBeCloseTo(0, 8)
    expect(northwest.north).toBeCloseTo(rPi, 8)

    const northeast = tilingScheme.tileXYToNativeRectangle(1, 0, 1)
    expect(northeast.west).toBeCloseTo(0, 8)
    expect(northeast.south).toBeCloseTo(0, 8)
    expect(northeast.east).toBeCloseTo(rPi, 8)
    expect(northeast.north).toBeCloseTo(rPi, 8)

    const southwest = tilingScheme.tileXYToNativeRectangle(0, 1, 1)
    expect(southwest.west).toBeCloseTo(-rPi, 8)
    expect(southwest.south).toBeCloseTo(-rPi, 8)
    expect(southwest.east).toBeCloseTo(0, 8)
    expect(southwest.north).toBeCloseTo(0, 8)

    const southeast = tilingScheme.tileXYToNativeRectangle(1, 1, 1)
    expect(southeast.west).toBeCloseTo(0, 8)
    expect(southeast.south).toBeCloseTo(-rPi, 8)
    expect(southeast.east).toBeCloseTo(rPi, 8)
    expect(southeast.north).toBeCloseTo(0, 8)
  })

  it("tileXYToRectangle(0,0,0) 与 tilingScheme.rectangle 一致", () => {
    const tilingScheme = new WebMercatorTilingScheme()
    const rectangle = tilingScheme.tileXYToRectangle(0, 0, 0)
    expect(
      CesiumMath.equalsEpsilon(rectangle.west, tilingScheme.rectangle.west, CesiumMath.EPSILON10),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(rectangle.south, tilingScheme.rectangle.south, CesiumMath.EPSILON10),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(rectangle.east, tilingScheme.rectangle.east, CesiumMath.EPSILON10),
    ).toBe(true)
    expect(
      CesiumMath.equalsEpsilon(rectangle.north, tilingScheme.rectangle.north, CesiumMath.EPSILON10),
    ).toBe(true)
  })

  it("positionToTileXY 与 Cesium Spec 一致", () => {
    const tilingScheme = new WebMercatorTilingScheme()
    const sw = tilingScheme.positionToTileXY(new Cartographic(-Math.PI / 2.0, -Math.PI / 4.0), 1)
    expect(sw?.x).toBe(0)
    expect(sw?.y).toBe(1)

    const ne = tilingScheme.positionToTileXY(new Cartographic(Math.PI / 2.0, Math.PI / 4.0), 1)
    expect(ne?.x).toBe(1)
    expect(ne?.y).toBe(0)

    const center = tilingScheme.positionToTileXY(new Cartographic(0.0, 0.0), 1)
    expect(center?.x).toBe(1)
    expect(center?.y).toBe(1)
  })
})
