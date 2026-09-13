/**
 * ShaderModuleCache：按源码（或调用方给的哈希）缓存 GPUShaderModule。
 * 组合器输出的 `hash` 可直接作为键，避免重复哈希整段源码。
 */
import { makeLabel } from "../labels"

export class ShaderModuleCache {
  private readonly modules = new Map<string, GPUShaderModule>()

  constructor(private readonly device: GPUDevice) {}

  get size(): number {
    return this.modules.size
  }

  /**
   * 取得或创建 shader module。
   * @param code 规范化 WGSL 源码
   * @param key 缓存键，默认用源码本身；传组合器的 `hash` 更省
   * @param label 标签（仅首次创建时使用）
   */
  get(code: string, key: string = code, label?: string): GPUShaderModule {
    let module = this.modules.get(key)
    if (!module) {
      module = this.device.createShaderModule({
        label: label ?? makeLabel("ShaderModule", key.length > 16 ? key.slice(0, 16) : key),
        code,
      })
      this.modules.set(key, module)
    }
    return module
  }

  clear(): void {
    this.modules.clear()
  }
}
