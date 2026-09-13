/**
 * @license
 * Portions of this file are derived from CesiumJS / Tween.js / Robert Penner
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：不依赖 @tweenjs/tween.js，手写常用缓动（相机 flyTo 最小集）。
 */

/** 缓动：t ∈ [0, 1] → [0, 1] */
export type EasingFunctionCallback = (time: number) => number

function linear(time: number): number {
  return time
}

function quadraticIn(time: number): number {
  return time * time
}

function quadraticOut(time: number): number {
  return time * (2.0 - time)
}

function quadraticInOut(time: number): number {
  const t = time * 2.0
  if (t < 1.0) {
    return 0.5 * t * t
  }
  const u = t - 1.0
  return -0.5 * (u * (u - 2.0) - 1.0)
}

function cubicIn(time: number): number {
  return time * time * time
}

function cubicOut(time: number): number {
  const t = time - 1.0
  return t * t * t + 1.0
}

function cubicInOut(time: number): number {
  const t = time * 2.0
  if (t < 1.0) {
    return 0.5 * t * t * t
  }
  const u = t - 2.0
  return 0.5 * (u * u * u + 2.0)
}

/**
 * 缓动函数表。对标 Cesium `Core/EasingFunction.js`（Tween.js / Penner）。
 */
export const EasingFunction = Object.freeze({
  LINEAR_NONE: linear,
  QUADRATIC_IN: quadraticIn,
  QUADRATIC_OUT: quadraticOut,
  QUADRATIC_IN_OUT: quadraticInOut,
  CUBIC_IN: cubicIn,
  CUBIC_OUT: cubicOut,
  CUBIC_IN_OUT: cubicInOut,
})

export type EasingFunctionName = keyof typeof EasingFunction
