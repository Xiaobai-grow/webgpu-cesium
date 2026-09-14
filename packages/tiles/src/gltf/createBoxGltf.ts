/**
 * 最小彩色盒子 glTF / GLB / tileset fixture（仓库内自生成，不提交巨大倾斜摄影）。
 */
import { Cartesian3, Matrix4, Transforms } from "@webgpu-cesium/core"
import { encodeB3dm } from "../content/B3dmParser"
import { bytesToDataUri } from "../uri"
import { encodeGlb } from "./parseGlb"
import type { GltfJson } from "./types"

export interface BoxGltfOptions {
  color?: [number, number, number, number]
  metallic?: number
  roughness?: number
  unlit?: boolean
  size?: number
}

/**
 * 单位盒（Y-up，中心在原点）。
 *
 * @param options 材质
 */
export function createBoxGltfJson(options: BoxGltfOptions = {}): {
  json: GltfJson
  bin: Uint8Array
} {
  const size = options.size ?? 1
  const h = size * 0.5
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const faces: [number, number, number][] = [
    [0, 0, 1],
    [0, 0, -1],
    [0, 1, 0],
    [0, -1, 0],
    [1, 0, 0],
    [-1, 0, 0],
  ]
  const quads: number[][] = [
    [-h, -h, h, h, -h, h, h, h, h, -h, h, h],
    [h, -h, -h, -h, -h, -h, -h, h, -h, h, h, -h],
    [-h, h, -h, -h, h, h, h, h, h, h, h, -h],
    [-h, -h, h, -h, -h, -h, h, -h, -h, h, -h, h],
    [h, -h, h, h, -h, -h, h, h, -h, h, h, h],
    [-h, -h, -h, -h, -h, h, -h, h, h, -h, h, -h],
  ]
  const indices: number[] = []
  for (let f = 0; f < 6; f++) {
    const quad = quads[f] ?? []
    const n = faces[f] ?? [0, 1, 0]
    const base = f * 4
    for (let i = 0; i < 4; i++) {
      positions.push(quad[i * 3] ?? 0, quad[i * 3 + 1] ?? 0, quad[i * 3 + 2] ?? 0)
      normals.push(n[0] ?? 0, n[1] ?? 0, n[2] ?? 0)
    }
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  const pos = new Float32Array(positions)
  const nrm = new Float32Array(normals)
  const uv = new Float32Array(uvs)
  const idx = new Uint16Array(indices)
  const bin = new Uint8Array(pos.byteLength + nrm.byteLength + uv.byteLength + idx.byteLength)
  let offset = 0
  bin.set(new Uint8Array(pos.buffer), offset)
  const posOffset = offset
  offset += pos.byteLength
  const nrmOffset = offset
  bin.set(new Uint8Array(nrm.buffer), offset)
  offset += nrm.byteLength
  const uvOffset = offset
  bin.set(new Uint8Array(uv.buffer), offset)
  offset += uv.byteLength
  const idxOffset = offset
  bin.set(new Uint8Array(idx.buffer), offset)

  const color = options.color ?? [0.25, 0.55, 0.95, 1]
  const material: GltfJson["materials"] = [
    {
      name: options.unlit ? "box-unlit" : "box-pbr",
      pbrMetallicRoughness: {
        baseColorFactor: color,
        metallicFactor: options.metallic ?? 0.15,
        roughnessFactor: options.roughness ?? 0.35,
      },
      ...(options.unlit ? { extensions: { KHR_materials_unlit: {} } } : {}),
    },
  ]
  const json: GltfJson = {
    asset: { version: "2.0", generator: "webgpu-cesium-m5-fixture" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "Box" }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    materials: material,
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 24,
        type: "VEC3",
        min: [-h, -h, -h],
        max: [h, h, h],
      },
      { bufferView: 1, componentType: 5126, count: 24, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: 24, type: "VEC2" },
      { bufferView: 3, componentType: 5123, count: 36, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: posOffset, byteLength: pos.byteLength },
      { buffer: 0, byteOffset: nrmOffset, byteLength: nrm.byteLength },
      { buffer: 0, byteOffset: uvOffset, byteLength: uv.byteLength },
      { buffer: 0, byteOffset: idxOffset, byteLength: idx.byteLength, target: 34963 },
    ],
    buffers: [{ byteLength: bin.byteLength }],
    ...(options.unlit ? { extensionsUsed: ["KHR_materials_unlit"] } : {}),
  }
  return { json, bin }
}

/**
 * 盒子 GLB。
 *
 * @param options 材质
 */
export function createBoxGlb(options: BoxGltfOptions = {}): Uint8Array {
  const { json, bin } = createBoxGltfJson(options)
  return encodeGlb(json, bin)
}

/**
 * 盒子 b3dm。
 *
 * @param options 材质
 */
export function createBoxB3dm(options: BoxGltfOptions = {}): Uint8Array {
  return encodeB3dm(createBoxGlb(options), { BATCH_LENGTH: 0 })
}

export interface CityTilesetOptions {
  longitude?: number
  latitude?: number
  height?: number
  spacing?: number
}

/**
 * 四栋彩色盒子的本地 tileset（data URI 内容）。
 *
 * @param options 位置
 */
export function createCityTilesetJson(options: CityTilesetOptions = {}): {
  tileset: Record<string, unknown>
  glb: Uint8Array
} {
  const lon = options.longitude ?? 8
  const lat = options.latitude ?? 46
  const height = options.height ?? 8
  const spacing = options.spacing ?? 7
  const origin = Cartesian3.fromDegrees(lon, lat, height)
  const enu = Transforms.eastNorthUpToFixedFrame(origin)
  const glb = createBoxGlb({ color: [0.85, 0.45, 0.2, 1], metallic: 0.2, roughness: 0.4, size: 6 })
  const offsets: [number, number][] = [
    [-spacing, -spacing],
    [spacing, -spacing],
    [-spacing, spacing],
    [spacing, spacing],
  ]
  const colors: [number, number, number, number][] = [
    [0.85, 0.35, 0.2, 1],
    [0.2, 0.55, 0.85, 1],
    [0.3, 0.75, 0.4, 1],
    [0.9, 0.8, 0.25, 1],
  ]
  // 包围体与 transform 都在父瓦片局部系；根 ENU 再映到 ECEF。
  // 若把 ECEF 球心再乘 ENU，遍历会把瓦片剔到视锥外（示例黑屏）。
  const children = offsets.map((offset, index) => {
    const local = new Cartesian3(offset[0], offset[1], 3)
    const childGlb = createBoxGlb({
      color: colors[index] ?? [1, 1, 1, 1],
      metallic: 0.1 + index * 0.2,
      roughness: 0.25,
      size: 5 + index,
    })
    return {
      boundingVolume: { sphere: [0, 0, 0, 12] },
      geometricError: 0,
      content: { uri: bytesToDataUri(childGlb, "model/gltf-binary") },
      transform: Array.from(Matrix4.fromTranslation(local)),
    }
  })
  const tileset = {
    asset: { version: "1.1", generator: "webgpu-cesium-m5-fixture" },
    geometricError: 80,
    root: {
      boundingVolume: { sphere: [0, 0, 0, 40] },
      geometricError: 20,
      refine: "REPLACE",
      transform: Array.from(enu),
      children,
    },
  }
  return { tileset, glb }
}
