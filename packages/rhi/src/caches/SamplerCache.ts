/**
 * SamplerCache：按描述符缓存 GPUSampler。
 */
import { makeLabel } from "../labels"
import { stableKey } from "./stableKey"

export class SamplerCache {
  private readonly samplers = new Map<string, GPUSampler>()

  constructor(private readonly device: GPUDevice) {}

  get size(): number {
    return this.samplers.size
  }

  /** 取得或创建采样器 */
  get(descriptor: GPUSamplerDescriptor = {}): GPUSampler {
    const key = stableKey(descriptor)
    let sampler = this.samplers.get(key)
    if (!sampler) {
      sampler = this.device.createSampler({
        ...descriptor,
        label: descriptor.label ?? makeLabel("Sampler", this.samplers.size),
      })
      this.samplers.set(key, sampler)
    }
    return sampler
  }

  clear(): void {
    this.samplers.clear()
  }
}
