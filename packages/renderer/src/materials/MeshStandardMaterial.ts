/**
 * MeshStandardMaterial：金属-粗糙度，写 G-buffer。
 */
import { Color } from "@webgpu-cesium/core"
import { Material, type MaterialOptions } from "./Material"
import type { Texture } from "../textures/Texture"

export interface MeshStandardMaterialOptions extends MaterialOptions {
  color?: Color
  roughness?: number
  metalness?: number
  map?: Texture
  normalMap?: Texture
  emissive?: Color
  emissiveIntensity?: number
  envMapIntensity?: number
  aoMapIntensity?: number
}

export class MeshStandardMaterial extends Material {
  color: Color
  roughness: number
  metalness: number
  map: Texture | undefined
  normalMap: Texture | undefined
  emissive: Color
  emissiveIntensity: number
  envMapIntensity: number
  aoMapIntensity: number

  /**
   * @param options PBR 参数
   */
  constructor(options: MeshStandardMaterialOptions = {}) {
    super(options)
    this.type = "MeshStandardMaterial"
    this.color = options.color ?? new Color(1, 1, 1, 1)
    this.roughness = options.roughness ?? 1
    this.metalness = options.metalness ?? 0
    this.map = options.map
    this.normalMap = options.normalMap
    this.emissive = options.emissive ?? new Color(0, 0, 0, 1)
    this.emissiveIntensity = options.emissiveIntensity ?? 1
    this.envMapIntensity = options.envMapIntensity ?? 1
    this.aoMapIntensity = options.aoMapIntensity ?? 1
    if (this.map) {
      this.defines.HAS_MAP = 1
    }
    if (this.normalMap) {
      this.defines.HAS_NORMAL_MAP = 1
    }
  }

  override packUniforms(out: ArrayBuffer): void {
    const f32 = new Float32Array(out)
    f32[0] = this.color.red
    f32[1] = this.color.green
    f32[2] = this.color.blue
    f32[3] = this.color.alpha
    f32[4] = this.emissive.red
    f32[5] = this.emissive.green
    f32[6] = this.emissive.blue
    f32[7] = this.emissiveIntensity
    f32[8] = this.roughness
    f32[9] = this.metalness
    f32[10] = this.opacity
    f32[11] = this.aoMapIntensity
    f32[12] = this.envMapIntensity
    f32[19] = 2
  }

  override clone(): MeshStandardMaterial {
    return this.copy(new MeshStandardMaterial())
  }

  override copy(target: MeshStandardMaterial): MeshStandardMaterial {
    super.copy(target)
    target.color = this.color.clone() ?? new Color(1, 1, 1, 1)
    target.roughness = this.roughness
    target.metalness = this.metalness
    target.map = this.map
    target.normalMap = this.normalMap
    target.emissive = this.emissive.clone() ?? new Color(0, 0, 0, 1)
    target.emissiveIntensity = this.emissiveIntensity
    target.envMapIntensity = this.envMapIntensity
    target.aoMapIntensity = this.aoMapIntensity
    return target
  }
}
