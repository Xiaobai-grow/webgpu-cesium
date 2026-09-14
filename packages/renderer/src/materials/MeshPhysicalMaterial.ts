/**
 * MeshPhysicalMaterial：Standard + 清漆等（M5 glTF 映射）。
 */
import { MeshStandardMaterial, type MeshStandardMaterialOptions } from "./MeshStandardMaterial"

export interface MeshPhysicalMaterialOptions extends MeshStandardMaterialOptions {
  clearcoat?: number
  clearcoatRoughness?: number
  ior?: number
  transmission?: number
}

export class MeshPhysicalMaterial extends MeshStandardMaterial {
  clearcoat: number
  clearcoatRoughness: number
  ior: number
  transmission: number

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
    this.defines.MATERIAL_PHYSICAL = 1
  }

  override packUniforms(out: ArrayBuffer): void {
    super.packUniforms(out)
    const f32 = new Float32Array(out)
    f32[13] = this.clearcoat
    f32[14] = this.clearcoatRoughness
    f32[15] = this.ior
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
    return target
  }
}
