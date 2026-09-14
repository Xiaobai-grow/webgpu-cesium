/**
 * glTF / 3D Tiles 扩展探测。
 */
import type { GltfJson } from "./types"

/**
 * JSON 对象是否声明某扩展。
 *
 * @param json 带 extensions 的对象
 * @param name 扩展名
 */
export function hasExtension(
  json: { extensions?: Record<string, unknown> } | undefined,
  name: string,
): boolean {
  return json?.extensions?.[name] !== undefined
}

/**
 * 资源是否列出某扩展。
 *
 * @param gltf 根 JSON
 * @param name 扩展名
 */
export function usesExtension(gltf: GltfJson, name: string): boolean {
  return (gltf.extensionsUsed ?? []).includes(name) || hasExtension(gltf, name)
}

/**
 * 取扩展对象。
 *
 * @param json 宿主
 * @param name 扩展名
 */
export function getExtension<T>(
  json: { extensions?: Record<string, unknown> } | undefined,
  name: string,
): T | undefined {
  const value = json?.extensions?.[name]
  return value as T | undefined
}
