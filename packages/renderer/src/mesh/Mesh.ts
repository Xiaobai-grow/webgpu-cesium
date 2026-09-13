/**
 * 测试网格：球体 / 立方体 + Material → G-buffer RenderItem。
 */
import { Ellipsoid, Matrix4, Transforms, type Cartesian3 } from "@webgpu-cesium/core"
import { composeShader, SHADER_MODULES } from "@webgpu-cesium/shaders"
import { makeLabel, type GpuDevice } from "@webgpu-cesium/rhi"
import type { FrameUniformsBuffer } from "../FrameUniforms"
import type { RenderItem } from "../RenderItem"
import { GBUFFER_COLOR_TARGETS } from "../lighting/GBuffer"
import { MATERIAL_UNIFORM_BYTES, type Material } from "../materials/Material"
import { MeshBasicMaterial } from "../materials/MeshBasicMaterial"
import { MeshStandardMaterial } from "../materials/MeshStandardMaterial"
import { writeCenterRte } from "../rte"
import { defaultNormalTexture, defaultWhiteTexture } from "../textures/Texture"
import { createBoxGeometry, createSphereGeometry } from "./geometries"

const PACKAGE_LABEL = "renderer"
const OBJECT_UNIFORM_BYTES = 80
const scratchEnu = new Matrix4()

export type MeshGeometryKind = "sphere" | "box"

export interface MeshOptions {
  geometry?: MeshGeometryKind
  material: Material
  center: Cartesian3
  radius?: number
}

/**
 * 一个可绘制网格。Scene 每帧收集 createRenderItem。
 */
export class Mesh {
  material: Material
  center: Cartesian3
  readonly geometryKind: MeshGeometryKind
  readonly radius: number
  private vertexBuffer: GPUBuffer | undefined
  private indexBuffer: GPUBuffer | undefined
  private indexCount = 0
  private materialBuffer: GPUBuffer | undefined
  private objectBuffer: GPUBuffer | undefined
  private dummyBuffer: GPUBuffer | undefined
  private bindGroup1: GPUBindGroup | undefined
  private bindGroup2: GPUBindGroup | undefined
  private bindGroup3: GPUBindGroup | undefined
  private pipeline: GPURenderPipelineDescriptor | undefined
  private pipelineKey: string | undefined
  private indexFormat: GPUIndexFormat = "uint16"

  /**
   * @param options 几何与材质
   */
  constructor(options: MeshOptions) {
    this.material = options.material
    this.center = options.center
    this.geometryKind = options.geometry ?? "sphere"
    this.radius = options.radius ?? 1
  }

  /**
   * 是否已上传 GPU 对象。
   */
  get initialized(): boolean {
    return this.vertexBuffer !== undefined
  }

