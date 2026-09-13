/**
 * Hello Terrain：自定义高度图山体 + Grid / OSM；可选 ion 世界地形。
 */
import {
  Cartesian3,
  CesiumMath,
  createWorldTerrainAsync,
  CustomHeightmapTerrainProvider,
  GeographicTilingScheme,
  Ion,
  TaskProcessor,
  setTerrainTaskProcessors,
  type TerrainProvider,
} from "@webgpu-cesium/core"
import { Globe, GridImageryProvider } from "@webgpu-cesium/scene"
import { CesiumViewer } from "@webgpu-cesium/widgets"
import type { ExampleCleanup } from "./index"

const PEAK_LON = 104
const PEAK_LAT = 35
const HEIGHTMAP_SIZE = 33

function mountainHeight(longitude: number, latitude: number): number {
  const dlon = longitude - CesiumMath.toRadians(PEAK_LON)
  const dlat = latitude - CesiumMath.toRadians(PEAK_LAT)
  const radius = CesiumMath.toRadians(3.5)
  const distance = Math.sqrt(dlon * dlon + dlat * dlat)
  if (distance >= radius) {
    return 0
  }
  return 18000 * (1 - distance / radius)
}

function tryEnableTerrainWorkers(): void {
  if (typeof Worker === "undefined") {
    return
  }
  try {
    setTerrainTaskProcessors({
      heightmap: new TaskProcessor(
        new URL(
          "../../../../packages/core/src/workers/createVerticesFromHeightmapWorker.ts",
          import.meta.url,
        ),
      ),
      quantizedMesh: new TaskProcessor(
        new URL(
          "../../../../packages/core/src/workers/createVerticesFromQuantizedTerrainMeshWorker.ts",
          import.meta.url,
        ),
      ),
    })
  } catch {
    setTerrainTaskProcessors({})
  }
}

export async function run(canvas: HTMLCanvasElement): Promise<ExampleCleanup> {
  tryEnableTerrainWorkers()
  const query = new URLSearchParams(window.location.hash.split("?")[1] ?? "")
  const useGrid = query.get("imagery") === "grid"
  const ionToken = query.get("ion") ?? query.get("token") ?? Ion.defaultAccessToken
  const tilingScheme = new GeographicTilingScheme()
  let terrainProvider: TerrainProvider = createMountainProvider(tilingScheme)
  if (ionToken.length > 0) {
    Ion.defaultAccessToken = ionToken
    terrainProvider = await createWorldTerrainAsync().catch(() =>
      createMountainProvider(tilingScheme),
    )
  }
  const globe = new Globe({ terrainProvider })
  globe.verticalExaggeration = 4
  const host = canvas.parentElement ?? document.body
  const viewer = await CesiumViewer.create({
    container: host,
    canvas,
    globe,
    useOsm: !useGrid,
  })
  if (useGrid) {
    globe.imageryLayers.addImageryProvider(new GridImageryProvider({ tilingScheme }))
  }
  viewer.scene.screenSpaceCameraController.enableCollisionDetection = true
  const applyView = (name: string): void => {
    if (name !== "mountain" && name !== "slope" && name !== "space") {
      return
    }
    if (name === "space") {
      viewer.scene.camera.setView({
        destination: Cartesian3.fromDegrees(PEAK_LON, PEAK_LAT, 1.8e7),
        orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
      })
      return
    }
    if (name === "slope") {
      viewer.scene.camera.setView({
        destination: Cartesian3.fromDegrees(PEAK_LON - 2.4, PEAK_LAT - 1.6, 9.0e4),
        orientation: {
          heading: CesiumMath.toRadians(40),
          pitch: CesiumMath.toRadians(-18),
          roll: 0,
        },
      })
      return
    }
    viewer.scene.camera.setView({
      destination: Cartesian3.fromDegrees(PEAK_LON, PEAK_LAT - 1.2, 1.6e5),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-28), roll: 0 },
    })
  }
  applyView("slope")
  window.helloTerrainSetView = applyView

  let sawImagery = false
  const remove = viewer.scene.postRender.addEventListener(() => {
    if (viewer.scene.frameState.statistics.tilesRendered > 0) {
      canvas.dataset.globeReady = "1"
    }
    const anyReady = viewer.scene.globe.quadtree?.tilesToRender.some((tile) => {
      const surface = tile.data as { tileImagery?: { readyImagery?: unknown }[] } | undefined
      return surface?.tileImagery?.some((item) => item.readyImagery)
    })
    if (anyReady) {
      sawImagery = true
      canvas.dataset.globeTextured = "1"
    }
    if (!sawImagery && viewer.scene.frameState.frameNumber > 180) {
      globe.imageryLayers.addImageryProvider(new GridImageryProvider({ tilingScheme }))
      sawImagery = true
    }
  })

  return () => {
    remove()
    delete window.helloTerrainSetView
    setTerrainTaskProcessors({})
    viewer.destroy()
  }
}

/**
 * 甘南附近高斯丘。
 *
 * @param tilingScheme Geographic
 */
function createMountainProvider(
  tilingScheme: GeographicTilingScheme,
): CustomHeightmapTerrainProvider {
  return new CustomHeightmapTerrainProvider({
    width: HEIGHTMAP_SIZE,
    height: HEIGHTMAP_SIZE,
    tilingScheme,
    callback(x, y, level) {
      const rectangle = tilingScheme.tileXYToRectangle(x, y, level)
      const buffer = new Float32Array(HEIGHTMAP_SIZE * HEIGHTMAP_SIZE)
      const last = HEIGHTMAP_SIZE - 1
      for (let row = 0; row < HEIGHTMAP_SIZE; row++) {
        const lat = CesiumMath.lerp(rectangle.north, rectangle.south, row / last)
        for (let col = 0; col < HEIGHTMAP_SIZE; col++) {
          const lon = CesiumMath.lerp(rectangle.west, rectangle.east, col / last)
          buffer[row * HEIGHTMAP_SIZE + col] = mountainHeight(lon, lat)
        }
      }
      return buffer
    },
  })
}
