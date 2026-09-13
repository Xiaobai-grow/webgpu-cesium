/**
 * FrameUniforms：group 0 帧级 uniform 的 CPU 侧数据与 GPU buffer。
 *
 * 布局与 `@webgpu-cesium/shaders` 的 `builtin/frame.wgsl` 手写对齐。
 * M4 仍不引入 `wgsl_reflect`：偏移表手写，由 `FrameUniforms.test.ts` 锁定成员顺序。
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
  toneMappingMode: 308,
  exposure: 312,
  moonPhase: 316,
  sunDirectionECEF: 320,
  cameraHeight: 332,
  sunDirectionView: 336,
  atmosphereRadius: 348,
  sunIrradiance: 352,
  aerialPerspectiveEnabled: 364,
  moonDirectionECEF: 368,
  moonIntensity: 380,
  inverseViewMatrix: 384,
  planetRadius: 448,
})

export interface FrameUniformsValues {
  /** 秒 */
  time: number
  /** 秒 */
  deltaTime: number
  frameNumber: number
  /** 像素：x, y, width, height */
  viewport: readonly [number, number, number, number]
  /** 列主序 16 个 f32；缺省保持上次 / 单位矩阵 */
  viewMatrix?: ArrayLike<number>
  projectionMatrix?: ArrayLike<number>
  viewProjectionMatrix?: ArrayLike<number>
  inverseProjectionMatrix?: ArrayLike<number>
  inverseViewMatrix?: ArrayLike<number>
  /** ECEF 相机位置（f64），写入高低位 */
  cameraPositionHigh?: readonly [number, number, number]
  cameraPositionLow?: readonly [number, number, number]
  toneMappingMode?: number
  exposure?: number
  moonPhase?: number
  sunDirectionECEF?: readonly [number, number, number]
  sunDirectionView?: readonly [number, number, number]
  sunIrradiance?: readonly [number, number, number]
  cameraHeight?: number
  atmosphereRadius?: number
  planetRadius?: number
  aerialPerspectiveEnabled?: number
  moonDirectionECEF?: readonly [number, number, number]
  moonIntensity?: number
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
    this.f32[FRAME_UNIFORMS_LAYOUT.exposure / 4] = 1
    this.f32[FRAME_UNIFORMS_LAYOUT.planetRadius / 4] = 6378137
    this.f32[FRAME_UNIFORMS_LAYOUT.atmosphereRadius / 4] = 6478137
    this.f32[FRAME_UNIFORMS_LAYOUT.aerialPerspectiveEnabled / 4] = 1
    this.f32.set([1, 1, 1], FRAME_UNIFORMS_LAYOUT.sunIrradiance / 4)
    this.f32.set([0, 0, 1], FRAME_UNIFORMS_LAYOUT.sunDirectionECEF / 4)
  }

  /** 四个矩阵置单位矩阵（M2 之前的占位） */
  setIdentityMatrices(): void {
    const layout = FRAME_UNIFORMS_LAYOUT
    for (const offset of [
      layout.viewMatrix,
      layout.projectionMatrix,
      layout.viewProjectionMatrix,
      layout.inverseProjectionMatrix,
      layout.inverseViewMatrix,
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
    if (values.viewMatrix !== undefined) {
      this.setMatrix(layout.viewMatrix, values.viewMatrix)
    }
    if (values.projectionMatrix !== undefined) {
      this.setMatrix(layout.projectionMatrix, values.projectionMatrix)
    }
    if (values.viewProjectionMatrix !== undefined) {
      this.setMatrix(layout.viewProjectionMatrix, values.viewProjectionMatrix)
    }
    if (values.inverseProjectionMatrix !== undefined) {
      this.setMatrix(layout.inverseProjectionMatrix, values.inverseProjectionMatrix)
    }
    if (values.inverseViewMatrix !== undefined) {
      this.setMatrix(layout.inverseViewMatrix, values.inverseViewMatrix)
    }
    if (values.cameraPositionHigh !== undefined) {
      this.f32.set(values.cameraPositionHigh, layout.cameraPositionHigh / 4)
    }
    if (values.cameraPositionLow !== undefined) {
      this.f32.set(values.cameraPositionLow, layout.cameraPositionLow / 4)
    }
    if (values.toneMappingMode !== undefined) {
      this.u32[layout.toneMappingMode / 4] = values.toneMappingMode >>> 0
    }
    if (values.exposure !== undefined) {
      this.f32[layout.exposure / 4] = values.exposure
    }
    if (values.moonPhase !== undefined) {
      this.f32[layout.moonPhase / 4] = values.moonPhase
    }
    if (values.sunDirectionECEF !== undefined) {
      this.f32.set(values.sunDirectionECEF, layout.sunDirectionECEF / 4)
    }
    if (values.sunDirectionView !== undefined) {
      this.f32.set(values.sunDirectionView, layout.sunDirectionView / 4)
    }
    if (values.sunIrradiance !== undefined) {
      this.f32.set(values.sunIrradiance, layout.sunIrradiance / 4)
    }
    if (values.cameraHeight !== undefined) {
      this.f32[layout.cameraHeight / 4] = values.cameraHeight
    }
    if (values.atmosphereRadius !== undefined) {
      this.f32[layout.atmosphereRadius / 4] = values.atmosphereRadius
    }
    if (values.planetRadius !== undefined) {
      this.f32[layout.planetRadius / 4] = values.planetRadius
    }
    if (values.aerialPerspectiveEnabled !== undefined) {
      this.f32[layout.aerialPerspectiveEnabled / 4] = values.aerialPerspectiveEnabled
    }
    if (values.moonDirectionECEF !== undefined) {
      this.f32.set(values.moonDirectionECEF, layout.moonDirectionECEF / 4)
    }
    if (values.moonIntensity !== undefined) {
      this.f32[layout.moonIntensity / 4] = values.moonIntensity
    }
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
