/**
 * MeshPhysicalMaterial：Standard + KHR_materials_*（M5 glTF 映射）。
 */
import { Color } from "@webgpu-cesium/core"
import { MeshStandardMaterial, type MeshStandardMaterialOptions } from "./MeshStandardMaterial"

export interface MeshPhysicalMaterialOptions extends MeshStandardMaterialOptions {
  clearcoat?: number
  clearcoatRoughness?: number
  ior?: number
  transmission?: number
  thickness?: number
  attenuationDistance?: number
  attenuationColor?: Color
  sheen?: number
  sheenColor?: Color
  sheenRoughness?: number
  specularIntensity?: number
  specularColor?: Color
  iridescence?: number
  iridescenceIOR?: number
  iridescenceThicknessRange?: [number, number]
  anisotropy?: number
  anisotropyRotation?: number
  dispersion?: number
}

export class MeshPhysicalMaterial extends MeshStandardMaterial {
  clearcoat: number
  clearcoatRoughness: number
  ior: number
  transmission: number
  thickness: number
  attenuationDistance: number
  attenuationColor: Color
  sheen: number
  sheenColor: Color
  sheenRoughness: number
  specularIntensity: number
  specularColor: Color
  iridescence: number
  iridescenceIOR: number
  iridescenceThicknessRange: [number, number]
  anisotropy: number
  anisotropyRotation: number
  dispersion: number

  /**
   * @param options 物理扩展
   */
  constructor(options: MeshPhysicalMaterialOptions = {}) {
    super(options)
    this.type = "MeshPhysicalMaterial"
    this.clearcoat = options.clearcoat ?? 0
    this.clearcoatRoughness = options.clearcoatRoughness ?? 0
    this.ior = options.ior ?? 1.5
    this.transmission = options.transmission ?? 0
    this.thickness = options.thickness ?? 0
    this.attenuationDistance = options.attenuationDistance ?? Infinity
    this.attenuationColor = options.attenuationColor ?? new Color(1, 1, 1, 1)
    this.sheen = options.sheen ?? 0
    this.sheenColor = options.sheenColor ?? new Color(0, 0, 0, 1)
    this.sheenRoughness = options.sheenRoughness ?? 1
    this.specularIntensity = options.specularIntensity ?? 1
    this.specularColor = options.specularColor ?? new Color(1, 1, 1, 1)
    this.iridescence = options.iridescence ?? 0
    this.iridescenceIOR = options.iridescenceIOR ?? 1.3
    this.iridescenceThicknessRange = options.iridescenceThicknessRange ?? [100, 400]
    this.anisotropy = options.anisotropy ?? 0
    this.anisotropyRotation = options.anisotropyRotation ?? 0
    this.dispersion = options.dispersion ?? 0
    this.defines.MATERIAL_PHYSICAL = 1
    if (this.transmission > 0) {
      this.transparent = true
    }
  }

  override get isTransparentPass(): boolean {
    return super.isTransparentPass || this.transmission > 0
  }

  override packUniforms(out: ArrayBuffer): void {
    super.packUniforms(out)
    const f32 = new Float32Array(out)
    f32[13] = this.clearcoat
    f32[14] = this.clearcoatRoughness
    f32[15] = this.ior
    f32[16] = this.sheen
    f32[17] = this.iridescence
    f32[18] = this.transmission
    f32[19] = 4
  }

  override clone(): MeshPhysicalMaterial {
    return this.copy(new MeshPhysicalMaterial())
  }

  override copy(target: MeshPhysicalMaterial): MeshPhysicalMaterial {
    super.copy(target)
    target.clearcoat = this.clearcoat
    target.clearcoatRoughness = this.clearcoatRoughness
    target.ior = this.ior
    target.transmission = this.transmission
    target.thickness = this.thickness
    target.attenuationDistance = this.attenuationDistance
    target.attenuationColor = this.attenuationColor.clone() ?? new Color(1, 1, 1, 1)
    target.sheen = this.sheen
    target.sheenColor = this.sheenColor.clone() ?? new Color(0, 0, 0, 1)
    target.sheenRoughness = this.sheenRoughness
    target.specularIntensity = this.specularIntensity
    target.specularColor = this.specularColor.clone() ?? new Color(1, 1, 1, 1)
    target.iridescence = this.iridescence
    target.iridescenceIOR = this.iridescenceIOR
    target.iridescenceThicknessRange = [...this.iridescenceThicknessRange]
    target.anisotropy = this.anisotropy
    target.anisotropyRotation = this.anisotropyRotation
    target.dispersion = this.dispersion
    return target
  }
}
