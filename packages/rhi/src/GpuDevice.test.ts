/**
 * GpuDevice 浏览器测试。无 `navigator.gpu` 或拿不到适配器时整组 skip（不算失败）。
 */
import { RuntimeError } from "@webgpu-cesium/core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { GpuDevice } from "./GpuDevice"
import { OPTIONAL_FEATURE_WHITELIST, selectSupportedFeatures } from "./features"

const probe = await GpuDevice.probe()
const hasWebGpu = probe.supported

if (!hasWebGpu) {
  console.warn(`[rhi] 跳过 GPU 测试：${probe.reason ?? "unknown"}`)
}

describe("GpuDevice (无 GPU 也可运行)", () => {
  it("navigator.gpu 缺失时抛 RuntimeError 且文案正确", async () => {
    await expect(GpuDevice.create({ gpu: null })).rejects.toThrowError(
      "WebGPU is not supported by this browser",
    )
    await expect(GpuDevice.create({ gpu: null })).rejects.toBeInstanceOf(RuntimeError)
  })

  it("requestAdapter 返回 null 时抛 RuntimeError", async () => {
    const fakeGpu = {
      requestAdapter: () => Promise.resolve(null),
      getPreferredCanvasFormat: () => "bgra8unorm" as GPUTextureFormat,
    } as unknown as GPU
    await expect(GpuDevice.create({ gpu: fakeGpu })).rejects.toThrowError(
      /No WebGPU adapter available/,
    )
  })

  it("selectSupportedFeatures 只挑白名单内可用项", () => {
    const available = new Set(["timestamp-query", "not-in-list", "shader-f16"])
    expect(selectSupportedFeatures(available)).toEqual(["timestamp-query", "shader-f16"])
    expect(selectSupportedFeatures(new Set(), OPTIONAL_FEATURE_WHITELIST)).toEqual([])
  })
})

describe.skipIf(!hasWebGpu)("GpuDevice (需要 WebGPU)", () => {
  let gpuDevice: GpuDevice

  beforeAll(async () => {
    gpuDevice = await GpuDevice.create({ label: "test" })
  })

  afterAll(() => {
    gpuDevice.destroy()
  })

  it("创建成功并暴露 adapter / device / features / limits / canvasFormat", () => {
    expect(gpuDevice.device).toBeDefined()
    expect(gpuDevice.adapter).toBeDefined()
    expect(gpuDevice.label).toBe("rhi/GpuDevice/test")
    expect(["bgra8unorm", "rgba8unorm"]).toContain(gpuDevice.canvasFormat)
    expect(gpuDevice.limits.maxBindGroups).toBeGreaterThanOrEqual(4)
    // 启用的 feature 都在白名单内
    for (const feature of gpuDevice.features) {
      expect(OPTIONAL_FEATURE_WHITELIST).toContain(feature)
    }
    console.info(`[rhi] adapter: ${JSON.stringify(gpuDevice.adapterInfo)}`)
    console.info(`[rhi] features: ${[...gpuDevice.features].join(", ")}`)
  })

  it("configureCanvas 返回已配置的上下文", () => {
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    const context = gpuDevice.configureCanvas(canvas)
    const texture = context.getCurrentTexture()
    expect(texture.format).toBe(gpuDevice.canvasFormat)
    expect(texture.width).toBe(64)
  })

  it("缓存：相同描述返回同一对象", async () => {
    const layout = gpuDevice.bindGroupLayouts.get({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }],
    })
    const sameLayout = gpuDevice.bindGroupLayouts.get({
      label: "different label",
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }],
    })
    expect(sameLayout).toBe(layout)
    expect(gpuDevice.bindGroupLayouts.size).toBe(1)

    const sampler = gpuDevice.samplers.get({ magFilter: "linear", minFilter: "linear" })
    expect(gpuDevice.samplers.get({ minFilter: "linear", magFilter: "linear" })).toBe(sampler)

    const code = `
      @vertex fn vsMain(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
      }
      @fragment fn fsMain() -> @location(0) vec4<f32> { return vec4<f32>(1.0); }
    `
    const module = gpuDevice.shaderModules.get(code, "test-module")
    expect(gpuDevice.shaderModules.get(code, "test-module")).toBe(module)

    const pipelineLayout = gpuDevice.bindGroupLayouts.getPipelineLayout([layout])
    const descriptor: GPURenderPipelineDescriptor = {
      layout: pipelineLayout,
      vertex: { module, entryPoint: "vsMain" },
      fragment: { module, entryPoint: "fsMain", targets: [{ format: gpuDevice.canvasFormat }] },
      primitive: { topology: "triangle-list" },
    }
    const pipeline = gpuDevice.pipelines.getRenderPipeline(descriptor)
    expect(gpuDevice.pipelines.getRenderPipeline({ ...descriptor, label: "other" })).toBe(pipeline)
    expect(await gpuDevice.pipelines.getRenderPipelineAsync(descriptor)).toBe(pipeline)
    expect(gpuDevice.pipelines.size).toBe(1)
    expect(gpuDevice.pipelines.createdCount).toBe(1)

    // 不同描述 → 不同对象
    const other = gpuDevice.pipelines.getRenderPipeline({
      ...descriptor,
      primitive: { topology: "triangle-strip" },
    })
    expect(other).not.toBe(pipeline)
    expect(gpuDevice.pipelines.size).toBe(2)
  })

  it("destroy 后再配置 canvas 抛错", () => {
    const device = gpuDevice
    device.destroy()
    expect(device.isDestroyed).toBe(true)
    expect(() => device.configureCanvas(document.createElement("canvas"))).toThrowError(/destroyed/)
  })
})
