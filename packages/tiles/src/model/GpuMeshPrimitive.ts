/**
 * 把 ModelPrimitive 上传为与 Mesh 相同的 G-buffer 绘制（group 0/1/2/3）。
 */
import { Cartesian3, Matrix3, Matrix4 } from "@webgpu-cesium/core"
import {
  GBUFFER_COLOR_TARGETS,
  MATERIAL_UNIFORM_BYTES,
  MeshBasicMaterial,
  MeshStandardMaterial,
  defaultNormalTexture,
  defaultWhiteTexture,
  writeCenterRte,
  type FrameUniformsBuffer,
  type Material,
  type RenderItem,
} from "@webgpu-cesium/renderer"
import { composeShader, SHADER_MODULES } from "@webgpu-cesium/shaders"
import { makeLabel, type GpuDevice } from "@webgpu-cesium/rhi"
import type { ModelPrimitive } from "../gltf/ModelComponents"

const PACKAGE_LABEL = "tiles"
const OBJECT_UNIFORM_BYTES = 80
const VERTEX_STRIDE = 32

export interface GpuPrimitiveInstance {
  worldMatrix: Matrix4
}

/**
 * 一个图元的 GPU 对象；可被多个实例矩阵复用。
 */
export class GpuMeshPrimitive {
  private vertexBuffer: GPUBuffer | undefined
  private indexBuffer: GPUBuffer | undefined
  private indexCount = 0
  private indexFormat: GPUIndexFormat = "uint16"
  private materialBuffer: GPUBuffer | undefined
  private dummyBuffer: GPUBuffer | undefined
  private bindGroup1: GPUBindGroup | undefined
  private bindGroup2: GPUBindGroup | undefined
  private pipeline: GPURenderPipelineDescriptor | undefined
  private pipelineKey: string | undefined
  private readonly objectBuffers: GPUBuffer[] = []
  private readonly bindGroup3s: GPUBindGroup[] = []
  private objectLayout: GPUBindGroupLayout | undefined

  /**
   * @param primitive 解析结果
   * @param material 实际使用的材质（可覆写）
   */
  constructor(
    readonly primitive: ModelPrimitive,
    readonly material: Material,
  ) {}

