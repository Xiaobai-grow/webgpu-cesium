/**
 * 按 URL / 键缓存已解析资源（对齐 Cesium ResourceCache 的最小行为）。
 */

interface CacheEntry {
  value: unknown
  bytes: number
}

/**
 * 进程内资源缓存。
 */
export class ResourceCache {
  private readonly _map = new Map<string, CacheEntry>()
  bytes = 0

  /**
   * 命中则返回已有值。
   *
   * @param key 缓存键
   */
  get<T>(key: string): T | undefined {
    return this._map.get(key)?.value as T | undefined
  }

  /**
   * 写入。
   *
   * @param key 键
   * @param value 值
   * @param bytes 估计字节
   */
  set(key: string, value: unknown, bytes = 0): void {
    const existing = this._map.get(key)
    if (existing) {
      this.bytes -= existing.bytes
    }
    this._map.set(key, { value, bytes })
    this.bytes += bytes
  }

  /**
   * 取或计算。
   *
   * @param key 键
   * @param factory 工厂
   * @param bytes 估计字节
   */
  async getOrCreate<T>(key: string, factory: () => Promise<T>, bytes = 0): Promise<T> {
    const hit = this.get<T>(key)
    if (hit !== undefined) {
      return hit
    }
    const value = await factory()
    this.set(key, value, bytes)
    return value
  }

  clear(): void {
    this._map.clear()
    this.bytes = 0
  }
}

/** 默认共享缓存 */
export const defaultResourceCache = new ResourceCache()
