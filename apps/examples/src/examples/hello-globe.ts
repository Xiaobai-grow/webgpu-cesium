/**
 * Hello Globe：零高度椭球 + OSM（CORS 友好底图）+ 相机控制。
 */
import {
  Cartesian3,
  CesiumMath,
  Credit,
  EllipsoidTerrainProvider,
  WebMercatorTilingScheme,
} from "@webgpu-cesium/core"
import { Globe, GridImageryProvider } from "@webgpu-cesium/scene"
import { CesiumViewer } from "@webgpu-cesium/widgets"
import type { ExampleCleanup } from "./index"

const GLOBE_VIEWS = {
  space: { lon: 10, lat: 25, height: 1.8e7 },
  country: { lon: 104, lat: 35, height: 4.5e6 },
  city: { lon: 116.4, lat: 39.9, height: 4.2e5 },
} as const

export async function run(canvas: HTMLCanvasElement): Promise<ExampleCleanup> {
  const tilingScheme = new WebMercatorTilingScheme()
  const globe = new Globe({
    terrainProvider: new EllipsoidTerrainProvider({ tilingScheme }),
  })
  const query = new URLSearchParams(window.location.hash.split("?")[1] ?? "")
  const useGrid = query.get("imagery") === "grid"
  const host = canvas.parentElement ?? document.body
  const viewer = await CesiumViewer.create({
    container: host,
    canvas,
    globe,
    useOsm: !useGrid,
  })
  if (useGrid) {
    globe.imageryLayers.addImageryProvider(
      new GridImageryProvider({
        tilingScheme,
        credit: new Credit("Grid imagery", true),
      }),
    )
  }
  const applyView = (name: keyof typeof GLOBE_VIEWS): void => {
    const view = GLOBE_VIEWS[name]
    viewer.scene.camera.setView({
      destination: Cartesian3.fromDegrees(view.lon, view.lat, view.height),
      orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
    })
  }
  applyView("space")
  window.helloGlobeSetView = (name) => {
    if (name === "space" || name === "country" || name === "city") {
      applyView(name)
    }
  }

  let fallbackArmed = false
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
    // 仅当从未成功解码过 OSM 时才挂 Grid，避免缩放过程中新瓦片未就绪被误判
    if (!fallbackArmed && !sawImagery && viewer.scene.frameState.frameNumber > 180) {
      fallbackArmed = true
      globe.imageryLayers.addImageryProvider(new GridImageryProvider({ tilingScheme }))
    }
  })

  return () => {
    remove()
    delete window.helloGlobeSetView
    viewer.destroy()
  }
}