  /**
   * 上传几何与材质。
   *
   * @param device 设备
   * @param frameUniforms group 0
   */
  initialize(device: GpuDevice, frameUniforms: FrameUniformsBuffer): void {
    if (this.vertexBuffer) {
      return
    }
    const gpu = device.device
    const interleaved = interleave(this.primitive)
    this.vertexBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", "model-vb", PACKAGE_LABEL),
      size: interleaved.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    gpu.queue.writeBuffer(this.vertexBuffer, 0, interleaved)
    const indices = this.primitive.indices
    this.indexFormat = indices instanceof Uint32Array ? "uint32" : "uint16"
    const indexBytes = indices.byteLength
    const indexSize = Math.max(4, indexBytes + (indexBytes % 4 === 0 ? 0 : 4 - (indexBytes % 4)))
    this.indexBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", "model-ib", PACKAGE_LABEL),
      size: indexSize,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    })
    gpu.queue.writeBuffer(this.indexBuffer, 0, indices)
    this.indexCount = indices.length

    this.materialBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", "model-material", PACKAGE_LABEL),
      size: MATERIAL_UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    this.dummyBuffer = gpu.createBuffer({
      label: makeLabel("Buffer", "model-g1", PACKAGE_LABEL),
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
    const mapGpu = (mapped ?? defaultWhiteTexture()).acquireGpu(device)
    const normalGpu = (mappedNormal ?? defaultNormalTexture()).acquireGpu(device)
    const sampler = device.samplers.get((mapped ?? defaultWhiteTexture()).samplerDescriptor())

    const dummyLayout = device.bindGroupLayouts.get({
      label: makeLabel("BindGroupLayout", "model-g1", PACKAGE_LABEL),
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    })
    const materialLayout = device.bindGroupLayouts.get({
      label: makeLabel("BindGroupLayout", "model-material", PACKAGE_LABEL),
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
    this.objectLayout = device.bindGroupLayouts.get({
      label: makeLabel("BindGroupLayout", "model-object", PACKAGE_LABEL),
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    })
    this.bindGroup1 = gpu.createBindGroup({
      label: makeLabel("BindGroup", "model-g1", PACKAGE_LABEL),
      layout: dummyLayout,
      entries: [{ binding: 0, resource: { buffer: this.dummyBuffer } }],
    })
    this.bindGroup2 = gpu.createBindGroup({
      label: makeLabel("BindGroup", "model-material", PACKAGE_LABEL),
      layout: materialLayout,
      entries: [
        { binding: 0, resource: { buffer: this.materialBuffer } },
        { binding: 1, resource: mapGpu.createView() },
        { binding: 2, resource: normalGpu.createView() },
        { binding: 3, resource: sampler },
      ],
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
      makeLabel("ShaderModule", "model-mesh", PACKAGE_LABEL),
    )
    const layout = device.bindGroupLayouts.getPipelineLayout(
      [frameUniforms.bindGroupLayout, dummyLayout, materialLayout, this.objectLayout],
      makeLabel("PipelineLayout", "model-mesh", PACKAGE_LABEL),
    )
    this.pipeline = {
      layout,
      vertex: {
        module,
        entryPoint: "vsMesh",
        buffers: [
          {
            arrayStride: VERTEX_STRIDE,
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
        topology: topologyOf(this.primitive.mode),
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
    this.writeMaterial(device)
  }

  /**
   * 写材质数值。
   *
   * @param device 设备
   */
  writeMaterial(device: GpuDevice): void {
    if (!this.materialBuffer) {
      return
    }
    const bytes = new ArrayBuffer(MATERIAL_UNIFORM_BYTES)
    this.material.packUniforms(bytes)
    device.device.queue.writeBuffer(this.materialBuffer, 0, bytes)
  }

  /**
   * 为每个实例写 object uniform 并产出 RenderItem。
   *
   * @param device 设备
   * @param frameUniforms group 0
   * @param instances 世界矩阵
   * @param sortKey 排序
   */
  createRenderItems(
    device: GpuDevice,
    frameUniforms: FrameUniformsBuffer,
    instances: readonly GpuPrimitiveInstance[],
    sortKey = 10,
  ): RenderItem[] {
    if (
      !this.pipeline ||
      !this.pipelineKey ||
      !this.vertexBuffer ||
      !this.indexBuffer ||
      !this.bindGroup1 ||
      !this.bindGroup2 ||
      !this.objectLayout ||
      !this.material.visible
    ) {
      return []
    }
    if (this.material.isTransparentPass) {
      return []
    }
    this.ensureInstanceBuffers(device, instances.length)
    const items: RenderItem[] = []
    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i]
      const objectBuffer = this.objectBuffers[i]
      const bindGroup3 = this.bindGroup3s[i]
      if (!instance || !objectBuffer || !bindGroup3) {
        continue
      }
      writeObjectUniform(device, objectBuffer, instance.worldMatrix)
      items.push({
        pass: "gbuffer",
        sortKey,
        pipelineKey: this.pipelineKey,
        pipeline: this.pipeline,
        bindGroups: [frameUniforms.bindGroup, this.bindGroup1, this.bindGroup2, bindGroup3],
        vertexBuffers: [{ buffer: this.vertexBuffer }],
        indexBuffer: { buffer: this.indexBuffer, format: this.indexFormat },
        draw: { indexCount: this.indexCount, instanceCount: 1 },
        label: `model-prim-${String(i)}`,
      })
    }
    return items
  }

  destroy(): void {
    this.vertexBuffer?.destroy()
    this.indexBuffer?.destroy()
    this.materialBuffer?.destroy()
    this.dummyBuffer?.destroy()
    for (const buffer of this.objectBuffers) {
      buffer.destroy()
    }
    this.vertexBuffer = undefined
    this.objectBuffers.length = 0
    this.bindGroup3s.length = 0
  }

  private ensureInstanceBuffers(device: GpuDevice, count: number): void {
    const gpu = device.device
    const layout = this.objectLayout
    if (!layout) {
      return
    }
    while (this.objectBuffers.length < count) {
      const buffer = gpu.createBuffer({
        label: makeLabel("Buffer", "model-object", PACKAGE_LABEL),
        size: OBJECT_UNIFORM_BYTES,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })
      this.objectBuffers.push(buffer)
      this.bindGroup3s.push(
        gpu.createBindGroup({
          label: makeLabel("BindGroup", "model-object", PACKAGE_LABEL),
          layout,
          entries: [{ binding: 0, resource: { buffer } }],
        }),
      )
    }
  }
}

function interleave(primitive: ModelPrimitive): Float32Array {
  const vertexCount = primitive.positions.length / 3
  const dest = new Float32Array(vertexCount * 8)
  for (let i = 0; i < vertexCount; i++) {
    const o = i * 8
    dest[o] = primitive.positions[i * 3] ?? 0
    dest[o + 1] = primitive.positions[i * 3 + 1] ?? 0
    dest[o + 2] = primitive.positions[i * 3 + 2] ?? 0
    dest[o + 3] = primitive.normals[i * 3] ?? 0
    dest[o + 4] = primitive.normals[i * 3 + 1] ?? 0
    dest[o + 5] = primitive.normals[i * 3 + 2] ?? 1
    dest[o + 6] = primitive.texcoords[i * 2] ?? 0
    dest[o + 7] = primitive.texcoords[i * 2 + 1] ?? 0
  }
  return dest
}

const scratchTranslation = new Cartesian3()
const scratchMatrix3 = new Matrix3()
const scratchCol0 = new Cartesian3()
const scratchCol1 = new Cartesian3()
const scratchCol2 = new Cartesian3()

/**
 * object uniform：RTE 平移 + 3×3（east=col0, up=col1, north=col2，对齐 mesh.wgsl）。
 *
 * @param device 设备
 * @param buffer object UB
 * @param world 世界矩阵
 */
export function writeObjectUniform(device: GpuDevice, buffer: GPUBuffer, world: Matrix4): void {
  Matrix4.getTranslation(world, scratchTranslation)
  Matrix4.getMatrix3(world, scratchMatrix3)
  Matrix3.getColumn(scratchMatrix3, 0, scratchCol0)
  Matrix3.getColumn(scratchMatrix3, 1, scratchCol1)
  Matrix3.getColumn(scratchMatrix3, 2, scratchCol2)
  const object = new Float32Array(OBJECT_UNIFORM_BYTES / 4)
  writeCenterRte(scratchTranslation, object)
  object[8] = scratchCol0.x
  object[9] = scratchCol0.y
  object[10] = scratchCol0.z
  object[12] = scratchCol1.x
  object[13] = scratchCol1.y
  object[14] = scratchCol1.z
  object[16] = scratchCol2.x
  object[17] = scratchCol2.y
  object[18] = scratchCol2.z
  device.device.queue.writeBuffer(buffer, 0, object)
}

function topologyOf(mode: number): GPUPrimitiveTopology {
  if (mode === 0) {
    return "point-list"
  }
  if (mode === 1) {
    return "line-list"
  }
  if (mode === 3) {
    return "line-strip"
  }
  if (mode === 5) {
    return "triangle-strip"
  }
  return "triangle-list"
}
