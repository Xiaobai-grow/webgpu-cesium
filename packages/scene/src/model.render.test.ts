/**
 * 浏览器：glTF 盒子写 G-buffer，copyTextureToBuffer 非全黑。
 */
import { Cartesian3, JulianDate, Matrix4, Transforms } from "@webgpu-cesium/core"
import { DirectionalLight, hasNonBlackPixels } from "@webgpu-cesium/renderer"
import { GpuDevice } from "@webgpu-cesium/rhi"
import { bytesToDataUri, Cesium3DTileset, createBoxGlb, Model } from "@webgpu-cesium/tiles"
import { afterAll, describe, expect, it } from "vitest"
import { Globe } from "./globe/Globe"
import { Scene } from "./Scene"

const probe = await GpuDevice.probe()
const hasWebGpu = probe.supported
if (!hasWebGpu) {
  console.warn(`[scene] 跳过 GPU 模型测试：${probe.reason ?? "unknown"}`)
}

describe.skipIf(!hasWebGpu)("Model / 3D Tiles 渲染回读", () => {
  let device: GpuDevice | undefined

  afterAll(() => {
    device?.destroy()
  })

  it("内存 glTF 盒子 copyTextureToBuffer 非全黑", async () => {
    device = await GpuDevice.create({ label: "model-render-test" })
    const canvas = document.createElement("canvas")
    canvas.width = 256
    canvas.height = 256
    canvas.style.width = "256px"
    canvas.style.height = "256px"
    document.body.appendChild(canvas)

    const globe = new Globe()
    globe.show = false
    const scene = new Scene({ canvas, device, globe })
    scene.skyAtmosphere.show = false
    scene.fog.enabled = false
    const origin = Cartesian3.fromDegrees(8, 46, 20)
    const enu = Transforms.eastNorthUpToFixedFrame(origin)
    const model = await Model.fromGltfAsync({
      gltf: createBoxGlb({ color: [0.9, 0.25, 0.15, 1], metallic: 0.3, roughness: 0.35 }),
      modelMatrix: enu,
    })
    scene.models.push(model)
    scene.light = new DirectionalLight({
      direction: Matrix4.multiplyByPointAsVector(
        enu,
        Cartesian3.normalize(new Cartesian3(0.4, -0.3, 0.85), new Cartesian3()),
        new Cartesian3(),
      ),
      intensity: 1.2,
    })
    scene.clock.currentTime = JulianDate.fromIso8601("2024-06-21T12:00:00Z")
    scene.camera.lookAt(origin, new Cartesian3(0, -18, 10))

    let pixels: Uint8Array<ArrayBufferLike> = new Uint8Array()
    for (let i = 0; i < 20; i++) {
      scene.render()
      pixels = await scene.readColorBuffer()
      if (hasNonBlackPixels(pixels, 20)) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 16))
    }
    expect(hasNonBlackPixels(pixels, 20)).toBe(true)
    scene.destroy()
    canvas.remove()
  })

  it("单瓦片 tileset 产出 G-buffer RenderItem", async () => {
    device = await GpuDevice.create({ label: "tileset-render-test" })
    const canvas = document.createElement("canvas")
    canvas.width = 256
    canvas.height = 256
    canvas.style.width = "256px"
    canvas.style.height = "256px"
    document.body.appendChild(canvas)

    const globe = new Globe()
    globe.show = false
    const scene = new Scene({ canvas, device, globe })
    scene.skyAtmosphere.show = false
    scene.fog.enabled = false
    const origin = Cartesian3.fromDegrees(8, 46, 20)
    const enu = Transforms.eastNorthUpToFixedFrame(origin)
    const glb = createBoxGlb({
      color: [0.9, 0.25, 0.15, 1],
      metallic: 0.3,
      roughness: 0.35,
      size: 2.2,
    })
    const loaded = await Cesium3DTileset.fromJson({
      asset: { version: "1.1" },
      geometricError: 0,
      root: {
        boundingVolume: { sphere: [0, 0, 0, 20] },
        geometricError: 0,
        transform: Array.from(enu),
        content: { uri: bytesToDataUri(glb, "model/gltf-binary") },
      },
    })
    await loaded.root?.requestContent()
    expect(loaded.root?.content.model).toBeDefined()
    scene.tilesets.push(loaded)
    scene.light = new DirectionalLight({
      direction: Matrix4.multiplyByPointAsVector(
        enu,
        Cartesian3.normalize(new Cartesian3(0.4, -0.3, 0.85), new Cartesian3()),
        new Cartesian3(),
      ),
      intensity: 1.2,
    })
    scene.clock.currentTime = JulianDate.fromIso8601("2024-06-21T12:00:00Z")
    scene.camera.lookAt(origin, new Cartesian3(0, -18, 10))

    let items = 0
    for (let i = 0; i < 40; i++) {
      scene.render()
      items = scene.frameState.statistics.renderItemCount
      if (items > 0) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 16))
    }
    expect(items).toBeGreaterThan(0)
    scene.destroy()
    canvas.remove()
  })
})
