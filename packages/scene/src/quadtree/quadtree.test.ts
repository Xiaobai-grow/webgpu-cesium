import { describe, expect, it } from "vitest"
import {
  Cartesian3,
  CesiumMath,
  EllipsoidTerrainProvider,
  GeographicTilingScheme,
  Intersect,
  WebMercatorTilingScheme,
} from "@webgpu-cesium/core"
import type { RenderItem } from "@webgpu-cesium/renderer"
import { Camera } from "../Camera"
import { FrameState } from "../FrameState"
import { QuadtreePrimitive } from "./QuadtreePrimitive"
import { QuadtreeTile } from "./QuadtreeTile"
import { QuadtreeTileLoadState } from "./QuadtreeTileLoadState"
import type { QuadtreeTileProvider } from "./QuadtreeTileProvider"
import { TileSelectionResult } from "./TileSelectionResult"

function makeProvider(tilingScheme = new GeographicTilingScheme()): QuadtreeTileProvider {
  const terrain = new EllipsoidTerrainProvider({ tilingScheme })
  return {
    tilingScheme,
    update() {
      return
    },
    loadTile(tile) {
      tile.state = QuadtreeTileLoadState.DONE
      tile.data = { renderable: true }
    },
    computeTileVisibility() {
      return Intersect.INSIDE
    },
    canRefine(tile) {
      return tile.level < 3
    },
    showTileThisFrame() {
      return
    },
    createRenderItems() {
      return [] as RenderItem[]
    },
    getLevelMaximumGeometricError(level) {
      return terrain.getLevelMaximumGeometricError(level)
    },
    freeTile(tile) {
      tile.data = undefined
    },
  }
}

describe("QuadtreeTile 坐标", () => {
  it("Geographic 0 级为 2×1", () => {
    const tiles = QuadtreeTile.createLevelZeroTiles(new GeographicTilingScheme())
    expect(tiles).toHaveLength(2)
    expect(tiles[0]?.x).toBe(0)
    expect(tiles[1]?.x).toBe(1)
  })

  it("WebMercator 0 级为 1×1，子节点 SW/SE/NW/NE", () => {
    const scheme = new WebMercatorTilingScheme()
    const [root] = QuadtreeTile.createLevelZeroTiles(scheme)
    const children = root!.ensureChildren(scheme)
    expect(children).toHaveLength(4)
    expect(root!.southwestChild?.x).toBe(0)
    expect(root!.southwestChild?.y).toBe(1)
    expect(root!.northeastChild?.x).toBe(1)
    expect(root!.northeastChild?.y).toBe(0)
  })
})

describe("默认相机与 0 级瓦片可见性", () => {
  it("WebMercator 0 级包围球应在默认视锥内", () => {
    const camera = new Camera({ canvas: { clientWidth: 256, clientHeight: 256 } })
    camera.updateFrustumAspect(256, 256)
    camera.setView({
      destination: Cartesian3.fromDegrees(0, 0, 2.0e7),
      orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
    })
    const toEarth = Cartesian3.normalize(
      Cartesian3.negate(camera.positionWC, new Cartesian3()),
      new Cartesian3(),
    )
    const [root] = QuadtreeTile.createLevelZeroTiles(new WebMercatorTilingScheme())
    const sphere = root!.boundingRegion!.boundingSphere
    const volume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC,
    )
    expect(Cartesian3.dot(camera.directionWC, toEarth)).toBeGreaterThan(0.9)
    expect(sphere.radius).toBeGreaterThan(1e6)
    expect(volume.computeVisibility(sphere)).not.toBe(Intersect.OUTSIDE)
  })
})

describe("QuadtreePrimitive 选择", () => {
  it("太空视角只选粗 LOD", () => {
    const camera = new Camera({ canvas: { clientWidth: 800, clientHeight: 600 } })
    camera.updateFrustumAspect(800, 600)
    camera.position = Cartesian3.fromDegrees(0, 0, 2.5e7)
    Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), camera.direction)
    const frame = new FrameState(camera)
    frame.drawingBufferWidth = 800
    frame.drawingBufferHeight = 600
    frame.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC,
    )
    const primitive = new QuadtreePrimitive({
      tileProvider: makeProvider(),
      maximumScreenSpaceError: 2,
    })
    primitive.update(frame)
    expect(primitive.tilesToRender.length).toBeGreaterThan(0)
    const maxLevel = Math.max(...primitive.tilesToRender.map((tile) => tile.level))
    expect(maxLevel).toBeLessThanOrEqual(2)
    expect(
      primitive.tilesToRender.some((tile) => tile.selectionResult === TileSelectionResult.RENDERED),
    ).toBe(true)
  })

  it("近地视角细化到更高 level", () => {
    const camera = new Camera({ canvas: { clientWidth: 800, clientHeight: 600 } })
    camera.updateFrustumAspect(800, 600)
    camera.setView({
      destination: Cartesian3.fromDegrees(0, 0, 5000),
    })
    const frame = new FrameState(camera)
    frame.drawingBufferWidth = 800
    frame.drawingBufferHeight = 600
    frame.maximumScreenSpaceError = 2
    frame.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC,
    )
    const primitive = new QuadtreePrimitive({
      tileProvider: makeProvider(),
      maximumScreenSpaceError: 2,
    })
    primitive.update(frame)
    const maxLevel = Math.max(0, ...primitive.tilesToRender.map((tile) => tile.level))
    expect(maxLevel).toBeGreaterThanOrEqual(2)
  })
})
