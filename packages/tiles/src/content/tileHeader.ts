/**
 * 3D Tiles 二进制头与 JSON chunk。
 */
import { RuntimeError } from "@webgpu-cesium/core"

export const TILE_MAGIC = {
  b3dm: 0x6d643362,
  i3dm: 0x6d643369,
  pnts: 0x73746e70,
  cmpt: 0x74706d63,
  gltf: 0x46546c67,
  subt: 0x62747573,
} as const

/**
 * 读 4 字符 magic。
 *
 * @param bytes 文件
 */
export function readMagic(bytes: Uint8Array): string {
  if (bytes.byteLength < 4) {
    return ""
  }
  return String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0)
}

/**
 * 解析 4 字节对齐 JSON 块；长度为 0 时返回 {}。
 *
 * @param bytes 缓冲
 * @param offset 起始
 * @param length 字节
 */
export function parseJsonChunk(bytes: Uint8Array, offset: number, length: number): unknown {
  if (length <= 0) {
    return {}
  }
  if (offset + length > bytes.byteLength) {
    throw new RuntimeError("JSON chunk exceeds buffer.")
  }
  const text = new TextDecoder()
    .decode(bytes.subarray(offset, offset + length))
    .replace(/\0+$/g, "")
  if (text.trim().length === 0) {
    return {}
  }
  return JSON.parse(text) as unknown
}

/**
 * 按 magic 分类内容。
 *
 * @param bytes 瓦片或 glTF
 */
export function detectTileContentType(
  bytes: Uint8Array,
): "b3dm" | "i3dm" | "pnts" | "cmpt" | "gltf" | "json" | "unknown" {
  const magic = readMagic(bytes)
  if (magic === "b3dm" || magic === "i3dm" || magic === "pnts" || magic === "cmpt") {
    return magic
  }
  if (magic === "glTF") {
    return "gltf"
  }
  if (magic.startsWith("{") || magic.startsWith("[")) {
    return "json"
  }
  return "unknown"
}
