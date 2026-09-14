/**
 * Hillaire 2020 四张 LUT + IBL 辐照度立方图。
 */
import { composeShader, SHADER_MODULES } from "@webgpu-cesium/shaders"
import { type FrameUniformsBuffer, type RenderGraph } from "@webgpu-cesium/renderer"
import { makeLabel, type GpuDevice } from "@webgpu-cesium/rhi"
import { Atmosphere } from "./Atmosphere"
import { STAR_CATALOG_COUNT, buildStarCatalog } from "./StarField"
import type { JulianDate } from "@webgpu-cesium/core"

const PACKAGE_LABEL = "environment"
const TRANSMITTANCE = { w: 256, h: 64 }
const MULTI = { w: 32, h: 32 }
const SKY = { w: 192, h: 108 }
const AERIAL = 32
const IBL = 32
/** STORAGE_BINDING | TEXTURE_BINDING | COPY_DST（避免 Node 加载时读 GPUTextureUsage） */
const LUT_USAGE = 0x08 | 0x04 | 0x02

export class HillaireAtmosphere {
  readonly atmosphere = new Atmosphere()
  private device: GpuDevice | undefined
  private transmittance: GPUTexture | undefined
  private multiScatter: GPUTexture | undefined
  private skyView: GPUTexture | undefined
  private aerial: GPUTexture | undefined
  private irradiance: GPUTexture | undefined
  private lutSampler: GPUSampler | undefined
  private starBuffer: GPUBuffer | undefined
  private pipelines = new Map<string, GPUComputePipeline>()
  private staticDirty = true
  private lastSunDir = { x: 0, y: 0, z: 0 }

  /**
   * 创建 LUT 与 compute pipeline（显式 layout，复用 FrameUniforms bind group）。
   *
   * @param device 设备
   * @param frameUniforms group 0
   */
  initialize(device: GpuDevice, frameUniforms: FrameUniformsBuffer): void {
    if (this.device === device && this.transmittance) {
      return
    }
    this.device = device
    const gpu = device.device
    this.transmittance = createLut2d(gpu, "transmittance", TRANSMITTANCE.w, TRANSMITTANCE.h)
    this.multiScatter = createLut2d(gpu, "multiScatter", MULTI.w, MULTI.h)
    this.skyView = createLut2d(gpu, "skyView", SKY.w, SKY.h)
    this.aerial = gpu.createTexture({
      label: makeLabel("Texture", "aerial", PACKAGE_LABEL),
      size: { width: AERIAL, height: AERIAL, depthOrArrayLayers: AERIAL },
      format: "rgba16float",
      dimension: "3d",
      usage: LUT_USAGE,
    })
    this.irradiance = gpu.createTexture({
      label: makeLabel("Texture", "irradiance", PACKAGE_LABEL),
      size: { width: IBL, height: IBL, depthOrArrayLayers: 6 },
      format: "rgba16float",
      usage: LUT_USAGE,
    })
    this.lutSampler = device.samplers.get({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
    })
    this.starBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", "stars", PACKAGE_LABEL),
      size: STAR_CATALOG_COUNT * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
    this.pipelines.set(
      "transmittance",
      this.makeCompute(device, frameUniforms, "atmosphere/transmittance.wgsl", "csTransmittance", [
        storageEntry(0, "2d"),
      ]),
    )
    this.pipelines.set(
      "multi",
      this.makeCompute(device, frameUniforms, "atmosphere/multiscatter.wgsl", "csMultiScatter", [
        sampledEntry(0),
        samplerEntry(1),
        storageEntry(2, "2d"),
      ]),
    )
    this.pipelines.set(
      "skyview",
      this.makeCompute(device, frameUniforms, "atmosphere/skyview.wgsl", "csSkyView", [
        sampledEntry(0),
        sampledEntry(1),
        samplerEntry(2),
        storageEntry(3, "2d"),
      ]),
    )
    this.pipelines.set(
      "aerial",
      this.makeCompute(device, frameUniforms, "atmosphere/aerial.wgsl", "csAerial", [
        sampledEntry(0),
        sampledEntry(1),
        samplerEntry(2),
        storageEntry(3, "3d"),
      ]),
    )
    this.pipelines.set(
      "ibl",
      this.makeCompute(device, frameUniforms, "atmosphere/ibl.wgsl", "csIrradiance", [
        sampledEntry(0),
        samplerEntry(1),
        storageEntry(2, "2d-array"),
      ]),
    )
    this.staticDirty = true
  }

