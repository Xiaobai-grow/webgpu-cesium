/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：不引入 DOMPurify；html 原样保存，展示层（widgets CreditDisplay）负责转义或白名单。
 */

import { Check } from "./Check"
import { defined } from "./defined"

let nextCreditId = 0
const creditToId = new Map<string, number>()

/**
 * 数据源归属信息。对标 Cesium `Core/Credit.js`。
 */
export class Credit {
  private readonly _id: number
  private readonly _html: string
  private _showOnScreen: boolean

  /**
   * @param html 归属 HTML / 纯文本
   * @param showOnScreen 是否常驻屏幕（否则进弹出层）
   */
  constructor(html: string, showOnScreen?: boolean) {
    Check.typeOf.string("html", html)
    const existing = creditToId.get(html)
    let id: number
    if (defined(existing)) {
      id = existing
    } else {
      id = nextCreditId++
      creditToId.set(html, id)
    }
    this._id = id
    this._html = html
    this._showOnScreen = showOnScreen ?? false
  }

  /** 归属内容 */
  get html(): string {
    return this._html
  }

  /** 内部去重 id */
  get id(): number {
    return this._id
  }

  /** 是否常驻屏幕 */
  get showOnScreen(): boolean {
    return this._showOnScreen
  }

  set showOnScreen(value: boolean) {
    this._showOnScreen = value
  }

  /**
   * 去掉标签后的纯文本（CreditDisplay 默认展示用）。
   */
  get text(): string {
    return this._html.replace(/<[^>]+>/g, "").trim()
  }

  /**
   * 相等比较（按 id）。
   *
   * @param other 另一归属
   */
  equals(other?: Credit): boolean {
    return defined(other) && this._id === other._id
  }

  /**
   * 测试用：重置全局 id 表。
   */
  static resetIds(): void {
    nextCreditId = 0
    creditToId.clear()
  }
}
