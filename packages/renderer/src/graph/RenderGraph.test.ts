/**
 * RenderGraph 编译阶段测试（不需要 GPU）与一次完整执行（需要 WebGPU，否则 skip）。
 */
import { GpuDevice } from "@webgpu-cesium/rhi"
import { describe, expect, it } from "vitest"
import { RenderGraph } from "./RenderGraph"

/** 伪造导入纹理：编译阶段只用到句柄，不触碰对象 */
function fakeTexture(): GPUTexture {
  return { format: "bgra8unorm" } as unknown as GPUTexture
}

const noop = (): void => undefined

describe("RenderGraph.compile", () => {
  it("保留写外部资源的 pass，裁剪无人读取的 pass", () => {
    const graph = new RenderGraph()
    const canvas = graph.importTexture("canvas", fakeTexture())
    const unused = graph.createTexture("unused", { width: 4, height: 4, format: "rgba8unorm" })

    graph.addPass("main", (b) => b.writeColor(canvas), noop)
    graph.addPass("orphan", (b) => b.writeColor(unused), noop)

    const compiled = graph.compile()
    expect(compiled.passes).toEqual(["main"])
    expect(compiled.culled).toEqual(["orphan"])
  })

  it("sideEffect 的 pass 不被裁剪", () => {
    const graph = new RenderGraph()
    const tex = graph.createTexture("tex", { width: 4, height: 4, format: "rgba8unorm" })
    graph.addPass(
      "readback",
      (b) => {
        b.writeColor(tex)
        b.sideEffect()
      },
      noop,
    )
    expect(graph.compile().passes).toEqual(["readback"])
  })

  it("依赖链传播：被存活 pass 读取的写者也存活", () => {
    const graph = new RenderGraph()
    const canvas = graph.importTexture("canvas", fakeTexture())
    const gbuffer = graph.createTexture("gbuffer", { width: 4, height: 4, format: "rgba8unorm" })
    const ao = graph.createTexture("ao", { width: 4, height: 4, format: "r8unorm" })
    const debug = graph.createTexture("debug", { width: 4, height: 4, format: "r8unorm" })

    graph.addPass("gbuffer", (b) => b.writeColor(gbuffer), noop)
    graph.addPass(
      "ao",
      (b) => {
        b.read(gbuffer)
        b.writeColor(ao)
      },
      noop,
    )
    graph.addPass(
      "debug",
      (b) => {
        b.read(gbuffer)
        b.writeColor(debug)
      },
      noop,
    )
    graph.addPass(
      "lighting",
      (b) => {
        b.read(gbuffer)
        b.read(ao)
        b.writeColor(canvas)
      },
      noop,
    )

    const compiled = graph.compile()
    expect(compiled.passes).toEqual(["gbuffer", "ao", "lighting"])
    expect(compiled.culled).toEqual(["debug"])
  })

  it("按依赖排序：写者声明在读者之后也会排到前面", () => {
    const graph = new RenderGraph()
    const canvas = graph.importTexture("canvas", fakeTexture())
    const shadow = graph.createTexture("shadow", { width: 4, height: 4, format: "depth32float" })

    graph.addPass(
      "scene",
      (b) => {
        b.read(shadow)
        b.writeColor(canvas)
      },
      noop,
    )
    graph.addPass("shadow", (b) => b.writeDepth(shadow), noop)

    expect(graph.compile().passes).toEqual(["shadow", "scene"])
  })

  it("同一资源多个写者按声明顺序串联（清屏 → 叠加）", () => {
    const graph = new RenderGraph()
    const canvas = graph.importTexture("canvas", fakeTexture())
    graph.addPass("clear", (b) => b.writeColor(canvas), noop)
    graph.addPass("overlay", (b) => b.writeColor(canvas, { loadOp: "load" }), noop)
    graph.addPass("ui", (b) => b.writeColor(canvas, { loadOp: "load" }), noop)
    expect(graph.compile().passes).toEqual(["clear", "overlay", "ui"])
  })

  it("重复的 pass 名与无效句柄报错", () => {
    const graph = new RenderGraph()
    const canvas = graph.importTexture("canvas", fakeTexture())
    graph.addPass("a", (b) => b.writeColor(canvas), noop)
    expect(() => graph.addPass("a", (b) => b.writeColor(canvas), noop)).toThrowError(/重复声明/)

    const other = new RenderGraph()
    expect(() => other.addPass("b", (b) => b.writeColor(canvas), noop)).toThrowError(
      /无效的资源句柄/,
    )
  })

  it("reset 后声明清空", () => {
    const graph = new RenderGraph()
    const canvas = graph.importTexture("canvas", fakeTexture())
    graph.addPass("a", (b) => b.writeColor(canvas), noop)
    graph.reset()
    expect(graph.compile().passes).toEqual([])
  })

  it("toMermaid 输出包含 pass 与资源", () => {
    const graph = new RenderGraph()
    const canvas = graph.importTexture("canvas", fakeTexture())
    graph.addPass("main", (b) => b.writeColor(canvas), noop)
    const text = graph.toMermaid()
    expect(text).toContain("flowchart LR")
    expect(text).toContain("main --> canvas")
  })

  it("toJson 含别名与 mermaid", () => {
    const graph = new RenderGraph()
    const canvas = graph.importTexture("canvas", fakeTexture())
    const a = graph.createTexture("a", { width: 4, height: 4, format: "rgba8unorm" })
    const b = graph.createTexture("b", { width: 4, height: 4, format: "rgba8unorm" })
    graph.addPass("first", (builder) => builder.writeColor(a), noop)
    graph.addPass(
      "second",
      (builder) => {
        builder.read(a)
        builder.writeColor(b)
      },
      noop,
    )
    graph.addPass(
      "out",
      (builder) => {
        builder.read(b)
        builder.writeColor(canvas)
      },
      noop,
    )
    const json = graph.toJson()
    expect(json.passes).toEqual(["first", "second", "out"])
    expect(json.mermaid).toContain("first --> a")
    expect(json.aliases.length).toBeGreaterThan(0)
  })

  it("compute pass 写入被读取时存活", () => {
    const graph = new RenderGraph()
    const canvas = graph.importTexture("canvas", fakeTexture())
    const lut = graph.createTexture("lut", { width: 8, height: 8, format: "rgba16float" })
    graph.addComputePass(
      "lut",
      (builder) => {
        builder.writeStorage(lut)
      },
      noop,
    )
    graph.addPass(
      "use",
      (builder) => {
        builder.read(lut)
        builder.writeColor(canvas)
      },
      noop,
    )
    expect(graph.compile().passes).toEqual(["lut", "use"])
    expect(graph.toMermaid()).toContain("lut / compute")
  })
})

