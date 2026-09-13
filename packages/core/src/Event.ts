/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Check } from "./Check"

/**
 * 事件监听器。泛型参数是参数元组（M0 已采用，比 Cesium 的 Listener 函数类型更利于推断）。
 */
export type EventListener<Args extends unknown[]> = (...args: Args) => void

/** `addEventListener` 返回的移除函数 */
export type RemoveCallback = () => void

type Scope = unknown
type ListenerMap<Args extends unknown[]> = Map<EventListener<Args>, Set<Scope>>

/**
 * 泛型事件：对标 Cesium `Core/Event.js`（含 raise 期间增删的延迟处理）。
 * 公开签名保持 `Event<Args extends unknown[]>`，与 rhi 现有用法兼容。
 */
export class Event<Args extends unknown[] = []> {
  private readonly listeners: ListenerMap<Args> = new Map()
  private readonly toAdd: ListenerMap<Args> = new Map()
  private readonly toRemove: ListenerMap<Args> = new Map()
  private invokingListeners = false
  private listenerCount = 0

  /** 当前 listener+scope 对数 */
  get numberOfListeners(): number {
    return this.listenerCount
  }

  /**
   * 在 map 中登记 listener+scope；已存在则返回 false。
   */
  private addPair(
    listenerMap: ListenerMap<Args>,
    listener: EventListener<Args>,
    scope: Scope,
  ): boolean {
    let scopes = listenerMap.get(listener)
    if (!scopes) {
      scopes = new Set()
      listenerMap.set(listener, scopes)
    }
    if (scopes.has(scope)) {
      return false
    }
    scopes.add(scope)
    return true
  }

  /**
   * 从 map 移除 listener+scope。raise 期间只记入 toRemove。
   */
  private removePair(
    listenerMap: ListenerMap<Args>,
    listener: EventListener<Args>,
    scope: Scope,
  ): boolean {
    const scopes = listenerMap.get(listener)
    if (!scopes?.has(scope)) {
      return false
    }
    if (this.invokingListeners) {
      if (!this.addPair(this.toRemove, listener, scope)) {
        return false
      }
    } else {
      scopes.delete(scope)
      if (scopes.size === 0) {
        listenerMap.delete(listener)
      }
    }
    return true
  }

  /**
   * 注册监听器。同一 listener+scope 不会重复登记。
   *
   * @param listener 回调
   * @param scope 调用时的 `this`
   */
  addEventListener(listener: EventListener<Args>, scope?: Scope): RemoveCallback {
    Check.typeOf.func("listener", listener)
    const listenerMap = this.invokingListeners ? this.toAdd : this.listeners
    if (this.addPair(listenerMap, listener, scope)) {
      this.listenerCount++
    }
    return () => {
      this.removeEventListener(listener, scope)
    }
  }

  /**
   * 移除监听器。raise 期间的移除延迟到本轮结束后生效（本轮仍会调用）。
   */
  removeEventListener(listener: EventListener<Args>, scope?: Scope): boolean {
    Check.typeOf.func("listener", listener)
    const removedFromListeners = this.removePair(this.listeners, listener, scope)
    const removedFromToAdd = this.removePair(this.toAdd, listener, scope)
    const removed = removedFromListeners || removedFromToAdd
    if (removed) {
      this.listenerCount--
    }
    return removed
  }

  /**
   * 按登记顺序触发监听器。raise 期间新增的监听器本轮不调用。
   */
  raiseEvent(...args: Args): void {
    this.invokingListeners = true
    for (const [listener, scopes] of this.listeners.entries()) {
      for (const scope of scopes) {
        listener.apply(scope, args)
      }
    }
    this.invokingListeners = false

    for (const [listener, scopes] of this.toAdd.entries()) {
      for (const scope of scopes) {
        this.addPair(this.listeners, listener, scope)
      }
    }
    this.toAdd.clear()

    for (const [listener, scopes] of this.toRemove.entries()) {
      for (const scope of scopes) {
        this.removePair(this.listeners, listener, scope)
      }
    }
    this.toRemove.clear()
  }
}
