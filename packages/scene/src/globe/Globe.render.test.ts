/**
 * 浏览器：画一帧地球并用 copyTextureToBuffer 断言非全黑。无 WebGPU 则 skip。
 */
import {
  Cartesian3,
  CesiumMath,
  EllipsoidTerrainProvider,
  WebMercatorTilingScheme,
} from "@webgpu-cesium/core"
import { hasNonBlackPixels } from "@webgpu-cesium/renderer"
import { GpuDevice } from "@webgpu-cesium/rhi"
import { afterAll, describe, expect, it } from "vitest"
import { GridImageryProvider } from "../imagery/GridImageryProvider"
import { Scene } from "../Scene"
import { Globe } from "./Globe"

const probe = await GpuDevice.probe()
const hasWebGpu = probe.supported
if (!hasWebGpu) {
  console.warn(`[scene] 跳过 GPU 地球测试：${probe.reason ?? "unknown"}`)
}

describe.skipIf(!hasWebGpu)("Globe 渲染回读", () => {
  let device: GpuDevice | undefined

  afterAll(() => {
    device?.destroy()
  })

  it("Grid 影像地球 copyTextureToBuffer 非全黑", async () => {
    device = await GpuDevice.create({ label: "globe-render-test" })
    const canvas = document.createElement("canvas")
    canvas.width = 256
    canvas.height = 256
    canvas.style.width = "256px"
    canvas.style.height = "256px"
    document.body.appendChild(canvas)

    const tilingScheme = new WebMercatorTilingScheme()
    const globe = new Globe({
      terrainProvider: new EllipsoidTerrainProvider({ tilingScheme }),
    })
    globe.imageryLayers.addImageryProvider(new GridImageryProvider({ tilingScheme }))
    const scene = new Scene({ canvas, device, globe })
    scene.camera.setView({
      destination: Cartesian3.fromDegrees(0, 0, 2.0e7),
      orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
    })

    let pixels: Uint8Array<ArrayBufferLike> = new Uint8Array()
    let tilesRendered = 0
    for (let i = 0; i < 45; i++) {
      scene.render()
      tilesRendered = scene.frameState.statistics.tilesRendered
      pixels = await scene.readColorBuffer()
      if (tilesRendered > 0 && hasNonBlackPixels(pixels, 40)) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 16))
    }
    let maxChannel = 0
    for (let i = 0; i < pixels.length; i += 4) {
      maxChannel = Math.max(maxChannel, pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0)
    }
    expect(
      tilesRendered,
      `tilesRendered=${String(tilesRendered)} maxChannel=${String(maxChannel)}`,
    ).toBeGreaterThan(0)
    expect(hasNonBlackPixels(pixels, 40), `maxChannel=${String(maxChannel)}`).toBe(true)
    scene.destroy()
    canvas.remove()
  })
})
