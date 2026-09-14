/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/tiles
 */
import { Cartesian3, RuntimeError } from "@webgpu-cesium/core"
import { parseJsonChunk } from "./tileHeader"

const MAGIC = 0x6d643362

export interface B3dmFeatureTable {
  BATCH_LENGTH?: number
  RTC_CENTER?: number[]
}

export interface ParsedB3dm {
  gltf: Uint8Array
  featureTableJson: B3dmFeatureTable
  featureTableBinary: Uint8Array
  batchTableJson: Record<string, unknown>
  batchTableBinary: Uint8Array
  rtcCenter: Cartesian3 | undefined
}

/**
 * 解析 b3dm。
 *
 * @param bytes 整瓦片
 */
export function parseB3dm(bytes: Uint8Array): ParsedB3dm {
  if (bytes.byteLength < 28) {
    throw new RuntimeError("b3dm is too short.")
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) !== MAGIC) {
    throw new RuntimeError("Not a b3dm tile.")
  }
  const featureTableJsonByteLength = view.getUint32(12, true)
  const featureTableBinaryByteLength = view.getUint32(16, true)
  const batchTableJsonByteLength = view.getUint32(20, true)
  const batchTableBinaryByteLength = view.getUint32(24, true)
  let offset = 28
  const featureTableJson = parseJsonChunk(
    bytes,
    offset,
    featureTableJsonByteLength,
  ) as B3dmFeatureTable
  offset += featureTableJsonByteLength
  const featureTableBinary = bytes.subarray(offset, offset + featureTableBinaryByteLength)
  offset += featureTableBinaryByteLength
  const batchTableJson = parseJsonChunk(bytes, offset, batchTableJsonByteLength) as Record<
    string,
    unknown
  >
  offset += batchTableJsonByteLength
  const batchTableBinary = bytes.subarray(offset, offset + batchTableBinaryByteLength)
  offset += batchTableBinaryByteLength
  const gltf = bytes.subarray(offset)
  let rtcCenter: Cartesian3 | undefined
  if (featureTableJson.RTC_CENTER && featureTableJson.RTC_CENTER.length >= 3) {
    rtcCenter = new Cartesian3(
      featureTableJson.RTC_CENTER[0] ?? 0,
      featureTableJson.RTC_CENTER[1] ?? 0,
      featureTableJson.RTC_CENTER[2] ?? 0,
    )
  }
  return {
    gltf,
    featureTableJson,
    featureTableBinary,
    batchTableJson,
    batchTableBinary,
    rtcCenter,
  }
}

/**
 * 编码最小 b3dm（测试 / fixture）。
 *
 * @param gltf GLB 字节
 * @param featureTable 要素表
 */
export function encodeB3dm(gltf: Uint8Array, featureTable: B3dmFeatureTable = {}): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify(featureTable))
  const jsonPad = (json.length + 3) & ~3
  const header = 28
  const out = new Uint8Array(header + jsonPad + gltf.byteLength)
  const view = new DataView(out.buffer)
  view.setUint32(0, MAGIC, true)
  view.setUint32(4, 1, true)
  view.setUint32(8, out.byteLength, true)
  view.setUint32(12, jsonPad, true)
  view.setUint32(16, 0, true)
  view.setUint32(20, 0, true)
  view.setUint32(24, 0, true)
  out.set(json, 28)
  out.fill(0x20, 28 + json.length, 28 + jsonPad)
  out.set(gltf, header + jsonPad)
  return out
}
