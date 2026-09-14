/**
 * glTF 材质 → MeshPhysicalMaterial / MeshBasicMaterial（ADR-0010 / 12-material-system §5）。
 */
import { Color } from "@webgpu-cesium/core"
import {
  DoubleSide,
  LinearFilter,
  LinearSRGBColorSpace,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  type Material,
} from "@webgpu-cesium/renderer"
import { getExtension, hasExtension } from "./hasExtension"
import type { GltfJson, GltfMaterial, GltfTextureInfo } from "./types"

export interface GltfTextureSlot {
  texture: Texture
  texCoord: number
}

export interface MapGltfMaterialOptions {
  textures: readonly (Texture | undefined)[]
}

interface ClearcoatExt {
  clearcoatFactor?: number
  clearcoatRoughnessFactor?: number
}

interface IorExt {
  ior?: number
}

interface TransmissionExt {
  transmissionFactor?: number
}

interface VolumeExt {
  thicknessFactor?: number
  attenuationDistance?: number
  attenuationColor?: number[]
}

interface SheenExt {
  sheenColorFactor?: number[]
  sheenRoughnessFactor?: number
}

interface SpecularExt {
  specularFactor?: number
  specularColorFactor?: number[]
}

interface IridescenceExt {
  iridescenceFactor?: number
  iridescenceIor?: number
  iridescenceThicknessMinimum?: number
  iridescenceThicknessMaximum?: number
}

interface AnisotropyExt {
  anisotropyStrength?: number
  anisotropyRotation?: number
}

interface DispersionExt {
  dispersion?: number
}

interface EmissiveStrengthExt {
  emissiveStrength?: number
}

interface SpecularGlossinessExt {
  diffuseFactor?: number[]
  specularFactor?: number[]
  glossinessFactor?: number
}

/**
 * 映射一个 glTF 材质。
 *
 * @param gltf 根
 * @param material 材质 JSON
 * @param options 已解码纹理
 */
export function mapGltfMaterial(
  gltf: GltfJson,
  material: GltfMaterial | undefined,
  options: MapGltfMaterialOptions,
): Material {
  const mat = material ?? {}
  if (hasExtension(mat, "KHR_materials_unlit")) {
    return mapUnlit(gltf, mat, options)
  }
  return mapPhysical(gltf, mat, options)
}

function mapUnlit(
  gltf: GltfJson,
  material: GltfMaterial,
  options: MapGltfMaterialOptions,
): MeshBasicMaterial {
  const pbr = material.pbrMetallicRoughness
  const factor = pbr?.baseColorFactor ?? [1, 1, 1, 1]
  const mapped = new MeshBasicMaterial({
    name: material.name ?? "",
    color: new Color(factor[0] ?? 1, factor[1] ?? 1, factor[2] ?? 1, factor[3] ?? 1),
    opacity: factor[3] ?? 1,
    ...alphaOptions(material),
  })
  const map = textureFromInfo(gltf, pbr?.baseColorTexture, options, true)
  if (map) {
    mapped.map = map
    mapped.defines.HAS_MAP = 1
  }
  return mapped
}

function mapPhysical(
  gltf: GltfJson,
  material: GltfMaterial,
  options: MapGltfMaterialOptions,
): MeshPhysicalMaterial {
  const specGloss = getExtension<SpecularGlossinessExt>(
    material,
    "KHR_materials_pbrSpecularGlossiness",
  )
  const pbr = material.pbrMetallicRoughness
  let color = pbr?.baseColorFactor ?? [1, 1, 1, 1]
  let metalness = pbr?.metallicFactor ?? 1
  let roughness = pbr?.roughnessFactor ?? 1
  if (specGloss) {
    const converted = specularGlossinessToMetallic(specGloss)
    color = converted.color
    metalness = converted.metalness
    roughness = converted.roughness
  }
  const emissive = material.emissiveFactor ?? [0, 0, 0]
  const emissiveStrength =
    getExtension<EmissiveStrengthExt>(material, "KHR_materials_emissive_strength")
      ?.emissiveStrength ?? 1
  const clearcoat = getExtension<ClearcoatExt>(material, "KHR_materials_clearcoat")
  const ior = getExtension<IorExt>(material, "KHR_materials_ior")
  const transmission = getExtension<TransmissionExt>(material, "KHR_materials_transmission")
  const volume = getExtension<VolumeExt>(material, "KHR_materials_volume")
  const sheen = getExtension<SheenExt>(material, "KHR_materials_sheen")
  const specular = getExtension<SpecularExt>(material, "KHR_materials_specular")
  const iridescence = getExtension<IridescenceExt>(material, "KHR_materials_iridescence")
  const anisotropy = getExtension<AnisotropyExt>(material, "KHR_materials_anisotropy")
  const dispersion = getExtension<DispersionExt>(material, "KHR_materials_dispersion")

  const mapped = new MeshPhysicalMaterial({
    name: material.name ?? "",
    color: new Color(color[0] ?? 1, color[1] ?? 1, color[2] ?? 1, color[3] ?? 1),
    opacity: color[3] ?? 1,
    metalness,
    roughness,
    emissive: new Color(emissive[0] ?? 0, emissive[1] ?? 0, emissive[2] ?? 0, 1),
    emissiveIntensity: emissiveStrength,
    clearcoat: clearcoat?.clearcoatFactor ?? 0,
    clearcoatRoughness: clearcoat?.clearcoatRoughnessFactor ?? 0,
    ior: ior?.ior ?? 1.5,
    transmission: transmission?.transmissionFactor ?? 0,
    ...alphaOptions(material),
  })
  mapped.thickness = volume?.thicknessFactor ?? 0
  mapped.attenuationDistance = volume?.attenuationDistance ?? Infinity
  mapped.attenuationColor = colorFromRgb(volume?.attenuationColor ?? [1, 1, 1])
  mapped.sheen = sheen ? 1 : 0
  mapped.sheenColor = colorFromRgb(sheen?.sheenColorFactor ?? [0, 0, 0])
  mapped.sheenRoughness = sheen?.sheenRoughnessFactor ?? 1
  mapped.specularIntensity = specular?.specularFactor ?? 1
  mapped.specularColor = colorFromRgb(specular?.specularColorFactor ?? [1, 1, 1])
  mapped.iridescence = iridescence?.iridescenceFactor ?? 0
  mapped.iridescenceIOR = iridescence?.iridescenceIor ?? 1.3
  mapped.iridescenceThicknessRange = [
    iridescence?.iridescenceThicknessMinimum ?? 100,
    iridescence?.iridescenceThicknessMaximum ?? 400,
  ]
  mapped.anisotropy = anisotropy?.anisotropyStrength ?? 0
  mapped.anisotropyRotation = anisotropy?.anisotropyRotation ?? 0
  mapped.dispersion = dispersion?.dispersion ?? 0

  const map = textureFromInfo(gltf, pbr?.baseColorTexture, options, true)
  if (map) {
    mapped.map = map
    mapped.defines.HAS_MAP = 1
  }
  const normal = textureFromInfo(gltf, material.normalTexture, options, false)
  if (normal) {
    mapped.normalMap = normal
    mapped.normalScale = material.normalTexture?.scale ?? 1
    mapped.defines.HAS_NORMAL_MAP = 1
  }
  const ao = textureFromInfo(gltf, material.occlusionTexture, options, false)
  if (ao) {
    mapped.aoMap = ao
    mapped.aoMapIntensity = material.occlusionTexture?.strength ?? 1
  }
  const emissiveMap = textureFromInfo(gltf, material.emissiveTexture, options, true)
  if (emissiveMap) {
    mapped.emissiveMap = emissiveMap
    mapped.defines.HAS_EMISSIVE_MAP = 1
  }
  const mr = textureFromInfo(gltf, pbr?.metallicRoughnessTexture, options, false)
  if (mr) {
    mapped.metalnessMap = mr
    mapped.roughnessMap = mr
  }
  if (mapped.transmission > 0) {
    mapped.transparent = true
  }
  return mapped
}

