import { describe, expect, it } from "vitest"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"
import { GeographicTilingScheme } from "./GeographicTilingScheme"
import { Rectangle } from "./Rectangle"

describe("GeographicTilingScheme", () => {
  it("默认 2×1 根瓦片，level 0 东西两块与 Cesium 源码公式一致", () => {
    const tilingScheme = new GeographicTilingScheme()
    expect(tilingScheme.getNumberOfXTilesAtLevel(0)).toBe(2)
    expect(tilingScheme.getNumberOfYTilesAtLevel(0)).toBe(1)
    expect(tilingScheme.getNumberOfXTilesAtLevel(1)).toBe(4)
    expect(tilingScheme.getNumberOfYTilesAtLevel(1)).toBe(2)

    const westRoot = tilingScheme.tileXYToRectangle(0, 0, 0)
    expect(westRoot.west).toBe(-Math.PI)
    expect(westRoot.south).toBe(-CesiumMath.PI_OVER_TWO)
    expect(westRoot.east).toBe(0)
    expect(westRoot.north).toBe(CesiumMath.PI_OVER_TWO)

    const eastRoot = tilingScheme.tileXYToRectangle(1, 0, 0)
    expect(eastRoot.west).toBe(0)
    expect(eastRoot.south).toBe(-CesiumMath.PI_OVER_TWO)
    expect(eastRoot.east).toBe(Math.PI)
    expect(eastRoot.north).toBe(CesiumMath.PI_OVER_TWO)
  })

  it("level 1 东北子块 (3,0) 为 [π/2, 0, π, π/2]", () => {
    const tilingScheme = new GeographicTilingScheme()
    const rectangle = tilingScheme.tileXYToRectangle(3, 0, 1)
    expect(rectangle.west).toBeCloseTo(CesiumMath.PI_OVER_TWO, 12)
    expect(rectangle.south).toBeCloseTo(0, 12)
    expect(rectangle.east).toBeCloseTo(Math.PI, 12)
    expect(rectangle.north).toBeCloseTo(CesiumMath.PI_OVER_TWO, 12)
  })

  it("tileXYToNativeRectangle 把弧度写成度", () => {
    const tilingScheme = new GeographicTilingScheme()
    const native = tilingScheme.tileXYToNativeRectangle(0, 0, 0)
    expect(native.west).toBeCloseTo(-180, 12)
    expect(native.south).toBeCloseTo(-90, 12)
    expect(native.east).toBeCloseTo(0, 12)
    expect(native.north).toBeCloseTo(90, 12)
  })

  it("positionToTileXY 与 Cesium Spec 一致", () => {
    const tilingScheme = new GeographicTilingScheme()
    const westernRoot = tilingScheme.positionToTileXY(new Cartographic(-Math.PI / 2.0, 0.0), 0)
    expect(westernRoot?.x).toBe(0)
    expect(westernRoot?.y).toBe(0)

    const northeastChild = tilingScheme.positionToTileXY(
      new Cartographic((3.0 * Math.PI) / 4.0, Math.PI / 2.0),
      1,
    )
    expect(northeastChild?.x).toBe(3)
    expect(northeastChild?.y).toBe(0)

    const center = tilingScheme.positionToTileXY(new Cartographic(0.0, 0.0), 1)
    expect(center?.x).toBe(2)
    expect(center?.y).toBe(1)
  })

  it("单根瓦片覆盖整个 MAX_VALUE", () => {
    const tilingScheme = new GeographicTilingScheme({
      numberOfLevelZeroTilesX: 1,
      numberOfLevelZeroTilesY: 1,
    })
    const rectangle = tilingScheme.tileXYToRectangle(0, 0, 0)
    expect(Rectangle.equalsEpsilon(rectangle, tilingScheme.rectangle, CesiumMath.EPSILON10)).toBe(
      true,
    )
  })
})
