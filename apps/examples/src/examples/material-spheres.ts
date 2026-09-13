/**
 * 材质球网格：金属 / 粗糙度 / 清漆，走 G-buffer + 延迟光照。
 */
import { Cartesian3, Color, JulianDate, Matrix4, Transforms } from "@webgpu-cesium/core"
import {
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from "@webgpu-cesium/renderer"
import { Globe } from "@webgpu-cesium/scene"
import { CesiumViewer } from "@webgpu-cesium/widgets"
import type { ExampleCleanup } from "./index"

const ORIGIN = Cartesian3.fromDegrees(8, 46, 180)

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
  const lightLocal = Cartesian3.normalize(new Cartesian3(0.55, -0.35, 0.76), new Cartesian3())
  scene.light = new DirectionalLight({
    direction: Matrix4.multiplyByPointAsVector(enu, lightLocal, new Cartesian3()),
    intensity: 1.15,
  })
  const local = new Cartesian3()
  const world = new Cartesian3()

  const metalSteps = [0, 0.35, 0.7, 1]
  const roughSteps = [0.08, 0.3, 0.6, 0.95]
  for (let j = 0; j < metalSteps.length; j++) {
    for (let i = 0; i < roughSteps.length; i++) {
      local.x = (i - 1.5) * 3.4
      local.y = (j - 1.5) * 3.4
      local.z = 1.2
      Matrix4.multiplyByPoint(enu, local, world)
      scene.meshes.push(
        new Mesh({
          geometry: "sphere",
          radius: 1,
          center: Cartesian3.clone(world, new Cartesian3()),
          material: new MeshStandardMaterial({
            color: new Color(0.72, 0.45, 0.22, 1),
            metalness: metalSteps[j] ?? 0,
            roughness: roughSteps[i] ?? 1,
            side: DoubleSide,
          }),
        }),
      )
    }
  }
  for (let i = 0; i < 4; i++) {
    local.x = (i - 1.5) * 3.4
    local.y = 8
    local.z = 1.2
    Matrix4.multiplyByPoint(enu, local, world)
    scene.meshes.push(
      new Mesh({
        geometry: i % 2 === 0 ? "sphere" : "box",
        radius: 1,
        center: Cartesian3.clone(world, new Cartesian3()),
        material: new MeshPhysicalMaterial({
          color: new Color(0.85, 0.86, 0.9, 1),
          metalness: 0.1,
          roughness: 0.15,
          clearcoat: 0.25 + i * 0.25,
          clearcoatRoughness: 0.05 + i * 0.08,
          side: DoubleSide,
        }),
      }),
    )
  }

  scene.clock.currentTime = JulianDate.fromIso8601("2024-06-21T12:00:00Z")
  scene.camera.lookAt(ORIGIN, new Cartesian3(4, -18, 11))

  const remove = scene.postRender.addEventListener(() => {
    if (scene.frameState.frameNumber > 2) {
      canvas.dataset.materialsReady = "1"
    }
  })

  return () => {
    remove()
    viewer.destroy()
  }
}