  /**
   * 上传几何与材质 GPU 对象。
   *
   * @param device 设备
   * @param frameUniforms group 0
   */
  initialize(device: GpuDevice, frameUniforms: FrameUniformsBuffer): void {
    if (this.vertexBuffer) {
      return
    }
    const geo =
      this.geometryKind === "box"
        ? createBoxGeometry(this.radius)
        : createSphereGeometry(this.radius)
    const gpu = device.device
    this.vertexBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", `${this.geometryKind}-vb`, PACKAGE_LABEL),
      size: geo.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    gpu.queue.writeBuffer(this.vertexBuffer, 0, geo.vertices)
    const indexBytes = geo.indices.byteLength
    const indexSize = Math.max(4, indexBytes + (indexBytes % 4 === 0 ? 0 : 4 - (indexBytes % 4)))
    this.indexBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", `${this.geometryKind}-ib`, PACKAGE_LABEL),
      size: indexSize,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    })
    gpu.queue.writeBuffer(this.indexBuffer, 0, geo.indices)
    this.indexCount = geo.indices.length

    this.materialBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", "material-ub", PACKAGE_LABEL),
      size: MATERIAL_UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    this.objectBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", "object-ub", PACKAGE_LABEL),
      size: OBJECT_UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    this.dummyBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", "mesh-g1", PACKAGE_LABEL),
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    gpu.queue.writeBuffer(this.dummyBuffer, 0, new Float32Array(4))

    const mapped =
      this.material instanceof MeshBasicMaterial || this.material instanceof MeshStandardMaterial
        ? this.material.map
        : undefined
    const mappedNormal =
      this.material instanceof MeshStandardMaterial ? this.material.normalMap : undefined
    const map = mapped ?? defaultWhiteTexture()
    const normalMap = mappedNormal ?? defaultNormalTexture()
    const mapGpu = map.acquireGpu(device)
    const normalGpu = normalMap.acquireGpu(device)
    const sampler = device.samplers.get(map.samplerDescriptor())

    const dummyLayout = device.bindGroupLayouts.get({
      label: makeLabel("BindGroupLayout", "mesh-g1", PACKAGE_LABEL),
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    })
    const materialLayout = device.bindGroupLayouts.get({
      label: makeLabel("BindGroupLayout", "material", PACKAGE_LABEL),
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      ],
    })
    const objectLayout = device.bindGroupLayouts.get({
      label: makeLabel("BindGroupLayout", "object", PACKAGE_LABEL),
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    })
    this.bindGroup1 = gpu.createBindGroup({
      label: makeLabel("BindGroup", "mesh-g1", PACKAGE_LABEL),
      layout: dummyLayout,
      entries: [{ binding: 0, resource: { buffer: this.dummyBuffer } }],
    })
    this.bindGroup2 = gpu.createBindGroup({
      label: makeLabel("BindGroup", "material", PACKAGE_LABEL),
      layout: materialLayout,
      entries: [
        { binding: 0, resource: { buffer: this.materialBuffer } },
        { binding: 1, resource: mapGpu.createView() },
        { binding: 2, resource: normalGpu.createView() },
        { binding: 3, resource: sampler },
      ],
    })
    this.bindGroup3 = gpu.createBindGroup({
      label: makeLabel("BindGroup", "object", PACKAGE_LABEL),
      layout: objectLayout,
      entries: [{ binding: 0, resource: { buffer: this.objectBuffer } }],
    })

    const defines: Record<string, boolean | number> = { ...this.material.defines }
    if (this.material instanceof MeshBasicMaterial) {
      defines.MATERIAL_UNLIT = 1
    }
    const composed = composeShader({
      entry: "materials/mesh.wgsl",
      modules: SHADER_MODULES,
      defines,
    })
    const module = device.shaderModules.get(
      composed.code,
      composed.hash,
      makeLabel("ShaderModule", "mesh", PACKAGE_LABEL),
    )
    const layout = device.bindGroupLayouts.getPipelineLayout(
      [frameUniforms.bindGroupLayout, dummyLayout, materialLayout, objectLayout],
      makeLabel("PipelineLayout", "mesh", PACKAGE_LABEL),
    )
    this.pipeline = {
      layout,
      vertex: {
        module,
        entryPoint: "vsMesh",
        buffers: [
          {
            arrayStride: geo.stride,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x3" },
              { shaderLocation: 2, offset: 12, format: "float32x3" },
              { shaderLocation: 4, offset: 24, format: "float32x2" },
            ],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: "fsMesh",
        targets: GBUFFER_COLOR_TARGETS,
      },
      primitive: {
        topology: "triangle-list",
        cullMode: this.material.gpuCullMode(),
        frontFace: "ccw",
      },
      depthStencil: {
        format: "depth32float",
        depthWriteEnabled: this.material.depthWrite,
        depthCompare: this.material.gpuDepthCompare(),
      },
    }
    this.pipelineKey = device.pipelines.keyOf(this.pipeline)
    this.uploadUniforms(device)
  }

  /**
   * 每帧写中心、ENU 与材质数值。
   *
   * @param device 设备
   */
  uploadUniforms(device: GpuDevice): void {
    if (!this.materialBuffer || !this.objectBuffer) {
      return
    }
    const materialBytes = new ArrayBuffer(MATERIAL_UNIFORM_BYTES)
    this.material.packUniforms(materialBytes)
    device.device.queue.writeBuffer(this.materialBuffer, 0, materialBytes)
    const object = new Float32Array(OBJECT_UNIFORM_BYTES / 4)
    writeCenterRte(this.center, object)
    Transforms.eastNorthUpToFixedFrame(this.center, Ellipsoid.default, scratchEnu)
    object[8] = scratchEnu[0] ?? 1
    object[9] = scratchEnu[1] ?? 0
    object[10] = scratchEnu[2] ?? 0
    object[12] = scratchEnu[4] ?? 0
    object[13] = scratchEnu[5] ?? 1
    object[14] = scratchEnu[6] ?? 0
    object[16] = scratchEnu[8] ?? 0
    object[17] = scratchEnu[9] ?? 0
    object[18] = scratchEnu[10] ?? 1
    device.device.queue.writeBuffer(this.objectBuffer, 0, object)
  }

  /**
   * G-buffer RenderItem。
   *
   * @param frameUniforms group 0
   */
  createRenderItem(frameUniforms: FrameUniformsBuffer): RenderItem | undefined {
    if (
      !this.pipeline ||
      !this.pipelineKey ||
      !this.vertexBuffer ||
      !this.indexBuffer ||
      !this.bindGroup1 ||
      !this.bindGroup2 ||
      !this.bindGroup3 ||
      !this.material.visible
    ) {
      return undefined
    }
    return {
      pass: "gbuffer",
      sortKey: 10,
      pipelineKey: this.pipelineKey,
      pipeline: this.pipeline,
      bindGroups: [frameUniforms.bindGroup, this.bindGroup1, this.bindGroup2, this.bindGroup3],
      vertexBuffers: [{ buffer: this.vertexBuffer }],
      indexBuffer: { buffer: this.indexBuffer, format: this.indexFormat },
      draw: { indexCount: this.indexCount, instanceCount: 1 },
      label: `mesh-${this.geometryKind}`,
    }
  }

  destroy(): void {
    this.vertexBuffer?.destroy()
    this.indexBuffer?.destroy()
    this.materialBuffer?.destroy()
    this.objectBuffer?.destroy()
    this.dummyBuffer?.destroy()
    this.vertexBuffer = undefined
  }
}
