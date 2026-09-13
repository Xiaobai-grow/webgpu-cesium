/**
 * Hello Terrain：自定义高度图山体 + Grid / OSM；可选 ion 世界地形或 mars3d 中国地形。
 */
import {
  Cartesian3,
  CesiumMath,
  CesiumTerrainProvider,
  createWorldTerrainAsync,
  CustomHeightmapTerrainProvider,
  GeographicTilingScheme,
  Ion,
  TaskProcessor,
  setTerrainTaskProcessors,
  type TerrainProvider,
  type TilingScheme,
} from "@webgpu-cesium/core"
import { Globe, GridImageryProvider } from "@webgpu-cesium/scene"
import { CesiumViewer } from "@webgpu-cesium/widgets"
import type { ExampleCleanup } from "./index"

const PEAK_LON = 104
const PEAK_LAT = 35
const HEIGHTMAP_SIZE = 33
const MARS3D_TERRAIN_URL = "http://data.mars3d.cn/terrain"
const MARS3D_CREDIT = "Mars3D 中国地形 12.5m"

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

/**
 * `?terrain=mars3d` 或任意 http(s) 地形根 URL。
 *
 * @param value 查询参数
 */
function resolveTerrainUrl(value: string | null): string | undefined {
  if (value === null || value.length === 0) {
    return undefined
  }
  if (value === "mars3d") {
    return MARS3D_TERRAIN_URL
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value
  }
  return undefined
}

export async function run(canvas: HTMLCanvasElement): Promise<ExampleCleanup> {
  tryEnableTerrainWorkers()
  const hash = window.location.hash
  const query = new URLSearchParams(hash.split("?")[1] ?? "")
  const useGrid = query.get("imagery") === "grid"
  const ionToken = query.get("ion") ?? query.get("token") ?? Ion.defaultAccessToken
  const remoteTerrainUrl =
    resolveTerrainUrl(query.get("terrain")) ??
    (hash.includes("hello-terrain-china") ? MARS3D_TERRAIN_URL : undefined)
  let tilingScheme: TilingScheme = new GeographicTilingScheme()
  let terrainProvider: TerrainProvider = createMountainProvider(tilingScheme)
  let remoteTerrain = false
  if (remoteTerrainUrl !== undefined) {
    terrainProvider = await CesiumTerrainProvider.fromUrl(remoteTerrainUrl, {
      ...(remoteTerrainUrl === MARS3D_TERRAIN_URL ? { credit: MARS3D_CREDIT } : {}),
    })
    tilingScheme = terrainProvider.tilingScheme
    remoteTerrain = true
  } else if (ionToken.length > 0) {
    Ion.defaultAccessToken = ionToken
    terrainProvider = await createWorldTerrainAsync().catch(() =>
      createMountainProvider(tilingScheme),
    )
  }
  const globe = new Globe({ terrainProvider })
  globe.verticalExaggeration = remoteTerrain ? 3 : 4
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
    if (name === "space") {
      viewer.scene.camera.setView({
        destination: Cartesian3.fromDegrees(
          remoteTerrain ? 104 : PEAK_LON,
          remoteTerrain ? 33 : PEAK_LAT,
          remoteTerrain ? 1.2e7 : 1.8e7,
        ),
        orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
      })
      return
    }
    if (name === "emei") {
      viewer.scene.camera.setView({
        destination: Cartesian3.fromDegrees(103.45, 29.2, 1.1e5),
        orientation: {
          heading: CesiumMath.toRadians(340),
          pitch: CesiumMath.toRadians(-20),
          roll: 0,
        },
      })
      return
    }
    if (name === "siguniang" || (remoteTerrain && name === "slope")) {
      viewer.scene.camera.setView({
        destination: Cartesian3.fromDegrees(102.88, 30.85, 4.8e4),
        orientation: {
          heading: CesiumMath.toRadians(8),
          pitch: CesiumMath.toRadians(-20),
          roll: 0,
        },
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
    if (name !== "mountain") {
      return
    }
    viewer.scene.camera.setView({
      destination: Cartesian3.fromDegrees(PEAK_LON, PEAK_LAT - 1.2, 1.6e5),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-28), roll: 0 },
    })
  }
  applyView(remoteTerrain ? "siguniang" : "slope")
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
function createMountainProvider(tilingScheme: TilingScheme): CustomHeightmapTerrainProvider {
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
