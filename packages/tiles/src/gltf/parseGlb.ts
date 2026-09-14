/**
 * GLB 容器解析（glTF 2.0）。
 */
import { RuntimeError } from "@webgpu-cesium/core"
import type { GltfJson } from "./types"

const GLB_MAGIC = 0x46546c67
const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942

export interface ParsedGlb {
  json: GltfJson
  bin: Uint8Array | undefined
}

/**
 * 判断是否 GLB。
 *
 * @param bytes 文件头
 */
export function isGlb(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 12) {
    return false
  }
  return (
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true) === GLB_MAGIC
  )
}

/**
 * 拆 GLB 为 JSON + BIN。
 *
 * @param bytes 整文件
 */
export function parseGlb(bytes: Uint8Array): ParsedGlb {
  if (bytes.byteLength < 12) {
    throw new RuntimeError("GLB is too short.")
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) !== GLB_MAGIC) {
    throw new RuntimeError("Not a GLB file.")
  }
  const version = view.getUint32(4, true)
  if (version !== 2) {
    throw new RuntimeError(`Unsupported GLB version ${String(version)}.`)
  }
  const length = view.getUint32(8, true)
  if (length > bytes.byteLength) {
    throw new RuntimeError("GLB length exceeds buffer.")
  }
  let offset = 12
  let json: GltfJson | undefined
  let bin: Uint8Array | undefined
  while (offset + 8 <= length) {
    const chunkLength = view.getUint32(offset, true)
    const chunkType = view.getUint32(offset + 4, true)
    const start = offset + 8
    const end = start + chunkLength
    if (end > length) {
      throw new RuntimeError("GLB chunk exceeds file.")
    }
    if (chunkType === JSON_CHUNK) {
      const text = new TextDecoder().decode(bytes.subarray(start, end))
      json = JSON.parse(text) as GltfJson
    } else if (chunkType === BIN_CHUNK) {
      bin = bytes.subarray(start, end)
    }
    offset = end
  }
  if (json === undefined) {
    throw new RuntimeError("GLB missing JSON chunk.")
  }
  return { json, bin }
}

/**
 * 编码 GLB。
 *
 * @param json glTF JSON
 * @param bin 可选 BIN
 */
export function encodeGlb(json: GltfJson, bin?: Uint8Array): Uint8Array {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json))
  const jsonPad = pad4(jsonBytes.length)
  const hasBin = bin !== undefined && bin.byteLength > 0
  const binPad = hasBin ? pad4(bin.byteLength) : 0
  const total = 12 + 8 + jsonPad + (hasBin ? 8 + binPad : 0)
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  view.setUint32(0, GLB_MAGIC, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonPad, true)
  view.setUint32(16, JSON_CHUNK, true)
  out.set(jsonBytes, 20)
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonPad)
  if (hasBin && bin) {
    const binOffset = 20 + jsonPad
    view.setUint32(binOffset, binPad, true)
    view.setUint32(binOffset + 4, BIN_CHUNK, true)
    out.set(bin, binOffset + 8)
  }
  return out
}

function pad4(value: number): number {
  return (value + 3) & ~3
}
