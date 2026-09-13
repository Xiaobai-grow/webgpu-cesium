/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：注入 EventTarget-like，不引入 DOM lib。Node mock 可派发 pointer/mouse 事件做点选。
 */

import { AssociativeArray } from "./AssociativeArray"
import { defined } from "./defined"
import { destroyObject } from "./destroyObject"
import { DeveloperError } from "./DeveloperError"
import { KeyboardEventModifier, type KeyboardEventModifierValue } from "./KeyboardEventModifier"
import { ScreenSpaceEventType, type ScreenSpaceEventTypeValue } from "./ScreenSpaceEventType"

/** 屏幕坐标 */
export interface ScreenSpacePosition {
  x: number
  y: number
}

/** 输入动作回调 */
export type ScreenSpaceEventAction = (event: ScreenSpaceInputEvent) => void

/** 派发给动作的事件 */
export interface ScreenSpaceInputEvent {
  position?: ScreenSpacePosition
  startPosition?: ScreenSpacePosition
  endPosition?: ScreenSpacePosition
  delta?: number
}

/** 最小指针/鼠标事件 */
export interface PointerEventLike {
  type?: string
  clientX?: number
  clientY?: number
  button?: number
  buttons?: number
  deltaY?: number
  shiftKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
}

export interface EventListenerOptionsLike {
  capture?: boolean
  passive?: boolean
}

/** EventTarget-like，可在 Node 用 mock */
export interface EventTargetLike {
  addEventListener: (
    type: string,
    listener: (event: PointerEventLike) => void,
    options?: boolean | EventListenerOptionsLike,
  ) => void
  removeEventListener: (
    type: string,
    listener: (event: PointerEventLike) => void,
    options?: boolean | EventListenerOptionsLike,
  ) => void
  getBoundingClientRect?: () => { left: number; top: number }
}

function getInputEventKey(
  type: ScreenSpaceEventTypeValue,
  modifiers?: KeyboardEventModifierValue | KeyboardEventModifierValue[],
): string {
  if (!defined(modifiers)) {
    return `${type}`
  }
  const modifierList = Array.isArray(modifiers) ? [...modifiers].sort((a, b) => a - b) : [modifiers]
  return `${type}+${modifierList.join("+")}`
}

function getModifiers(event: PointerEventLike): KeyboardEventModifierValue[] | undefined {
  const modifiers: KeyboardEventModifierValue[] = []
  if (event.shiftKey) {
    modifiers.push(KeyboardEventModifier.SHIFT)
  }
  if (event.ctrlKey) {
    modifiers.push(KeyboardEventModifier.CTRL)
  }
  if (event.altKey) {
    modifiers.push(KeyboardEventModifier.ALT)
  }
  return modifiers.length > 0 ? modifiers : undefined
}

function eventTypeFromButton(
  button: number,
  phase: "down" | "up" | "click",
): ScreenSpaceEventTypeValue {
  if (button === 2) {
    if (phase === "down") {
      return ScreenSpaceEventType.RIGHT_DOWN
    }
    if (phase === "up") {
      return ScreenSpaceEventType.RIGHT_UP
    }
    return ScreenSpaceEventType.RIGHT_CLICK
  }
  if (button === 1) {
    if (phase === "down") {
      return ScreenSpaceEventType.MIDDLE_DOWN
    }
    if (phase === "up") {
      return ScreenSpaceEventType.MIDDLE_UP
    }
    return ScreenSpaceEventType.MIDDLE_CLICK
  }
  if (phase === "down") {
    return ScreenSpaceEventType.LEFT_DOWN
  }
  if (phase === "up") {
    return ScreenSpaceEventType.LEFT_UP
  }
  return ScreenSpaceEventType.LEFT_CLICK
}

/**
 * 屏幕空间输入。对标 Cesium `Core/ScreenSpaceEventHandler.js` 的可测最小实现。
 */
export class ScreenSpaceEventHandler {
  private readonly _element: EventTargetLike
  private readonly _actions = new AssociativeArray<ScreenSpaceEventAction>()
  private readonly _removalFunctions: (() => void)[] = []
  private _lastPosition: ScreenSpacePosition = { x: 0, y: 0 }
  private _downPosition: ScreenSpacePosition | undefined
  private _downButton: number | undefined
  private _isDestroyed = false

  /**
   * @param element EventTarget-like（浏览器元素或 Node mock）
   */
  constructor(element: EventTargetLike) {
    if (!defined(element)) {
      throw new DeveloperError("element is required.")
    }
    this._element = element
    this.registerListeners()
  }

