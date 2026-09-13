/**
 * Hello Triangle：GpuDevice + RenderGraph + 组合器，一个 RenderItem、一个 pass，三角形随时间旋转。
 */
import { FrameUniformsBuffer, RenderGraph, type RenderItem } from "@webgpu-cesium/renderer"
import { GpuDevice, makeLabel } from "@webgpu-cesium/rhi"
import { BUILTIN_MODULES, composeShader, formatCompilationMessages } from "@webgpu-cesium/shaders"
import triangleWgsl from "./hello-triangle.wgsl"
import type { ExampleCleanup } from "./index"

const PACKAGE_LABEL = "examples"
const ENTRY = "examples/hello-triangle.wgsl"

/** 顶点：position(x, y) + color(r, g, b)，交错排列 */
// prettier-ignore
const VERTICES = new Float32Array([
   0.0,  0.6,   1.0, 0.3, 0.3,
  -0.6, -0.5,   0.3, 1.0, 0.3,
   0.6, -0.5,   0.3, 0.5, 1.0,
])
const VERTEX_STRIDE = 5 * 4

/** 调整 canvas 像素尺寸以匹配 CSS 尺寸与 devicePixelRatio */
function resizeCanvas(canvas: HTMLCanvasElement, maxDimension: number): boolean {
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(1, Math.min(maxDimension, Math.floor(canvas.clientWidth * ratio)))
  const height = Math.max(1, Math.min(maxDimension, Math.floor(canvas.clientHeight * ratio)))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
    return true
  }
  return false
}

export async function run(canvas: HTMLCanvasElement): Promise<ExampleCleanup> {
  const gpu = await GpuDevice.create({ label: "hello-triangle" })
  const device = gpu.device
  const context = gpu.configureCanvas(canvas)

  // 组合着色器：入口 #import 内置常量与 FrameUniforms
  const composed = composeShader({
    entry: ENTRY,
    modules: { ...BUILTIN_MODULES, [ENTRY]: triangleWgsl },
  })
  const module = gpu.shaderModules.get(
    composed.code,
    composed.hash,
    makeLabel("ShaderModule", ENTRY, PACKAGE_LABEL),
  )
  // 开发期：把编译信息映射回原始文件与行号
  void module.getCompilationInfo().then((info) => {
    if (info.messages.length > 0) {
      console.warn(formatCompilationMessages(info.messages, composed))
    }
  })

  const frameUniforms = new FrameUniformsBuffer(gpu)

  const vertexBuffer = device.createBuffer({
    label: makeLabel("Buffer", "triangle-vertices", PACKAGE_LABEL),
    size: VERTICES.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(vertexBuffer, 0, VERTICES)

  const pipelineLayout = gpu.bindGroupLayouts.getPipelineLayout(
    [frameUniforms.bindGroupLayout],
    makeLabel("PipelineLayout", "hello-triangle", PACKAGE_LABEL),
  )

  const item: RenderItem = {
    pass: "main",
    sortKey: 0,
    label: "triangle",
    pipeline: {
      layout: pipelineLayout,
      vertex: {
        module,
        entryPoint: "vsMain",
        buffers: [
          {
            arrayStride: VERTEX_STRIDE,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" },
              { shaderLocation: 1, offset: 8, format: "float32x3" },
            ],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: "fsMain",
        targets: [{ format: gpu.canvasFormat }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
    },
    bindGroups: [frameUniforms.bindGroup],
    vertexBuffers: [{ buffer: vertexBuffer }],
    draw: { vertexCount: 3 },
  }

  const graph = new RenderGraph()
  const startTime = performance.now()
  let lastTime = startTime
  let frameNumber = 0
  let rafId = 0
  let disposed = false

  const lostHandle = gpu.onLost.addEventListener((info) => {
    console.error(`[hello-triangle] WebGPU device lost: ${info.reason} ${info.message}`)
    disposed = true
  })

  const frame = (now: number): void => {
    if (disposed) {
      return
    }
    resizeCanvas(canvas, gpu.limits.maxTextureDimension2D)

    frameUniforms.update({
      time: (now - startTime) / 1000,
      deltaTime: (now - lastTime) / 1000,
      frameNumber,
      viewport: [0, 0, canvas.width, canvas.height],
    })
    lastTime = now
    frameNumber++

    const target = graph.importTexture("canvas", context.getCurrentTexture())
    graph.addPass(
      "main",
      (builder) => {
        builder.writeColor(target, { clearValue: { r: 0.07, g: 0.08, b: 0.11, a: 1 } })
      },
      (ctx) => {
        ctx.drawItems([item])
      },
    )
    graph.execute(gpu)

    rafId = requestAnimationFrame(frame)
  }
  rafId = requestAnimationFrame(frame)

  return () => {
    disposed = true
    cancelAnimationFrame(rafId)
    lostHandle()
    graph.destroy()
    frameUniforms.destroy()
    vertexBuffer.destroy()
    gpu.destroy()
  }
}