function alphaOptions(material: GltfMaterial): {
  transparent?: boolean
  alphaTest?: number
  side?: typeof DoubleSide
} {
  const out: {
    transparent?: boolean
    alphaTest?: number
    side?: typeof DoubleSide
  } = {}
  if (material.alphaMode === "BLEND") {
    out.transparent = true
  }
  if (material.alphaMode === "MASK") {
    out.alphaTest = material.alphaCutoff ?? 0.5
  }
  if (material.doubleSided === true) {
    out.side = DoubleSide
  }
  return out
}

function textureFromInfo(
  _gltf: GltfJson,
  info: GltfTextureInfo | undefined,
  options: MapGltfMaterialOptions,
  srgb: boolean,
): Texture | undefined {
  if (info === undefined) {
    return undefined
  }
  const texture = options.textures[info.index]
  if (!texture) {
    return undefined
  }
  applyTextureTransform(texture, info)
  if (srgb) {
    texture.colorSpace = SRGBColorSpace
  } else {
    texture.colorSpace = LinearSRGBColorSpace
  }
  return texture
}

interface TextureTransformExt {
  offset?: number[]
  rotation?: number
  scale?: number[]
}

/**
 * KHR_texture_transform → Texture.offset/repeat/rotation。
 *
 * @param texture 目标
 * @param info textureInfo
 */
export function applyTextureTransform(texture: Texture, info: GltfTextureInfo): void {
  const transform = getExtension<TextureTransformExt>(info, "KHR_texture_transform")
  if (!transform) {
    return
  }
  texture.offset.x = transform.offset?.[0] ?? 0
  texture.offset.y = transform.offset?.[1] ?? 0
  texture.repeat.x = transform.scale?.[0] ?? 1
  texture.repeat.y = transform.scale?.[1] ?? 1
  texture.rotation = transform.rotation ?? 0
}

/**
 * 废弃的 specular-glossiness 近似为 metallic-roughness。
 *
 * @param ext 扩展
 */
export function specularGlossinessToMetallic(ext: SpecularGlossinessExt): {
  color: number[]
  metalness: number
  roughness: number
} {
  const diffuse = ext.diffuseFactor ?? [1, 1, 1, 1]
  const specular = ext.specularFactor ?? [0.04, 0.04, 0.04]
  const glossiness = ext.glossinessFactor ?? 1
  const specMax = Math.max(specular[0] ?? 0, specular[1] ?? 0, specular[2] ?? 0)
  const metalness = specMax > 0.04 ? Math.min(1, (specMax - 0.04) / 0.96) : 0
  return {
    color: [diffuse[0] ?? 1, diffuse[1] ?? 1, diffuse[2] ?? 1, diffuse[3] ?? 1],
    metalness,
    roughness: 1 - glossiness,
  }
}

function colorFromRgb(rgb: number[]): Color {
  return new Color(rgb[0] ?? 1, rgb[1] ?? 1, rgb[2] ?? 1, 1)
}

/** WebGL sampler 常量 → three.js 风格 */
export function mapSamplerWrap(value: number | undefined): number {
  if (value === 10497) {
    return RepeatWrapping
  }
  if (value === 33648) {
    return 1002
  }
  return 1001
}

export function mapSamplerFilter(value: number | undefined): number {
  if (value === 9728) {
    return NearestFilter
  }
  return LinearFilter
}
