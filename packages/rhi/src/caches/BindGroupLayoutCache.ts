/**
 * BindGroupLayoutCache：按描述符缓存 GPUBindGroupLayout 与 GPUPipelineLayout。
 * 相同描述返回同一对象，便于 pipeline 缓存键稳定与 bind group 复用。
 */
import { makeLabel } from "../labels"
import { getObjectId, stableKey } from "./stableKey"

export class BindGroupLayoutCache {
  private readonly layouts = new Map<string, GPUBindGroupLayout>()
  private readonly pipelineLayouts = new Map<string, GPUPipelineLayout>()

  constructor(private readonly device: GPUDevice) {}

  /** 缓存的 bind group layout 数量 */
  get size(): number {
    return this.layouts.size
  }

  /** 取得或创建 bind group layout；entries 顺序不影响键 */
  get(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout {
    const entries = [...descriptor.entries].sort((a, b) => a.binding - b.binding)
    const key = stableKey(entries)
    let layout = this.layouts.get(key)
    if (!layout) {
      layout = this.device.createBindGroupLayout({
        label: descriptor.label ?? makeLabel("BindGroupLayout", this.layouts.size),
        entries,
      })
      this.layouts.set(key, layout)
    }
    return layout
  }

  /** 取得或创建 pipeline layout（按 bind group layout 的对象 id 列表缓存） */
  getPipelineLayout(
    bindGroupLayouts: readonly GPUBindGroupLayout[],
    label?: string,
  ): GPUPipelineLayout {
    const key = bindGroupLayouts.map((layout) => String(getObjectId(layout))).join(",")
    let pipelineLayout = this.pipelineLayouts.get(key)
    if (!pipelineLayout) {
      pipelineLayout = this.device.createPipelineLayout({
        label: label ?? makeLabel("PipelineLayout", this.pipelineLayouts.size),
        bindGroupLayouts: [...bindGroupLayouts],
      })
      this.pipelineLayouts.set(key, pipelineLayout)
    }
    return pipelineLayout
  }

  clear(): void {
    this.layouts.clear()
    this.pipelineLayouts.clear()
  }
}
