/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/**
 * core 内的纯 JS 能力探测。
 *
 * M0 决策：WebGPU / 适配器 / feature 在 `GpuDevice.probe()`；
 * 此处不移植 WebGL、`supportsWebGPU`、`supportsWebP`（Image）、`supportsFullscreen`。
 * 对标 Cesium `Core/FeatureDetection.js` 的 typed array / endian / BigInt 子集。
 */

export type TypedArrayCtor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Uint8ClampedArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor
  | BigInt64ArrayConstructor
  | BigUint64ArrayConstructor

const typedArrayTypes: TypedArrayCtor[] = []
if (typeof ArrayBuffer !== "undefined") {
  typedArrayTypes.push(
    Int8Array,
    Uint8Array,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
  )
  if (typeof Uint8ClampedArray !== "undefined") {
    typedArrayTypes.push(Uint8ClampedArray)
  }
  if (typeof BigInt64Array !== "undefined") {
    typedArrayTypes.push(BigInt64Array)
  }
  if (typeof BigUint64Array !== "undefined") {
    typedArrayTypes.push(BigUint64Array)
  }
}

let littleEndianResult: boolean | undefined

/**
 * 当前环境是否小端。用 16-bit 探测，不依赖 DOM。
 */
function isLittleEndian(): boolean {
  if (littleEndianResult === undefined) {
    const buffer = new ArrayBuffer(2)
    new DataView(buffer).setUint16(0, 0x1122, true)
    littleEndianResult = new Uint8Array(buffer)[0] === 0x22
  }
  return littleEndianResult
}

function navigatorLike(): { userAgent?: string; hardwareConcurrency?: number } {
  const g = globalThis as { navigator?: { userAgent?: string; hardwareConcurrency?: number } }
  return g.navigator ?? {}
}

/**
 * 纯 JS / 宿主探测。浏览器 UA 仅在 `navigator` 存在时有效，Node 下为 false。
 */
export const FeatureDetection = {
  typedArrayTypes,
  isLittleEndian,
  hardwareConcurrency: navigatorLike().hardwareConcurrency ?? 3,

  /** 是否存在 ArrayBuffer / TypedArray */
  supportsTypedArrays(): boolean {
    return typeof ArrayBuffer !== "undefined"
  },

  supportsBigInt64Array(): boolean {
    return typeof BigInt64Array !== "undefined"
  },

  supportsBigUint64Array(): boolean {
    return typeof BigUint64Array !== "undefined"
  },

  supportsBigInt(): boolean {
    return typeof BigInt !== "undefined"
  },

  /** Node 无 Worker 时为 false；不引入 DOM 类型 */
  supportsWebWorkers(): boolean {
    return typeof (globalThis as Record<string, unknown>).Worker !== "undefined"
  },

  supportsWebAssembly(): boolean {
    return typeof (globalThis as Record<string, unknown>).WebAssembly !== "undefined"
  },

  /** Firefox < 114 的 ESM Worker 限制；无 UA 时视为支持 */
  supportsEsmWebWorkers(): boolean {
    const ua = navigatorLike().userAgent ?? ""
    const firefox = /Firefox\/([0-9]+)/.exec(ua)
    if (!firefox) {
      return true
    }
    const major = Number(firefox[1])
    return major >= 114
  },
}