  /**
   * 上传星表（TEME 随时间变）。
   *
   * @param time 儒略日
   */
  updateStars(time: JulianDate): void {
    if (!this.device || !this.starBuffer) {
      return
    }
    this.device.device.queue.writeBuffer(this.starBuffer, 0, buildStarCatalog(time))
  }

  /**
   * 向帧图声明 compute pass。
   *
   * @param graph 帧图
   * @param frameUniforms group 0
   * @param sunDir 用于判断 Sky-View 是否需要更新
   */
  declareCompute(
    graph: RenderGraph,
    frameUniforms: FrameUniformsBuffer,
    sunDir: { x: number; y: number; z: number },
  ): void {
    if (
      !this.transmittance ||
      !this.multiScatter ||
      !this.skyView ||
      !this.aerial ||
      !this.irradiance
    ) {
      return
    }
    const t = graph.importTexture("transmittance", this.transmittance)
    const m = graph.importTexture("multiScatter", this.multiScatter)
    const s = graph.importTexture("skyView", this.skyView)
    const a = graph.importTexture("aerial", this.aerial)
    const ibl = graph.importTexture("irradiance", this.irradiance)
    const staticDirty = this.staticDirty
    const sunMoved = angleMoved(this.lastSunDir, sunDir) > 1 * (Math.PI / 180)
    this.lastSunDir = { ...sunDir }

    if (staticDirty) {
      graph.addComputePass(
        "atmosphere-transmittance",
        (builder) => {
          builder.writeStorage(t)
          builder.sideEffect()
        },
        (ctx) => {
          this.dispatch(
            ctx.passEncoder,
            frameUniforms,
            "transmittance",
            [this.transmittance!],
            8,
            TRANSMITTANCE.w,
            TRANSMITTANCE.h,
          )
        },
      )
      graph.addComputePass(
        "atmosphere-multi",
        (builder) => {
          builder.read(t)
          builder.writeStorage(m)
          builder.sideEffect()
        },
        (ctx) => {
          this.dispatch(
            ctx.passEncoder,
            frameUniforms,
            "multi",
            [this.transmittance!, this.lutSampler!, this.multiScatter!],
            8,
            MULTI.w,
            MULTI.h,
          )
        },
      )
      this.staticDirty = false
    }

    if (staticDirty || sunMoved) {
      graph.addComputePass(
        "atmosphere-skyview",
        (builder) => {
          builder.read(t)
          builder.read(m)
          builder.writeStorage(s)
          builder.sideEffect()
        },
        (ctx) => {
          this.dispatch(
            ctx.passEncoder,
            frameUniforms,
            "skyview",
            [this.transmittance!, this.multiScatter!, this.lutSampler!, this.skyView!],
            8,
            SKY.w,
            SKY.h,
          )
        },
      )
      graph.addComputePass(
        "atmosphere-ibl",
        (builder) => {
          builder.read(s)
          builder.writeStorage(ibl)
          builder.sideEffect()
        },
        (ctx) => {
          this.dispatch(
            ctx.passEncoder,
            frameUniforms,
            "ibl",
            [this.skyView!, this.lutSampler!, this.irradiance!],
            8,
            IBL,
            IBL,
            6,
          )
        },
      )
    }

    graph.addComputePass(
      "atmosphere-aerial",
      (builder) => {
        builder.read(t)
        builder.read(m)
        builder.writeStorage(a)
        builder.sideEffect()
      },
      (ctx) => {
        this.dispatch(
          ctx.passEncoder,
          frameUniforms,
          "aerial",
          [this.transmittance!, this.multiScatter!, this.lutSampler!, this.aerial!],
          4,
          AERIAL,
          AERIAL,
          AERIAL,
        )
      },
    )
  }

  /**
   * 延迟光照 group 1。
   *
   * @param device 设备
   * @param layout 布局
   * @param gbuffer 四张 + 深度
   */
  createLightingBindGroup(
    device: GpuDevice,
    layout: GPUBindGroupLayout,
    gbuffer: {
      gb0: GPUTextureView
      gb1: GPUTextureView
      gb2: GPUTextureView
      gb3: GPUTextureView
      depth: GPUTextureView
    },
  ): GPUBindGroup {
    return device.device.createBindGroup({
      label: makeLabel("BindGroup", "deferred-lighting", PACKAGE_LABEL),
      layout,
      entries: [
        { binding: 0, resource: gbuffer.gb0 },
        { binding: 1, resource: gbuffer.gb1 },
        { binding: 2, resource: gbuffer.gb2 },
        { binding: 3, resource: gbuffer.gb3 },
        { binding: 4, resource: gbuffer.depth },
        { binding: 5, resource: this.transmittance!.createView() },
        { binding: 6, resource: this.aerial!.createView({ dimension: "3d" }) },
        { binding: 7, resource: this.irradiance!.createView({ dimension: "2d-array" }) },
        { binding: 8, resource: this.lutSampler! },
      ],
    })
  }