const probe = await GpuDevice.probe()

describe.skipIf(!probe.supported)("RenderGraph.execute (需要 WebGPU)", () => {
  it("清屏 pass 执行并按顺序调用 execute", async () => {
    const device = await GpuDevice.create({ label: "render-graph-test" })
    try {
      const target = device.device.createTexture({
        label: "test/target",
        size: { width: 8, height: 8 },
        format: "rgba8unorm",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      })
      const graph = new RenderGraph()
      const handle = graph.importTexture("target", target)
      const scratch = graph.createTexture("scratch", { width: 8, height: 8, format: "rgba8unorm" })
      const order: string[] = []

      graph.addPass(
        "scratch",
        (b) => b.writeColor(scratch),
        (ctx) => {
          order.push(ctx.passName)
          expect(ctx.colorFormats).toEqual(["rgba8unorm"])
        },
      )
      graph.addPass(
        "clear",
        (b) => {
          b.read(scratch)
          b.writeColor(handle, { clearValue: { r: 1, g: 0, b: 0, a: 1 } })
        },
        (ctx) => {
          order.push(ctx.passName)
          expect(ctx.getTextureView(scratch)).toBeDefined()
        },
      )
      graph.execute(device)
      expect(order).toEqual(["scratch", "clear"])

      // 读回验证清屏颜色（bytesPerRow 需 256 对齐）
      const readback = device.device.createBuffer({
        size: 256 * 8,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      })
      const encoder = device.device.createCommandEncoder()
      encoder.copyTextureToBuffer(
        { texture: target },
        { buffer: readback, bytesPerRow: 256 },
        { width: 8, height: 8 },
      )
      device.device.queue.submit([encoder.finish()])
      await readback.mapAsync(GPUMapMode.READ)
      const pixels = new Uint8Array(readback.getMappedRange())
      expect([pixels[0], pixels[1], pixels[2], pixels[3]]).toEqual([255, 0, 0, 255])
      readback.unmap()

      graph.destroy()
    } finally {
      device.destroy()
    }
  })
})
