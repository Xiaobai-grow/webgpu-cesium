/**
 * glTF 2.0 / GLB 加载：解析 → accessor → 材质映射。GPU 上传在 Model。
 */
import { Cartesian3, Matrix4, Quaternion, Resource, RuntimeError } from "@webgpu-cesium/core"
import { CompressedTexture, SRGBColorSpace, Texture } from "@webgpu-cesium/renderer"
import { loadUriBytes } from "../uri"
import { addDefaults } from "./addDefaults"
import { getAccessorData } from "./getAccessorData"
import { usesExtension } from "./hasExtension"
import { mapGltfMaterial, mapSamplerFilter, mapSamplerWrap } from "./mapGltfMaterial"
import {
  Axis,
  type ModelComponents,
  type ModelNodeComponent,
  type ModelPrimitive,
} from "./ModelComponents"
import { isGlb, parseGlb } from "./parseGlb"
import { defaultResourceCache, type ResourceCache } from "./ResourceCache"
import type { GltfImage, GltfJson, GltfNode } from "./types"
import { updateVersion } from "./updateVersion"

export interface GltfLoaderOptions {
  url?: string
  resource?: Resource
  gltf?: GltfJson | ArrayBuffer | Uint8Array
  cache?: ResourceCache
  incrementallyLoadTextures?: boolean
}

export interface LoadedGltf {
  components: ModelComponents
  json: GltfJson
}

const IDENTITY_MATRIX = new Float64Array(Matrix4.IDENTITY)

/**
 * 加载并展开为 ModelComponents。
 */
export class GltfLoader {
  /**
   * @param options URL / 已有 JSON / GLB 字节
   */
  static async load(options: GltfLoaderOptions): Promise<LoadedGltf> {
    const cache = options.cache ?? defaultResourceCache
    const resource = resolveResource(options)
    const cacheKey = resource.url
    const hit = cache.get<LoadedGltf>(cacheKey)
    if (hit && options.gltf === undefined) {
      return hit
    }
    const { json, buffers } = await loadJsonAndBuffers(options, resource)
    updateVersion(json)
    addDefaults(json)
    if (usesExtension(json, "KHR_draco_mesh_compression")) {
      throw new RuntimeError(
        "KHR_draco_mesh_compression requires decodeDraco Worker; uncompressed glTF only in M5.",
      )
    }
    const textures = await loadTextures(json, buffers, resource)
    const primitives = buildPrimitives(json, buffers, textures)
    const nodes = (json.nodes ?? []).map((node) => toNodeComponent(node, json))
    const sceneIndex = json.scene ?? 0
    const roots = json.scenes?.[sceneIndex]?.nodes ?? (nodes.length > 0 ? [0] : [])
    const components: ModelComponents = {
      gltf: json,
      primitives,
      nodes,
      roots,
      animations: json.animations ?? [],
      skins: json.skins ?? [],
      upAxis: Axis.Y,
    }
    const loaded = { components, json }
    if (options.gltf === undefined) {
      cache.set(
        cacheKey,
        loaded,
        buffers.reduce((sum, item) => sum + item.byteLength, 0),
      )
    }
    return loaded
  }
}

function resolveResource(options: GltfLoaderOptions): Resource {
  if (options.resource) {
    return options.resource
  }
  if (options.url !== undefined) {
    return new Resource({ url: options.url })
  }
  return new Resource({ url: "memory://gltf" })
}

async function loadJsonAndBuffers(
  options: GltfLoaderOptions,
  resource: Resource,
): Promise<{ json: GltfJson; buffers: Uint8Array[] }> {
  if (options.gltf instanceof ArrayBuffer) {
    return parseDocument(new Uint8Array(options.gltf), resource)
  }
  if (options.gltf instanceof Uint8Array) {
    return parseDocument(options.gltf, resource)
  }
  if (options.gltf && typeof options.gltf === "object") {
    const json = options.gltf
    const buffers = await resolveBuffers(json, undefined, resource)
    return { json, buffers }
  }
  const bytes = new Uint8Array(await resource.fetchArrayBuffer())
  return parseDocument(bytes, resource)
}