  private getPosition(event: PointerEventLike): ScreenSpacePosition {
    const rect = this._element.getBoundingClientRect?.()
    const x = (event.clientX ?? 0) - (rect?.left ?? 0)
    const y = (event.clientY ?? 0) - (rect?.top ?? 0)
    return { x, y }
  }

  private fire(
    type: ScreenSpaceEventTypeValue,
    event: PointerEventLike,
    extra?: ScreenSpaceInputEvent,
  ): void {
    const modifiers = getModifiers(event)
    const action =
      this._actions.get(getInputEventKey(type, modifiers)) ?? this._actions.get(`${type}`)
    if (!defined(action)) {
      return
    }
    const position = this.getPosition(event)
    action({ position, ...extra })
  }

  private registerListeners(): void {
    const element = this._element
    const onDown = (event: PointerEventLike): void => {
      const button = event.button ?? 0
      this._downButton = button
      this._downPosition = this.getPosition(event)
      this.fire(eventTypeFromButton(button, "down"), event)
    }
    const onUp = (event: PointerEventLike): void => {
      const button = event.button ?? this._downButton ?? 0
      this.fire(eventTypeFromButton(button, "up"), event)
      if (defined(this._downPosition) && this._downButton === button) {
        this.fire(eventTypeFromButton(button, "click"), event)
      }
      this._downPosition = undefined
      this._downButton = undefined
    }
    const onMove = (event: PointerEventLike): void => {
      const endPosition = this.getPosition(event)
      this.fire(ScreenSpaceEventType.MOUSE_MOVE, event, {
        startPosition: this._lastPosition,
        endPosition,
      })
      this._lastPosition = endPosition
    }
    const onWheel = (event: PointerEventLike): void => {
      this.fire(ScreenSpaceEventType.WHEEL, event, { delta: event.deltaY ?? 0 })
    }
    element.addEventListener("pointerdown", onDown)
    element.addEventListener("pointerup", onUp)
    element.addEventListener("pointermove", onMove)
    element.addEventListener("mousedown", onDown)
    element.addEventListener("mouseup", onUp)
    element.addEventListener("mousemove", onMove)
    element.addEventListener("wheel", onWheel)
    this._removalFunctions.push(() => {
      element.removeEventListener("pointerdown", onDown)
      element.removeEventListener("pointerup", onUp)
      element.removeEventListener("pointermove", onMove)
      element.removeEventListener("mousedown", onDown)
      element.removeEventListener("mouseup", onUp)
      element.removeEventListener("mousemove", onMove)
      element.removeEventListener("wheel", onWheel)
    })
  }

  setInputAction(
    action: ScreenSpaceEventAction,
    type: ScreenSpaceEventTypeValue,
    modifier?: KeyboardEventModifierValue,
  ): void {
    if (!defined(action)) {
      throw new DeveloperError("action is required.")
    }
    if (!defined(type)) {
      throw new DeveloperError("type is required.")
    }
    this._actions.set(getInputEventKey(type, modifier), action)
  }

  getInputAction(
    type: ScreenSpaceEventTypeValue,
    modifier?: KeyboardEventModifierValue,
  ): ScreenSpaceEventAction | undefined {
    return this._actions.get(getInputEventKey(type, modifier))
  }

  removeInputAction(type: ScreenSpaceEventTypeValue, modifier?: KeyboardEventModifierValue): void {
    this._actions.remove(getInputEventKey(type, modifier))
  }

  isDestroyed(): boolean {
    return this._isDestroyed
  }

  destroy(): undefined {
    for (const remove of this._removalFunctions) {
      remove()
    }
    this._removalFunctions.length = 0
    this._actions.removeAll()
    this._isDestroyed = true
    return destroyObject(this)
  }
}

/** Node 测试用的最小 EventTarget */
export class MockEventTarget implements EventTargetLike {
  private readonly listeners = new Map<string, Set<(event: PointerEventLike) => void>>()

  addEventListener(type: string, listener: (event: PointerEventLike) => void): void {
    let set = this.listeners.get(type)
    if (!set) {
      set = new Set()
      this.listeners.set(type, set)
    }
    set.add(listener)
  }

  removeEventListener(type: string, listener: (event: PointerEventLike) => void): void {
    this.listeners.get(type)?.delete(listener)
  }

  getBoundingClientRect(): { left: number; top: number } {
    return { left: 0, top: 0 }
  }

  dispatchEvent(type: string, event: PointerEventLike): void {
    const set = this.listeners.get(type)
    if (!set) {
      return
    }
    for (const listener of set) {
      listener({ type, ...event })
    }
  }
}
