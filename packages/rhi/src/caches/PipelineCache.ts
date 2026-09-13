/**
 * PipelineCache：按规范化描述缓存 render / compute pipeline。
 *
 * 键 = `stableKey(descriptor)`：shader module / layout 用对象 id 代替，`label` 不参与。
 * 组合器保证同一变体源码哈希一致，ShaderModuleCache 保证同源码同 module 对象，
 * 因此相同描述 → 相同键 → 同一 pipeline。
 *
 * `getRenderPipelineAsync` 用于预热：结果 Promise 也缓存，完成后写入同步表。
 */
import { makeLabel } from "../labels"
import { stableKey } from "./stableKey"

export class PipelineCache {
  private readonly renderPipelines = new Map<string, GPURenderPipeline>()
  private readonly pendingRenderPipelines = new Map<string, Promise<GPURenderPipeline>>()
  private readonly computePipelines = new Map<string, GPUComputePipeline>()
  private readonly pendingComputePipelines = new Map<string, Promise<GPUComputePipeline>>()

  /** 累计创建次数（性能面板用） */
  private created = 0

  constructor(private readonly device: GPUDevice) {}

  /** 已缓存的 pipeline 数（render + compute） */
  get size(): number {
    return this.renderPipelines.size + this.computePipelines.size
  }

  /** 累计实际创建次数 */
  get createdCount(): number {
    return this.created
  }

  /** 计算描述符的缓存键（暴露给排序键等用途） */
  keyOf(descriptor: GPURenderPipelineDescriptor | GPUComputePipelineDescriptor): string {
    return stableKey(descriptor)
  }

  /** 同步取得 render pipeline（未命中时创建，可能阻塞） */
  getRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline {
    const key = stableKey(descriptor)
    let pipeline = this.renderPipelines.get(key)
    if (!pipeline) {
      pipeline = this.device.createRenderPipeline(this.withLabel(descriptor, "RenderPipeline"))
      this.renderPipelines.set(key, pipeline)
      this.created++
    }
    return pipeline
  }

  /** 异步取得 render pipeline（预热）；已同步创建过则直接返回 */
  getRenderPipelineAsync(descriptor: GPURenderPipelineDescriptor): Promise<GPURenderPipeline> {
    const key = stableKey(descriptor)
    const existing = this.renderPipelines.get(key)
    if (existing) {
      return Promise.resolve(existing)
    }
    let pending = this.pendingRenderPipelines.get(key)
    if (!pending) {
      pending = this.device
        .createRenderPipelineAsync(this.withLabel(descriptor, "RenderPipeline"))
        .then((pipeline) => {
          // 若期间已被同步创建，以同步结果为准，保持「相同描述同一对象」
          const raced = this.renderPipelines.get(key)
          if (raced) {
            return raced
          }
          this.renderPipelines.set(key, pipeline)
          this.created++
          return pipeline
        })
        .finally(() => {
          this.pendingRenderPipelines.delete(key)
        })
      this.pendingRenderPipelines.set(key, pending)
    }
    return pending
  }

  /** 同步取得 compute pipeline */
  getComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline {
    const key = stableKey(descriptor)
    let pipeline = this.computePipelines.get(key)
    if (!pipeline) {
      pipeline = this.device.createComputePipeline(this.withLabel(descriptor, "ComputePipeline"))
      this.computePipelines.set(key, pipeline)
      this.created++
    }
    return pipeline
  }

  /** 异步取得 compute pipeline */
  getComputePipelineAsync(descriptor: GPUComputePipelineDescriptor): Promise<GPUComputePipeline> {
    const key = stableKey(descriptor)
    const existing = this.computePipelines.get(key)
    if (existing) {
      return Promise.resolve(existing)
    }
    let pending = this.pendingComputePipelines.get(key)
    if (!pending) {
      pending = this.device
        .createComputePipelineAsync(this.withLabel(descriptor, "ComputePipeline"))
        .then((pipeline) => {
          const raced = this.computePipelines.get(key)
          if (raced) {
            return raced
          }
          this.computePipelines.set(key, pipeline)
          this.created++
          return pipeline
        })
        .finally(() => {
          this.pendingComputePipelines.delete(key)
        })
      this.pendingComputePipelines.set(key, pending)
    }
    return pending
  }

  clear(): void {
    this.renderPipelines.clear()
    this.pendingRenderPipelines.clear()
    this.computePipelines.clear()
    this.pendingComputePipelines.clear()
  }

  private withLabel<T extends { label?: string }>(descriptor: T, className: string): T {
    if (descriptor.label !== undefined) {
      return descriptor
    }
    return { ...descriptor, label: makeLabel(className, this.created) }
  }
}
