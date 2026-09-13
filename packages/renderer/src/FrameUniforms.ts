/**
 * FrameUniforms：group 0 帧级 uniform 的 CPU 侧数据与 GPU buffer。
 *
 * 布局与 `@webgpu-cesium/shaders` 的 `builtin/frame.wgsl` 手写对齐（M0），
 * M2 起由反射生成偏移表并用单测校验。M0 只填 `time` / `deltaTime` / `frameNumber` / `viewport`，
 * 矩阵置单位矩阵，相机位置置 0。
 */
import { FRAME_UNIFORMS_BYTE_LENGTH } from "@webgpu-cesium/shaders"
import { type GpuDevice, makeLabel } from "@webgpu-cesium/rhi"

const PACKAGE_LABEL = "renderer"

/** 成员字节偏移（见 frame.wgsl 注释） */
export const FRAME_UNIFORMS_LAYOUT = Object.freeze({
  byteLength: FRAME_UNIFORMS_BYTE_LENGTH,
  viewMatrix: 0,
  projectionMatrix: 64,
  viewProjectionMatrix: 128,
  inverseProjectionMatrix: 192,
  cameraPositionHigh: 256,
  time: 268,
  cameraPositionLow: 272,
  deltaTime: 284,
  viewport: 288,
  frameNumber: 304,
})

export interface FrameUniformsValues {
  /** 秒 */
  time: number
  /** 秒 */
  deltaTime: number
  frameNumber: number
  /** 像素：x, y, width, height */
  viewport: readonly [number, number, number, number]
}

const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])

/**
 * CPU 侧数据块：可在无 GPU 环境构造与测试。
 */
export class FrameUniformsData {
  readonly buffer = new ArrayBuffer(FRAME_UNIFORMS_LAYOUT.byteLength)
  private readonly f32 = new Float32Array(this.buffer)
  private readonly u32 = new Uint32Array(this.buffer)

  constructor() {
    this.setIdentityMatrices()
  }

  /** 四个矩阵置单位矩阵（M2 之前的占位） */
  setIdentityMatrices(): void {
    const layout = FRAME_UNIFORMS_LAYOUT
    for (const offset of [
      layout.viewMatrix,
      layout.projectionMatrix,
      layout.viewProjectionMatrix,
      layout.inverseProjectionMatrix,
    ]) {
      this.f32.set(IDENTITY, offset / 4)
    }
  }

  /** 写入矩阵（列主序 16 个 f32） */
  setMatrix(offset: number, values: ArrayLike<number>): void {
    this.f32.set(values, offset / 4)
  }

  update(values: FrameUniformsValues): void {
    const layout = FRAME_UNIFORMS_LAYOUT
    this.f32[layout.time / 4] = values.time
    this.f32[layout.deltaTime / 4] = values.deltaTime
    this.f32.set(values.viewport, layout.viewport / 4)
    this.u32[layout.frameNumber / 4] = values.frameNumber >>> 0
  }

  /** 读 f32（测试用） */
  readF32(byteOffset: number): number {
    return this.f32[byteOffset / 4]!
  }

  /** 读 u32（测试用） */
  readU32(byteOffset: number): number {
    return this.u32[byteOffset / 4]!
  }
}

/**
 * GPU 侧：一个 UNIFORM | COPY_DST buffer + group 0 布局与 bind group。
 */
export class FrameUniformsBuffer {
  readonly data = new FrameUniformsData()
  readonly buffer: GPUBuffer
  readonly bindGroupLayout: GPUBindGroupLayout
  readonly bindGroup: GPUBindGroup

  constructor(private readonly device: GpuDevice) {
    const gpu = device.device
    this.buffer = gpu.createBuffer({
      label: makeLabel("FrameUniformsBuffer", "buffer", PACKAGE_LABEL),
      size: FRAME_UNIFORMS_LAYOUT.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    this.bindGroupLayout = device.bindGroupLayouts.get({
      label: makeLabel("FrameUniformsBuffer", "layout", PACKAGE_LABEL),
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
      ],
    })
    this.bindGroup = gpu.createBindGroup({
      label: makeLabel("FrameUniformsBuffer", "bindGroup", PACKAGE_LABEL),
      layout: this.bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.buffer } }],
    })
  }

  /** 更新 CPU 数据并上传（每帧一次 writeBuffer） */
  update(values: FrameUniformsValues): void {
    this.data.update(values)
    this.device.device.queue.writeBuffer(this.buffer, 0, this.data.buffer)
  }

  destroy(): void {
    this.buffer.destroy()
  }
}
