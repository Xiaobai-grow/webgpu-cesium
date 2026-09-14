/**
 * glTF 缺省补齐（GltfPipeline/addDefaults 的最小子集）。
 */
import type { GltfJson } from "./types"

/**
 * 写入 scene / 默认材质 / 默认 sampler。
 *
 * @param gltf 可改
 */
export function addDefaults(gltf: GltfJson): GltfJson {
  gltf.asset ??= { version: "2.0" }
  gltf.asset.version ??= "2.0"
  if (gltf.scenes === undefined || gltf.scenes.length === 0) {
    const rootNodes = (gltf.nodes ?? []).map((_, index) => index)
    gltf.scenes = [{ nodes: rootNodes }]
    gltf.scene = 0
  } else {
    gltf.scene ??= 0
  }
  gltf.materials ??= []
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      primitive.mode ??= 4
    }
  }
  return gltf
}
