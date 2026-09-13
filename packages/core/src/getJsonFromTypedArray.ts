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
 * 从 typed array 切片解码 UTF-8 JSON。对标 Cesium `Core/getJsonFromTypedArray.js`。
 *
 * @param uint8Array 字节
 * @param byteOffset 起点
 * @param byteLength 长度
 */
export function getJsonFromTypedArray(
  uint8Array: Uint8Array,
  byteOffset?: number,
  byteLength?: number,
): unknown {
  const start = byteOffset ?? 0
  const length = byteLength ?? uint8Array.byteLength - start
  const slice = uint8Array.subarray(start, start + length)
  const Decoder = (
    globalThis as { TextDecoder?: new () => { decode: (input: Uint8Array) => string } }
  ).TextDecoder
  const text = Decoder
    ? new Decoder().decode(slice)
    : Array.from(slice, (byte) => String.fromCharCode(byte)).join("")
  return JSON.parse(text) as unknown
}
