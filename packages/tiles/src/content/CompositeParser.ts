/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/tiles
 */
import { RuntimeError } from "@webgpu-cesium/core"

const MAGIC = 0x74706d63

/**
 * 拆 cmpt 为内部瓦片字节。
 *
 * @param bytes 整文件
 */
export function parseComposite(bytes: Uint8Array): Uint8Array[] {
  if (bytes.byteLength < 16) {
    throw new RuntimeError("cmpt is too short.")
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) !== MAGIC) {
    throw new RuntimeError("Not a cmpt tile.")
  }
  const tilesLength = view.getUint32(12, true)
  const inner: Uint8Array[] = []
  let offset = 16
  for (let i = 0; i < tilesLength; i++) {
    if (offset + 8 > bytes.byteLength) {
      break
    }
    const byteLength = view.getUint32(offset + 8, true)
    if (byteLength < 16 || offset + byteLength > bytes.byteLength) {
      throw new RuntimeError("cmpt inner tile is truncated.")
    }
    inner.push(bytes.subarray(offset, offset + byteLength))
    offset += byteLength
  }
  return inner
}