async function parseDocument(
  bytes: Uint8Array,
  resource: Resource,
): Promise<{ json: GltfJson; buffers: Uint8Array[] }> {
  if (isGlb(bytes)) {
    const parsed = parseGlb(bytes)
    const buffers = await resolveBuffers(parsed.json, parsed.bin, resource)
    return { json: parsed.json, buffers }
  }
  const json = JSON.parse(new TextDecoder().decode(bytes)) as GltfJson
  const buffers = await resolveBuffers(json, undefined, resource)
  return { json, buffers }
}

async function resolveBuffers(
  json: GltfJson,
  glbBin: Uint8Array | undefined,
  resource: Resource,
): Promise<Uint8Array[]> {
  const result: Uint8Array[] = []
  const buffers = json.buffers ?? []
  for (const buffer of buffers) {
    if (!buffer) {
      result.push(new Uint8Array())
      continue
    }
    if (buffer.uri === undefined) {
      result.push(glbBin ?? new Uint8Array(buffer.byteLength))
      continue
    }
    result.push(await loadUriBytes(resource, buffer.uri))
  }
  return result
}

async function loadTextures(
  json: GltfJson,
  buffers: readonly Uint8Array[],
  resource: Resource,
): Promise<(Texture | undefined)[]> {
  const images = json.images ?? []
  const decoded: (Texture | undefined)[] = []
  const imageTextures: (Texture | undefined)[] = []
  for (const image of images) {
    imageTextures.push(await decodeImage(image, json, buffers, resource))
  }
  for (const texture of json.textures ?? []) {
    const basisu = texture.extensions?.KHR_texture_basisu as { source?: number } | undefined
    const source = basisu?.source ?? texture.source
    const sampler = texture.sampler !== undefined ? json.samplers?.[texture.sampler] : undefined
    const imageTex = source !== undefined ? imageTextures[source] : undefined
    if (!imageTex) {
      decoded.push(undefined)
      continue
    }
    imageTex.wrapS = mapSamplerWrap(sampler?.wrapS)
    imageTex.wrapT = mapSamplerWrap(sampler?.wrapT)
    imageTex.magFilter = mapSamplerFilter(sampler?.magFilter)
    imageTex.minFilter = mapSamplerFilter(sampler?.minFilter)
    if (basisu !== undefined && !(imageTex instanceof CompressedTexture)) {
      decoded.push(
        new CompressedTexture({
          ...(imageTex.source !== undefined ? { source: imageTex.source } : {}),
          name: texture.name ?? imageTex.name,
          transcodeTarget: "rgba",
        }),
      )
      continue
    }
    decoded.push(imageTex)
  }
  return decoded
}

async function decodeImage(
  image: GltfImage,
  json: GltfJson,
  buffers: readonly Uint8Array[],
  resource: Resource,
): Promise<Texture | undefined> {
  const webp = image.extensions?.EXT_texture_webp as { source?: number } | undefined
  if (webp?.source !== undefined) {
    const alt = json.images?.[webp.source]
    if (alt) {
      return decodeImage(alt, json, buffers, resource)
    }
  }
  let bytes: Uint8Array | undefined
  if (image.uri !== undefined) {
    if (image.uri.endsWith(".ktx2") || image.mimeType === "image/ktx2") {
      return new CompressedTexture({
        name: image.name ?? "ktx2",
        transcodeTarget: "rgba",
        source: { data: new Uint8Array([255, 255, 255, 255]), width: 1, height: 1 },
      })
    }
    bytes = await loadUriBytes(resource, image.uri)
  } else if (image.bufferView !== undefined) {
    const view = json.bufferViews?.[image.bufferView]
    const buffer = view ? buffers[view.buffer] : undefined
    if (view && buffer) {
      const start = view.byteOffset ?? 0
      bytes = buffer.subarray(start, start + view.byteLength)
    }
  }
  if (!bytes) {
    return undefined
  }
  const bitmap = await bytesToImageBitmap(bytes)
  if (!bitmap) {
    return new Texture({
      source: { data: new Uint8Array([255, 255, 255, 255]), width: 1, height: 1 },
      name: image.name ?? "image-fallback",
    })
  }
  return new Texture({
    source: bitmap,
    name: image.name ?? "gltf-image",
    colorSpace: SRGBColorSpace,
  })
}

