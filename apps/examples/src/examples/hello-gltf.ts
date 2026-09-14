/**
 * glTF 模型：PBR 盒 + unlit 盒 + MeshBasicMaterial 覆写。
 */
import { Cartesian3, Color, JulianDate, Matrix4, Transforms } from "@webgpu-cesium/core"
import { DirectionalLight, MeshBasicMaterial } from "@webgpu-cesium/renderer"
import { Globe } from "@webgpu-cesium/scene"
import { createBoxGlb, Model } from "@webgpu-cesium/tiles"
import { CesiumViewer } from "@webgpu-cesium/widgets"
import type { ExampleCleanup } from "./index"

const ORIGIN = Cartesian3.fromDegrees(8, 46, 20)

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
  const lightLocal = Cartesian3.normalize(new Cartesian3(0.5, -0.35, 0.8), new Cartesian3())
  scene.light = new DirectionalLight({
    direction: Matrix4.multiplyByPointAsVector(enu, lightLocal, new Cartesian3()),
    intensity: 1.2,
  })

  const pbr = await Model.fromGltfAsync({
    gltf: createBoxGlb({ color: [0.82, 0.4, 0.18, 1], metallic: 0.65, roughness: 0.28, size: 2.2 }),
    modelMatrix: offsetEnu(enu, -3.2, 0, 0),
  })
  const unlit = await Model.fromGltfAsync({
    gltf: createBoxGlb({ color: [0.95, 0.85, 0.2, 1], unlit: true, size: 2.2 }),
    modelMatrix: offsetEnu(enu, 0, 0, 0),
  })
  const override = await Model.fromGltfAsync({
    gltf: createBoxGlb({ color: [0.2, 0.55, 0.9, 1], metallic: 0.1, roughness: 0.4, size: 2.2 }),
    modelMatrix: offsetEnu(enu, 3.2, 0, 0),
  })
  override.material = new MeshBasicMaterial({ color: new Color(0.15, 0.9, 0.55, 1) })
  scene.models.push(pbr, unlit, override)

  scene.clock.currentTime = JulianDate.fromIso8601("2024-06-21T12:00:00Z")
  scene.camera.lookAt(ORIGIN, new Cartesian3(2, -16, 8))

  const remove = scene.postRender.addEventListener(() => {
    if (scene.frameState.frameNumber > 2 && scene.frameState.statistics.renderItemCount > 0) {
      canvas.dataset.gltfReady = "1"
    }
  })

  return () => {
    remove()
    viewer.destroy()
  }
}

function offsetEnu(enu: Matrix4, east: number, north: number, up: number): Matrix4 {
  const local = new Cartesian3(east, north, up)
  const world = Matrix4.multiplyByPoint(enu, local, new Cartesian3())
  return Transforms.eastNorthUpToFixedFrame(world)
}
