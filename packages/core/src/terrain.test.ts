import { describe, expect, it } from "vitest"
import { Credit } from "./Credit"
import { EasingFunction } from "./EasingFunction"
import { Ellipsoid } from "./Ellipsoid"
import {
  EllipsoidTerrainProvider,
  ELLIPSOID_TERRAIN_HEIGHTMAP_WIDTH,
} from "./EllipsoidTerrainProvider"
import { GeographicTilingScheme } from "./GeographicTilingScheme"
import { HeightmapTessellator } from "./HeightmapTessellator"
import { HeightmapTerrainData } from "./HeightmapTerrainData"
import { Rectangle } from "./Rectangle"
import { TerrainProvider } from "./TerrainProvider"
import { WebMercatorTilingScheme } from "./WebMercatorTilingScheme"
import { createVerticesFromHeightmap } from "./createVerticesFromHeightmap"

describe("Credit", () => {
  it("相同 html 共享 id", () => {
    Credit.resetIds()
    const a = new Credit("© OpenStreetMap contributors", true)
    const b = new Credit("© OpenStreetMap contributors", false)
    expect(a.equals(b)).toBe(true)
    expect(a.showOnScreen).toBe(true)
    expect(a.text).toBe("© OpenStreetMap contributors")
  })
})

describe("EasingFunction", () => {
  it("端点为 0 / 1，中点在 (0,1)", () => {
    for (const easing of Object.values(EasingFunction)) {
      expect(easing(0)).toBeCloseTo(0)
      expect(easing(1)).toBeCloseTo(1)
      const mid = easing(0.5)
      expect(mid).toBeGreaterThan(0)
      expect(mid).toBeLessThan(1)
    }
  })
})

describe("HeightmapTessellator", () => {
  it("16×16 顶点数与索引数与 Cesium 一致", () => {
    expect(HeightmapTessellator.vertexCount(16, 16)).toBe(256)
    expect(HeightmapTessellator.indexCount(16, 16)).toBe(15 * 15 * 6)
  })

  it("零高度网格顶点相对中心、UV 在 [0,1]", () => {
    const rectangle = Rectangle.fromDegrees(-10, -10, 10, 10)
    const mesh = HeightmapTessellator.computeVertices({
      heightmap: new Uint8Array(16 * 16),
      width: 16,
      height: 16,
      rectangle,
      ellipsoid: Ellipsoid.WGS84,
    })
    expect(mesh.vertices.length).toBe(256 * 5)
    expect(mesh.indices.length).toBe(1350)
    expect(mesh.minimumHeight).toBe(0)
    expect(mesh.maximumHeight).toBe(0)
    expect(mesh.boundingSphere3D.radius).toBeGreaterThan(0)
    let maxUv = 0
    for (let i = 0; i < 256; i++) {
      const u = mesh.vertices[i * 5 + 3]!
      const v = mesh.vertices[i * 5 + 4]!
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThanOrEqual(1)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
      maxUv = Math.max(maxUv, u, v)
    }
    expect(maxUv).toBe(1)
  })
})

describe("createVerticesFromHeightmap", () => {
  it("Worker 可传输结果与同步细分一致", () => {
    const rectangle = Rectangle.fromDegrees(0, 0, 1, 1)
    const output = createVerticesFromHeightmap({
      heightmap: new Uint8Array(16 * 16),
      width: 16,
      height: 16,
      west: rectangle.west,
      south: rectangle.south,
      east: rectangle.east,
      north: rectangle.north,
      ellipsoidRadii: [Ellipsoid.WGS84.radii.x, Ellipsoid.WGS84.radii.y, Ellipsoid.WGS84.radii.z],
    })
    expect(output.vertexCount).toBe(256)
    expect(output.indexCount).toBe(1350)
    expect(output.vertices.byteLength).toBe(256 * 5 * 4)
  })
})

describe("EllipsoidTerrainProvider", () => {
  it("默认 Geographic 方案并返回 16×16 零高度", async () => {
    const provider = new EllipsoidTerrainProvider()
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme)
    const data = await provider.requestTileGeometry(0, 0, 0)
    expect(data).toBeInstanceOf(HeightmapTerrainData)
    const mesh = await data.createMesh({
      tilingScheme: provider.tilingScheme,
      x: 0,
      y: 0,
      level: 0,
    })
    expect(mesh.vertexCountWithoutSkirts).toBe(
      ELLIPSOID_TERRAIN_HEIGHTMAP_WIDTH * ELLIPSOID_TERRAIN_HEIGHTMAP_WIDTH,
    )
    expect(provider.getLevelMaximumGeometricError(1)).toBeCloseTo(
      provider.getLevelMaximumGeometricError(0) / 2,
    )
  })

  it("可换 WebMercator 方案", () => {
    const tilingScheme = new WebMercatorTilingScheme()
    const provider = new EllipsoidTerrainProvider({ tilingScheme })
    expect(provider.tilingScheme).toBe(tilingScheme)
    const l0 = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
      tilingScheme.ellipsoid,
      64,
      tilingScheme.getNumberOfXTilesAtLevel(0),
    )
    expect(provider.getLevelMaximumGeometricError(0)).toBeCloseTo(l0)
  })
})