async function bytesToImageBitmap(bytes: Uint8Array): Promise<ImageBitmap | undefined> {
  const create = (globalThis as { createImageBitmap?: typeof createImageBitmap }).createImageBitmap
  const BlobCtor = (globalThis as { Blob?: typeof Blob }).Blob
  if (!create || !BlobCtor) {
    return undefined
  }
  const blob = new BlobCtor([bytes.slice()])
  return create(blob)
}

function buildPrimitives(
  json: GltfJson,
  buffers: readonly Uint8Array[],
  textures: readonly (Texture | undefined)[],
): ModelPrimitive[] {
  const primitives: ModelPrimitive[] = []
  const materials = json.materials ?? []
  const mappedMaterials = materials.map((material) => mapGltfMaterial(json, material, { textures }))
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const positionIndex = primitive.attributes.POSITION
      if (positionIndex === undefined) {
        continue
      }
      const positions = getAccessorData(json, buffers, positionIndex) as Float32Array
      const normalIndex = primitive.attributes.NORMAL
      const normals =
        normalIndex !== undefined
          ? (getAccessorData(json, buffers, normalIndex) as Float32Array)
          : generateNormals(
              positions,
              primitive.indices !== undefined
                ? (getAccessorData(json, buffers, primitive.indices, true) as
                    Uint16Array | Uint32Array)
                : undefined,
            )
      const uvIndex = primitive.attributes.TEXCOORD_0
      const texcoords =
        uvIndex !== undefined
          ? (getAccessorData(json, buffers, uvIndex) as Float32Array)
          : new Float32Array((positions.length / 3) * 2)
      const indices =
        primitive.indices !== undefined
          ? (getAccessorData(json, buffers, primitive.indices, true) as Uint16Array | Uint32Array)
          : sequentialIndices(positions.length / 3)
      const materialIndex = primitive.material
      const material =
        materialIndex !== undefined
          ? (mappedMaterials[materialIndex] ?? mapGltfMaterial(json, undefined, { textures }))
          : mapGltfMaterial(json, undefined, { textures })
      const { min, max } = accessorBounds(json, positionIndex, positions)
      primitives.push({
        positions,
        normals,
        texcoords,
        indices,
        material,
        sourceMaterialIndex: materialIndex,
        mode: primitive.mode ?? 4,
        boundingMin: min,
        boundingMax: max,
      })
    }
  }
  return primitives
}

function sequentialIndices(vertexCount: number): Uint16Array | Uint32Array {
  if (vertexCount > 65535) {
    const indices = new Uint32Array(vertexCount)
    for (let i = 0; i < vertexCount; i++) {
      indices[i] = i
    }
    return indices
  }
  const indices = new Uint16Array(vertexCount)
  for (let i = 0; i < vertexCount; i++) {
    indices[i] = i
  }
  return indices
}

function generateNormals(
  positions: Float32Array,
  indices?: Uint16Array | Uint32Array,
): Float32Array {
  const normals = new Float32Array(positions.length)
  if (!indices) {
    for (let i = 2; i < positions.length / 3; i += 3) {
      accumulateFace(positions, normals, i - 2, i - 1, i)
    }
    normalizeNormals(normals)
    return normals
  }
  for (let i = 0; i + 2 < indices.length; i += 3) {
    accumulateFace(positions, normals, indices[i] ?? 0, indices[i + 1] ?? 0, indices[i + 2] ?? 0)
  }
  normalizeNormals(normals)
  return normals
}

function accumulateFace(
  positions: Float32Array,
  normals: Float32Array,
  a: number,
  b: number,
  c: number,
): void {
  const ax = positions[a * 3] ?? 0
  const ay = positions[a * 3 + 1] ?? 0
  const az = positions[a * 3 + 2] ?? 0
  const bx = positions[b * 3] ?? 0
  const by = positions[b * 3 + 1] ?? 0
  const bz = positions[b * 3 + 2] ?? 0
  const cx = positions[c * 3] ?? 0
  const cy = positions[c * 3 + 1] ?? 0
  const cz = positions[c * 3 + 2] ?? 0
  const ux = bx - ax
  const uy = by - ay
  const uz = bz - az
  const vx = cx - ax
  const vy = cy - ay
  const vz = cz - az
  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  normals[a * 3] = (normals[a * 3] ?? 0) + nx
  normals[a * 3 + 1] = (normals[a * 3 + 1] ?? 0) + ny
  normals[a * 3 + 2] = (normals[a * 3 + 2] ?? 0) + nz
  normals[b * 3] = (normals[b * 3] ?? 0) + nx
  normals[b * 3 + 1] = (normals[b * 3 + 1] ?? 0) + ny
  normals[b * 3 + 2] = (normals[b * 3 + 2] ?? 0) + nz
  normals[c * 3] = (normals[c * 3] ?? 0) + nx
  normals[c * 3 + 1] = (normals[c * 3 + 1] ?? 0) + ny
  normals[c * 3 + 2] = (normals[c * 3 + 2] ?? 0) + nz
}

