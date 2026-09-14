/**
 * glTF 2.0 JSON 子集（只列本项目用到的字段）。
 */

export interface GltfAsset {
  version?: string
  generator?: string
  extras?: unknown
}

export interface GltfScene {
  nodes?: number[]
  name?: string
}

export interface GltfNode {
  name?: string
  children?: number[]
  mesh?: number
  skin?: number
  camera?: number
  matrix?: number[]
  translation?: number[]
  rotation?: number[]
  scale?: number[]
  weights?: number[]
  extras?: unknown
  extensions?: Record<string, unknown>
}

export interface GltfPrimitive {
  attributes: Record<string, number>
  indices?: number
  material?: number
  mode?: number
  targets?: Record<string, number>[]
  extras?: unknown
  extensions?: Record<string, unknown>
}

export interface GltfMesh {
  name?: string
  primitives: GltfPrimitive[]
  weights?: number[]
}

export interface GltfTextureInfo {
  index: number
  texCoord?: number
  extensions?: Record<string, unknown>
  scale?: number
  strength?: number
}

export interface GltfPbrMetallicRoughness {
  baseColorFactor?: number[]
  baseColorTexture?: GltfTextureInfo
  metallicFactor?: number
  roughnessFactor?: number
  metallicRoughnessTexture?: GltfTextureInfo
}

export interface GltfMaterial {
  name?: string
  pbrMetallicRoughness?: GltfPbrMetallicRoughness
  normalTexture?: GltfTextureInfo
  occlusionTexture?: GltfTextureInfo
  emissiveTexture?: GltfTextureInfo
  emissiveFactor?: number[]
  alphaMode?: "OPAQUE" | "MASK" | "BLEND"
  alphaCutoff?: number
  doubleSided?: boolean
  extensions?: Record<string, unknown>
}

export interface GltfTexture {
  sampler?: number
  source?: number
  name?: string
  extensions?: Record<string, unknown>
}

export interface GltfSampler {
  magFilter?: number
  minFilter?: number
  wrapS?: number
  wrapT?: number
}

export interface GltfImage {
  uri?: string
  mimeType?: string
  bufferView?: number
  name?: string
  extras?: unknown
  extensions?: Record<string, unknown>
}

export interface GltfAccessor {
  bufferView?: number
  byteOffset?: number
  componentType: number
  count: number
  type: string
  normalized?: boolean
  max?: number[]
  min?: number[]
  sparse?: unknown
  name?: string
}

export interface GltfBufferView {
  buffer: number
  byteOffset?: number
  byteLength: number
  byteStride?: number
  target?: number
}

export interface GltfBuffer {
  uri?: string
  byteLength: number
  name?: string
}

export interface GltfSkin {
  inverseBindMatrices?: number
  skeleton?: number
  joints: number[]
  name?: string
}

export interface GltfAnimationChannel {
  sampler: number
  target: { node?: number; path: string }
}

export interface GltfAnimationSampler {
  input: number
  output: number
  interpolation?: string
}

export interface GltfAnimation {
  name?: string
  channels: GltfAnimationChannel[]
  samplers: GltfAnimationSampler[]
}

export interface GltfJson {
  asset?: GltfAsset
  scene?: number
  scenes?: GltfScene[]
  nodes?: GltfNode[]
  meshes?: GltfMesh[]
  materials?: GltfMaterial[]
  textures?: GltfTexture[]
  samplers?: GltfSampler[]
  images?: GltfImage[]
  accessors?: GltfAccessor[]
  bufferViews?: GltfBufferView[]
  buffers?: GltfBuffer[]
  skins?: GltfSkin[]
  animations?: GltfAnimation[]
  extensionsUsed?: string[]
  extensionsRequired?: string[]
  extensions?: Record<string, unknown>
  extras?: unknown
}

export const GLTF_COMPONENT = {
  BYTE: 5120,
  UNSIGNED_BYTE: 5121,
  SHORT: 5122,
  UNSIGNED_SHORT: 5123,
  UNSIGNED_INT: 5125,
  FLOAT: 5126,
} as const

export const GLTF_TYPE_COMPONENTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
}

export const GLTF_MODE = {
  POINTS: 0,
  LINES: 1,
  LINE_LOOP: 2,
  LINE_STRIP: 3,
  TRIANGLES: 4,
  TRIANGLE_STRIP: 5,
  TRIANGLE_FAN: 6,
} as const
