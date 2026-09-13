import { describe, expect, it } from "vitest"
import {
  Cartesian3,
  Cartographic,
  CesiumMath,
  CustomHeightmapTerrainProvider,
  Ellipsoid,
  GeographicTilingScheme,
  HeightmapTerrainData,
  Ray,
  Rectangle,
  WebMercatorTilingScheme,
} from "@webgpu-cesium/core"
import { Camera } from "../Camera"
import { coveringTiles } from "../imagery/coveringTiles"
import { reprojectSourceUv } from "../imagery/ImageryReprojector"
import { QuadtreeTile } from "../quadtree/QuadtreeTile"
import { clampCameraToTerrain } from "../ScreenSpaceCameraController"
import { GlobeSurfaceTile } from "./GlobeSurfaceTile"
import { getHeightFromTiles, pickFromTiles } from "./globeHeight"
import { TerrainFillMesh } from "./TerrainFillMesh"
import { tilingSchemesCompatible } from "./GlobeSurfaceTileProvider"

describe("coveringTiles / 重投影 UV", () => {
  it("Geographic 西半球 0 级被一张 Mercator 0 级覆盖", () => {
    const geographic = new GeographicTilingScheme()
    const mercator = new WebMercatorTilingScheme()
    const west = geographic.tileXYToRectangle(0, 0, 0)
    const tiles = coveringTiles(mercator, west, 0)
    expect(tiles).toHaveLength(1)
    expect(tiles[0]).toEqual({ x: 0, y: 0 })
  })

  it("reprojectSourceUv 在源矩形中心附近落在 [0,1]", () => {
    const dest = new Rectangle(-1, -0.5, 1, 0.5)
    const src = new Rectangle(-Math.PI, -1, Math.PI, 1)
    const uv = reprojectSourceUv(0.5, 0.5, dest, src)
    expect(uv.u).toBeGreaterThan(0)
    expect(uv.u).toBeLessThan(1)
    expect(uv.v).toBeGreaterThan(0)
    expect(uv.v).toBeLessThan(1)
  })

  it("不同 0 级瓦片数则方案不兼容", () => {
    expect(
      tilingSchemesCompatible(new GeographicTilingScheme(), new WebMercatorTilingScheme()),
    ).toBe(false)
  })
})

describe("TerrainFillMesh", () => {
  it("常数高度填洞", () => {
    const rectangle = new GeographicTilingScheme().tileXYToRectangle(0, 0, 0)
    const mesh = TerrainFillMesh.createMesh(rectangle, Ellipsoid.default, 250, 100)
    expect(mesh.maximumHeight).toBeCloseTo(250, 5)
    expect(mesh.minimumHeight).toBeCloseTo(150, 5)
    expect(mesh.vertexCountWithoutSkirts).toBe(81)
    expect(mesh.vertices.length).toBeGreaterThan(81 * 5)
  })
})

describe("Globe.getHeight / pick", () => {
  it("从瓦片 terrainData 插值高度", () => {
    const scheme = new GeographicTilingScheme()
    const roots = QuadtreeTile.createLevelZeroTiles(scheme)
    const carto = Cartographic.fromDegrees(10, 20)
    const tile = roots.find((item) => Rectangle.contains(item.rectangle, carto))
    expect(tile).toBeDefined()
    const data = new HeightmapTerrainData({
      buffer: new Float32Array(4).fill(1234),
      width: 2,
      height: 2,
    })
    const surface = new GlobeSurfaceTile()
    surface.terrainData = data
    tile!.data = surface
    expect(getHeightFromTiles(roots, carto)).toBeCloseTo(1234, 5)
    expect(getHeightFromTiles(roots, carto, 2, 0)).toBeCloseTo(2468, 5)
  })

  it("射线能打到常数高度网格", async () => {
    const scheme = new GeographicTilingScheme()
    const roots = QuadtreeTile.createLevelZeroTiles(scheme)
    const tile = roots[0]
    expect(tile).toBeDefined()
    const data = new HeightmapTerrainData({
      buffer: new Float32Array(4).fill(0),
      width: 2,
      height: 2,
    })
    const mesh = await data.createMesh({
      tilingScheme: scheme,
      x: tile!.x,
      y: tile!.y,
      level: 0,
    })
    const surface = new GlobeSurfaceTile()
    surface.terrainData = data
    surface.mesh = mesh
    tile!.data = surface
    tile!.boundingRegion?.updateFromMesh(mesh)
    const center = Rectangle.center(tile!.rectangle)
    const origin = Cartesian3.fromRadians(center.longitude, center.latitude, 2.0e6)
    const target = Cartesian3.fromRadians(center.longitude, center.latitude, 0)
    const direction = Cartesian3.normalize(
      Cartesian3.subtract(target, origin, new Cartesian3()),
      new Cartesian3(),
    )
    const hit = pickFromTiles([tile!], new Ray(origin, direction))
    expect(hit).toBeDefined()
  })
})

describe("clampCameraToTerrain", () => {
  it("相机低于地形时抬高", () => {
    const camera = new Camera({ canvas: { clientWidth: 256, clientHeight: 256 } })
    camera.setView({
      destination: Cartesian3.fromDegrees(0, 0, 10),
      orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
    })
    const raised = clampCameraToTerrain(camera, () => 1000, 20, camera.ellipsoid)
    expect(raised).toBe(true)
    expect(camera.positionCartographic.height).toBeGreaterThan(1010)
  })
})

describe("CustomHeightmap 山体高度", () => {
  it("峰值附近明显高于远处", async () => {
    const peakLon = CesiumMath.toRadians(104)
    const peakLat = CesiumMath.toRadians(35)
    const scheme = new GeographicTilingScheme()
    const provider = new CustomHeightmapTerrainProvider({
      width: 17,
      height: 17,
      tilingScheme: scheme,
      callback(x, y, level) {
        const rectangle = scheme.tileXYToRectangle(x, y, level)
        const buffer = new Float32Array(17 * 17)
        for (let row = 0; row < 17; row++) {
          const lat = CesiumMath.lerp(rectangle.north, rectangle.south, row / 16)
          for (let col = 0; col < 17; col++) {
            const lon = CesiumMath.lerp(rectangle.west, rectangle.east, col / 16)
            const dlon = lon - peakLon
            const dlat = lat - peakLat
            buffer[row * 17 + col] = 4000 * Math.exp(-(dlon * dlon + dlat * dlat) / 0.0064)
          }
        }
        return buffer
      },
    })
    const xy = scheme.positionToTileXY(new Cartographic(peakLon, peakLat), 2)
    expect(xy).toBeDefined()
    const data = await provider.requestTileGeometry(xy!.x, xy!.y, 2)
    expect(data).toBeDefined()
    const rectangle = scheme.tileXYToRectangle(xy!.x, xy!.y, 2)
    const peak = data!.interpolateHeight(rectangle, peakLon, peakLat) ?? 0
    const far = data!.interpolateHeight(rectangle, rectangle.west, rectangle.south) ?? 0
    expect(peak).toBeGreaterThan(far + 500)
  })
})
