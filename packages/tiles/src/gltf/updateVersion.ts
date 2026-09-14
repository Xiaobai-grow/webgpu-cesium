/**
 * glTF 1.0 → 2.0 版本戳（不移植 techniques / KHR_materials_common）。
 */
import { RuntimeError } from "@webgpu-cesium/core"
import type { GltfJson } from "./types"

/**
 * 把 asset.version 升到 2.0；1.x 若含 techniques 则拒绝。
 *
 * @param gltf 可改
 */
export function updateVersion(gltf: GltfJson): GltfJson {
  const version = gltf.asset?.version ?? "2.0"
  if (version.startsWith("1.")) {
    const extras = gltf as GltfJson & { techniques?: unknown; shaders?: unknown }
    if (extras.techniques !== undefined || extras.shaders !== undefined) {
      throw new RuntimeError("glTF 1.0 techniques/shaders are not supported; convert to 2.0 first.")
    }
  }
  gltf.asset ??= { version: "2.0" }
  gltf.asset.version = "2.0"
  return gltf
}
