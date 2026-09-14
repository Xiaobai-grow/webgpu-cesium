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

const MAGIC = 0x73746e70

export interface PntsFeatureTable {
  POINTS_LENGTH?: number
  RTC_CENTER?: number[]
  POSITION?: { byteOffset: number }
  POSITION_QUANTIZED?: { byteOffset: number }
  QUANTIZED_VOLUME_OFFSET?: number[]
  QUANTIZED_VOLUME_SCALE?: number[]
  RGB?: { byteOffset: number }
  RGBA?: { byteOffset: number }
  CONSTANT_RGBA?: number[]
}

export interface ParsedPnts {
  positions: Float32Array
  colors: Float32Array
  rtcCenter: Cartesian3 | undefined
  featureTableJson: PntsFeatureTable
  batchTableJson: Record<string, unknown>
}

/**
 * 解析 pnts 点云（位置 + 颜色；EDL 留 M6 后处理）。
 *
 * @param bytes 整瓦片
 */
export function parsePnts(bytes: Uint8Array): ParsedPnts {
  if (bytes.byteLength < 28) {
    throw new RuntimeError("pnts is too short.")
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) !== MAGIC) {
    throw new RuntimeError("Not a pnts tile.")
  }
  const featureTableJsonByteLength = view.getUint32(12, true)
  const featureTableBinaryByteLength = view.getUint32(16, true)
  const batchTableJsonByteLength = view.getUint32(20, true)
  let offset = 28
  const featureTableJson = parseJsonChunk(
    bytes,
    offset,
    featureTableJsonByteLength,
  ) as PntsFeatureTable
  offset += featureTableJsonByteLength
  const featureTableBinary = bytes.subarray(offset, offset + featureTableBinaryByteLength)
  offset += featureTableBinaryByteLength
  const batchTableJson = parseJsonChunk(bytes, offset, batchTableJsonByteLength) as Record<
    string,
    unknown
  >
  const count = featureTableJson.POINTS_LENGTH ?? 0
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const bin = new DataView(
    featureTableBinary.buffer,
    featureTableBinary.byteOffset,
    featureTableBinary.byteLength,
  )
  if (featureTableJson.POSITION) {
    const start = featureTableJson.POSITION.byteOffset
    for (let i = 0; i < count; i++) {
      positions[i * 3] = bin.getFloat32(start + i * 12, true)
      positions[i * 3 + 1] = bin.getFloat32(start + i * 12 + 4, true)
      positions[i * 3 + 2] = bin.getFloat32(start + i * 12 + 8, true)
    }
  } else if (featureTableJson.POSITION_QUANTIZED) {
    const start = featureTableJson.POSITION_QUANTIZED.byteOffset
    const offsetV = featureTableJson.QUANTIZED_VOLUME_OFFSET ?? [0, 0, 0]
    const scale = featureTableJson.QUANTIZED_VOLUME_SCALE ?? [1, 1, 1]
    for (let i = 0; i < count; i++) {
      const qx = bin.getUint16(start + i * 6, true)
      const qy = bin.getUint16(start + i * 6 + 2, true)
      const qz = bin.getUint16(start + i * 6 + 4, true)
      positions[i * 3] = (offsetV[0] ?? 0) + (qx / 65535) * (scale[0] ?? 1)
      positions[i * 3 + 1] = (offsetV[1] ?? 0) + (qy / 65535) * (scale[1] ?? 1)
      positions[i * 3 + 2] = (offsetV[2] ?? 0) + (qz / 65535) * (scale[2] ?? 1)
    }
  }
  if (featureTableJson.RGB) {
    const start = featureTableJson.RGB.byteOffset
    for (let i = 0; i < count; i++) {
      colors[i * 3] = bin.getUint8(start + i * 3) / 255
      colors[i * 3 + 1] = bin.getUint8(start + i * 3 + 1) / 255
      colors[i * 3 + 2] = bin.getUint8(start + i * 3 + 2) / 255
    }
  } else if (featureTableJson.RGBA) {
    const start = featureTableJson.RGBA.byteOffset
    for (let i = 0; i < count; i++) {
      colors[i * 3] = bin.getUint8(start + i * 4) / 255
      colors[i * 3 + 1] = bin.getUint8(start + i * 4 + 1) / 255
      colors[i * 3 + 2] = bin.getUint8(start + i * 4 + 2) / 255
    }
  } else if (featureTableJson.CONSTANT_RGBA) {
    const rgba = featureTableJson.CONSTANT_RGBA
    const r = (rgba[0] ?? 255) / 255
    const g = (rgba[1] ?? 255) / 255
    const b = (rgba[2] ?? 255) / 255
    colors.fill(0)
    for (let i = 0; i < count; i++) {
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b
    }
  } else {
    colors.fill(1)
  }
  let rtcCenter: Cartesian3 | undefined
  if (featureTableJson.RTC_CENTER && featureTableJson.RTC_CENTER.length >= 3) {
    rtcCenter = new Cartesian3(
      featureTableJson.RTC_CENTER[0] ?? 0,
      featureTableJson.RTC_CENTER[1] ?? 0,
      featureTableJson.RTC_CENTER[2] ?? 0,
    )
  }
  return { positions, colors, rtcCenter, featureTableJson, batchTableJson }
}
