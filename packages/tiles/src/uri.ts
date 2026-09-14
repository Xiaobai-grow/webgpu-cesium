/**
 * URI 字节加载：data: 本地解码，其余走 Resource。
 */
import { isDataUri, type Resource, RuntimeError } from "@webgpu-cesium/core"

/**
 * 解码 data: URI 为字节。
 *
 * @param uri data URI
 */
export function decodeDataUri(uri: string): Uint8Array {
  const comma = uri.indexOf(",")
  if (comma < 0) {
    throw new RuntimeError(`Invalid data URI: ${uri.slice(0, 32)}`)
  }
  const header = uri.slice(0, comma)
  const body = uri.slice(comma + 1)
  if (header.includes(";base64")) {
    const binary = atob(body)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  return new TextEncoder().encode(decodeURIComponent(body))
}

/**
 * 从基 Resource + 相对 / 绝对 / data URI 取字节。
 *
 * @param base 瓦片或 glTF 基地址
 * @param uri 相对路径、绝对 URL 或 data:
 */
export async function loadUriBytes(base: Resource, uri: string): Promise<Uint8Array> {
  if (isDataUri(uri)) {
    return decodeDataUri(uri)
  }
  const derived = base.getDerivedResource({ url: uri })
  if (derived.isDataUri) {
    return decodeDataUri(derived.url)
  }
  const buffer = await derived.fetchArrayBuffer()
  return new Uint8Array(buffer)
}

/**
 * 把字节编成 data: URI。
 *
 * @param bytes 数据
 * @param mime MIME
 */
export function bytesToDataUri(bytes: Uint8Array, mime: string): string {
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length))
    binary += String.fromCharCode(...slice)
  }
  return `data:${mime};base64,${btoa(binary)}`
}
