/**
 * 本地 3D Tiles：四栋彩色盒子，走同一 G-buffer。
 */
import { Cartesian2, Cartesian3, JulianDate, Matrix4, Transforms } from "@webgpu-cesium/core"
import { DirectionalLight } from "@webgpu-cesium/renderer"
import { Globe } from "@webgpu-cesium/scene"
import { Cesium3DTileset, Cesium3DTileStyle, createCityTilesetJson } from "@webgpu-cesium/tiles"
import { CesiumViewer } from "@webgpu-cesium/widgets"
import type { ExampleCleanup } from "./index"

const ORIGIN = Cartesian3.fromDegrees(8, 46, 8)

export async function run(canvas: HTMLCanvasElement): Promise<ExampleCleanup> {
  const globe = new Globe()
  globe.show = false
  const host = canvas.parentElement ?? document.body
  const viewer = await CesiumViewer.create({
    container: host,
    canvas,
    globe,
    useOsm: false,
  })
  const scene = viewer.scene
  scene.skyAtmosphere.show = false
  scene.fog.enabled = false
  scene.screenSpaceCameraController.enableCollisionDetection = false
  const enu = Transforms.eastNorthUpToFixedFrame(ORIGIN)
  scene.light = new DirectionalLight({
    direction: Matrix4.multiplyByPointAsVector(
      enu,
      Cartesian3.normalize(new Cartesian3(0.45, -0.4, 0.78), new Cartesian3()),
      new Cartesian3(),
    ),
    intensity: 1.15,
  })

  const query = new URLSearchParams(window.location.hash.split("?")[1] ?? "")
  const { tileset } = createCityTilesetJson({ longitude: 8, latitude: 46, height: 8 })
  const loaded = await Cesium3DTileset.fromJson(tileset)
  if (query.get("style") === "override") {
    loaded.style = new Cesium3DTileStyle({ color: "color('#66ccff')" })
  }
  scene.tilesets.push(loaded)

  scene.clock.currentTime = JulianDate.fromIso8601("2024-06-21T12:00:00Z")
  scene.camera.lookAt(ORIGIN, new Cartesian3(2, -22, 14))

  const onClick = (event: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect()
    void scene
      .pickAsync(new Cartesian2(event.clientX - rect.left, event.clientY - rect.top))
      .then((hit) => {
        canvas.dataset.pickHit = hit ? "1" : "0"
      })
  }
  canvas.addEventListener("click", onClick)

  const remove = scene.postRender.addEventListener(() => {
    if (scene.frameState.statistics.renderItemCount > 0) {
      canvas.dataset.tilesetReady = "1"
    }
  })

  return () => {
    canvas.removeEventListener("click", onClick)
    remove()
    viewer.destroy()
  }
}
