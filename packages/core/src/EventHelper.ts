/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { type Event, type EventListener, type RemoveCallback } from "./Event"

/**
 * 批量登记 / 一次性移除多个 Event 监听器。
 * 对标 Cesium `Core/EventHelper.js`。
 */
export class EventHelper {
  private readonly removalFunctions: RemoveCallback[] = []

  /**
   * 订阅 event 并记录，便于 `removeAll`。
   *
   * @param event 目标事件
   * @param listener 回调
   * @param scope `this`
   */
  add<Args extends unknown[]>(
    event: Event<Args>,
    listener: EventListener<Args>,
    scope?: unknown,
  ): RemoveCallback {
    if (!defined(event)) {
      throw new DeveloperError("event is required")
    }
    const removalFunction = event.addEventListener(listener, scope)
    this.removalFunctions.push(removalFunction)
    return () => {
      removalFunction()
      const index = this.removalFunctions.indexOf(removalFunction)
      if (index !== -1) {
        this.removalFunctions.splice(index, 1)
      }
    }
  }

  /** 移除本 helper 登记过的全部监听器 */
  removeAll(): void {
    for (const removal of this.removalFunctions) {
      removal()
    }
    this.removalFunctions.length = 0
  }
}
