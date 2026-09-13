/**
 * 泛型事件：管理监听器并在 `raiseEvent` 时按注册顺序调用。
 *
 * 对标 Cesium `Core/Event.js`（`addEventListener` / `removeEventListener` / `raiseEvent` /
 * `numberOfListeners`），泛型化为 `Event<Args extends unknown[]>`。
 * TODO(M1): 移植 Cesium 版本（含 raise 过程中移除监听器的延迟处理）并保留本签名。
 */
export type EventListener<Args extends unknown[]> = (...args: Args) => void
export type RemoveCallback = () => void

export class Event<Args extends unknown[] = []> {
  private readonly listeners: { listener: EventListener<Args>; scope: unknown }[] = []
  private readonly toRemove: { listener: EventListener<Args>; scope: unknown }[] = []
  private insideRaiseEvent = false

  /** 当前监听器数量 */
  get numberOfListeners(): number {
    return this.listeners.length - this.toRemove.length
  }

  /** 注册监听器，返回可直接调用的移除函数 */
  addEventListener(listener: EventListener<Args>, scope?: unknown): RemoveCallback {
    this.listeners.push({ listener, scope })
    return () => {
      this.removeEventListener(listener, scope)
    }
  }

  /** 移除监听器；raise 过程中调用会延迟到本轮结束后生效 */
  removeEventListener(listener: EventListener<Args>, scope?: unknown): boolean {
    const index = this.listeners.findIndex(
      (entry) => entry.listener === listener && entry.scope === scope,
    )
    if (index === -1) {
      return false
    }
    const entry = this.listeners[index]
    if (this.insideRaiseEvent && entry) {
      this.toRemove.push(entry)
    } else {
      this.listeners.splice(index, 1)
    }
    return true
  }

  /** 触发事件 */
  raiseEvent(...args: Args): void {
    this.insideRaiseEvent = true
    try {
      // 复制一份，避免回调中新增监听器影响本轮
      for (const entry of this.listeners.slice()) {
        if (this.toRemove.includes(entry)) {
          continue
        }
        entry.listener.apply(entry.scope, args)
      }
    } finally {
      this.insideRaiseEvent = false
      // 处理 raise 期间请求的移除
      if (this.toRemove.length > 0) {
        for (const entry of this.toRemove) {
          const index = this.listeners.indexOf(entry)
          if (index !== -1) {
            this.listeners.splice(index, 1)
          }
        }
        this.toRemove.length = 0
      }
    }
  }
}
