/**
 * 大气地球：正午 / 日落 / 夜晚，Hillaire 天空 + 日盘月盘星空。
 */
import { Cartesian3, CesiumMath, ClockRange, JulianDate } from "@webgpu-cesium/core"
import { Globe, GridImageryProvider } from "@webgpu-cesium/scene"
import { CesiumViewer } from "@webgpu-cesium/widgets"
import type { ExampleCleanup } from "./index"

const VIEWS = {
  space: { lon: 10, lat: 25, height: 1.8e7 },
  sunset: { lon: 10, lat: 25, height: 2.4e6 },
  surface: { lon: 10, lat: 25, height: 4e5 },
} as const

export async function run(canvas: HTMLCanvasElement): Promise<ExampleCleanup> {
  const globe = new Globe()
  const query = new URLSearchParams(window.location.hash.split("?")[1] ?? "")
  const useGrid = query.get("imagery") !== "osm"
  const host = canvas.parentElement ?? document.body
  const viewer = await CesiumViewer.create({
    container: host,
    canvas,
    globe,
    useOsm: !useGrid,
  })
  if (useGrid) {
    globe.imageryLayers.removeAll()
    globe.imageryLayers.addImageryProvider(new GridImageryProvider())
  }

  const scene = viewer.scene
  scene.clock.shouldAnimate = false
  scene.clock.clockRange = ClockRange.UNBOUNDED
  const setTime = (iso: string): void => {
    scene.clock.currentTime = JulianDate.fromIso8601(iso)
    scene.requestRender()
  }
  setTime("2024-06-21T12:00:00Z")

  const applyView = (name: keyof typeof VIEWS): void => {
    const view = VIEWS[name]
    scene.camera.setView({
      destination: Cartesian3.fromDegrees(view.lon, view.lat, view.height),
      orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
    })
  }
  applyView("space")

  window.atmosphereEarthSetTime = (name) => {
    if (name === "noon") {
      setTime("2024-06-21T12:00:00Z")
    } else if (name === "sunset") {
      setTime("2024-06-21T18:20:00Z")
      applyView("sunset")
    } else if (name === "night") {
      setTime("2024-06-21T00:10:00Z")
    }
  }
  window.atmosphereEarthSetView = (name) => {
    if (name === "space" || name === "sunset" || name === "surface") {
      applyView(name)
    }
  }

  const bar = document.createElement("div")
  bar.className = "webgpu-cesium-time-bar"
  bar.style.cssText =
    "position:absolute;left:12px;bottom:48px;z-index:4;display:flex;gap:8px;flex-wrap:wrap"
  for (const [label, key] of [
    ["正午", "noon"],
    ["日落", "sunset"],
    ["夜晚", "night"],
  ] as const) {
    const button = document.createElement("button")
    button.textContent = label
    button.addEventListener("click", () => window.atmosphereEarthSetTime?.(key))
    bar.appendChild(button)
  }
  host.appendChild(bar)

  const remove = scene.postRender.addEventListener(() => {
    if (scene.frameState.statistics.tilesRendered > 0) {
      canvas.dataset.atmosphereReady = "1"
    }
    const graph = scene.exportGraph()
    if (graph && !canvas.dataset.graphExported) {
      canvas.dataset.graphExported = "1"
      canvas.dataset.graphPasses = graph.passes.join(",")
    }
  })

  return () => {
    remove()
    bar.remove()
    delete window.atmosphereEarthSetTime
    delete window.atmosphereEarthSetView
    viewer.destroy()
  }
}