function normalizeNormals(normals: Float32Array): void {
  for (let i = 0; i < normals.length; i += 3) {
    const x = normals[i] ?? 0
    const y = normals[i + 1] ?? 0
    const z = normals[i + 2] ?? 0
    const len = Math.hypot(x, y, z) || 1
    normals[i] = x / len
    normals[i + 1] = y / len
    normals[i + 2] = z / len
  }
}

function accessorBounds(
  json: GltfJson,
  accessorIndex: number,
  positions: Float32Array,
): { min: [number, number, number]; max: [number, number, number] } {
  const accessor = json.accessors?.[accessorIndex]
  if (accessor?.min && accessor.max && accessor.min.length >= 3 && accessor.max.length >= 3) {
    return {
      min: [accessor.min[0] ?? 0, accessor.min[1] ?? 0, accessor.min[2] ?? 0],
      max: [accessor.max[0] ?? 0, accessor.max[1] ?? 0, accessor.max[2] ?? 0],
    }
  }
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i] ?? 0
    const y = positions[i + 1] ?? 0
    const z = positions[i + 2] ?? 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    maxZ = Math.max(maxZ, z)
  }
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] }
}

function toNodeComponent(node: GltfNode, json: GltfJson): ModelNodeComponent {
  const matrix = nodeMatrix(node)
  const meshPrimitives: number[] = []
  if (node.mesh !== undefined) {
    let cursor = 0
    for (let m = 0; m < (json.meshes?.length ?? 0); m++) {
      const mesh = json.meshes?.[m]
      const count = mesh?.primitives.length ?? 0
      if (m === node.mesh) {
        for (let p = 0; p < count; p++) {
          meshPrimitives.push(cursor + p)
        }
        break
      }
      cursor += count
    }
  }
  return {
    name: node.name ?? "",
    children: node.children ?? [],
    meshPrimitives,
    localMatrix: matrix,
    translation: [
      node.translation?.[0] ?? 0,
      node.translation?.[1] ?? 0,
      node.translation?.[2] ?? 0,
    ],
    rotation: [
      node.rotation?.[0] ?? 0,
      node.rotation?.[1] ?? 0,
      node.rotation?.[2] ?? 0,
      node.rotation?.[3] ?? 1,
    ],
    scale: [node.scale?.[0] ?? 1, node.scale?.[1] ?? 1, node.scale?.[2] ?? 1],
  }
}

/**
 * 节点局部矩阵（列主序 16）。
 *
 * @param node 节点
 */
export function nodeMatrix(node: GltfNode): Float64Array {
  if (node.matrix?.length === 16) {
    return Float64Array.from(node.matrix)
  }
  const translation = node.translation ?? [0, 0, 0]
  const rotation = node.rotation ?? [0, 0, 0, 1]
  const scale = node.scale ?? [1, 1, 1]
  const quat = new Quaternion(
    rotation[0] ?? 0,
    rotation[1] ?? 0,
    rotation[2] ?? 0,
    rotation[3] ?? 1,
  )
  const matrix = Matrix4.fromTranslationQuaternionRotationScale(
    new Cartesian3(translation[0] ?? 0, translation[1] ?? 0, translation[2] ?? 0),
    quat,
    new Cartesian3(scale[0] ?? 1, scale[1] ?? 1, scale[2] ?? 1),
    new Matrix4(),
  )
  const dest = new Float64Array(16)
  for (let i = 0; i < 16; i++) {
    dest[i] = matrix[i] ?? IDENTITY_MATRIX[i] ?? 0
  }
  return dest
}
