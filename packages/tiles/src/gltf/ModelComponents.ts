/**
 * 解析后的模型数据（对齐 Cesium ModelComponents，渲染侧再用）。
 */
import type { Material } from "@webgpu-cesium/renderer"
import type { GltfAnimation, GltfJson, GltfSkin } from "./types"

export const AttributeType = {
  SCALAR: "SCALAR",
  VEC2: "VEC2",
  VEC3: "VEC3",
  VEC4: "VEC4",
  MAT4: "MAT4",
} as const

export const VertexAttributeSemantic = {
  POSITION: "POSITION",
  NORMAL: "NORMAL",
  TANGENT: "TANGENT",
  TEXCOORD_0: "TEXCOORD_0",
  COLOR_0: "COLOR_0",
  JOINTS_0: "JOINTS_0",
  WEIGHTS_0: "WEIGHTS_0",
  FEATURE_ID_0: "FEATURE_ID_0",
} as const

export const AlphaMode = {
  OPAQUE: "OPAQUE",
  MASK: "MASK",
  BLEND: "BLEND",
} as const

export const Axis = {
  X: 0,
  Y: 1,
  Z: 2,
} as const

export interface ModelPrimitive {
  positions: Float32Array
  normals: Float32Array
  texcoords: Float32Array
  indices: Uint16Array | Uint32Array
  material: Material
  sourceMaterialIndex: number | undefined
  mode: number
  boundingMin: [number, number, number]
  boundingMax: [number, number, number]
}

export interface ModelNodeComponent {
  name: string
  children: number[]
  meshPrimitives: number[]
  localMatrix: Float64Array
  translation: [number, number, number]
  rotation: [number, number, number, number]
  scale: [number, number, number]
}

export interface ModelComponents {
  gltf: GltfJson
  primitives: ModelPrimitive[]
  nodes: ModelNodeComponent[]
  roots: number[]
  animations: GltfAnimation[]
  skins: GltfSkin[]
  upAxis: number
}