  /**
   * 天空 pass group 1。
   *
   * @param device 设备
   * @param layout 布局
   * @param depth 深度视图
   */
  createSkyBindGroup(
    device: GpuDevice,
    layout: GPUBindGroupLayout,
    depth: GPUTextureView,
  ): GPUBindGroup {
    return device.device.createBindGroup({
      label: makeLabel("BindGroup", "sky", PACKAGE_LABEL),
      layout,
      entries: [
        { binding: 0, resource: this.skyView!.createView() },
        { binding: 1, resource: this.transmittance!.createView() },
        { binding: 2, resource: this.lutSampler! },
        { binding: 3, resource: depth },
        { binding: 4, resource: { buffer: this.starBuffer! } },
      ],
    })
  }

  destroy(): void {
    this.transmittance?.destroy()
    this.multiScatter?.destroy()
    this.skyView?.destroy()
    this.aerial?.destroy()
    this.irradiance?.destroy()
    this.starBuffer?.destroy()
    this.transmittance = undefined
    this.device = undefined
  }

  private makeCompute(
    device: GpuDevice,
    frameUniforms: FrameUniformsBuffer,
    entry: string,
    entryPoint: string,
    group1: GPUBindGroupLayoutEntry[],
  ): GPUComputePipeline {
    const composed = composeShader({ entry, modules: SHADER_MODULES })
    const module = device.shaderModules.get(
      composed.code,
      composed.hash,
      makeLabel("ShaderModule", entry, PACKAGE_LABEL),
    )
    const group1Layout = device.bindGroupLayouts.get({
      label: makeLabel("BindGroupLayout", entry, PACKAGE_LABEL),
      entries: group1,
    })
    const pipelineLayout = device.bindGroupLayouts.getPipelineLayout(
      [frameUniforms.bindGroupLayout, group1Layout],
      makeLabel("PipelineLayout", entry, PACKAGE_LABEL),
    )
    return device.pipelines.getComputePipeline({
      layout: pipelineLayout,
      compute: { module, entryPoint },
    })
  }

  private dispatch(
    encoder: GPUComputePassEncoder,
    frameUniforms: FrameUniformsBuffer,
    name: string,
    resources: (GPUTexture | GPUSampler)[],
    workgroup: number,
    width: number,
    height: number,
    depth = 1,
  ): void {
    const pipeline = this.pipelines.get(name)
    const device = this.device
    if (!pipeline || !device) {
      return
    }
    const layout = pipeline.getBindGroupLayout(1)
    const entries: GPUBindGroupEntry[] = resources.map((resource, binding) => {
      if (!("createView" in resource)) {
        return { binding, resource }
      }
      const texture = resource
      const dim =
        texture.dimension === "3d" ? "3d" : texture.depthOrArrayLayers > 1 ? "2d-array" : "2d"
      return { binding, resource: texture.createView({ dimension: dim }) }
    })
    const bindGroup = device.device.createBindGroup({
      label: makeLabel("BindGroup", name, PACKAGE_LABEL),
      layout,
      entries,
    })
    encoder.setPipeline(pipeline)
    encoder.setBindGroup(0, frameUniforms.bindGroup)
    encoder.setBindGroup(1, bindGroup)
    encoder.dispatchWorkgroups(
      Math.ceil(width / workgroup),
      Math.ceil(height / workgroup),
      Math.ceil(depth / (name === "aerial" ? 4 : 1)),
    )
  }
}

function sampledEntry(binding: number): GPUBindGroupLayoutEntry {
  return { binding, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "float" } }
}

function samplerEntry(binding: number): GPUBindGroupLayoutEntry {
  return { binding, visibility: GPUShaderStage.COMPUTE, sampler: { type: "filtering" } }
}

function storageEntry(
  binding: number,
  viewDimension: GPUTextureViewDimension,
): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    storageTexture: { access: "write-only", format: "rgba16float", viewDimension },
  }
}

function createLut2d(gpu: GPUDevice, name: string, width: number, height: number): GPUTexture {
  return gpu.createTexture({
    label: makeLabel("Texture", name, PACKAGE_LABEL),
    size: { width, height },
    format: "rgba16float",
    usage: LUT_USAGE,
  })
}

function angleMoved(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z))
  return Math.acos(dot)
}
