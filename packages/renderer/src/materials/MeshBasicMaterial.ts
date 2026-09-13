/**
 * MeshBasicMaterial：无光照，延迟 pass 按 MATERIAL_ID_UNLIT 直出。
 */
import { Color } from "@webgpu-cesium/core"
import { Material, type MaterialOptions } from "./Material"
import type { Texture } from "../textures/Texture"

export interface MeshBasicMaterialOptions extends MaterialOptions {
  color?: Color
  map?: Texture
}

export class MeshBasicMaterial extends Material {
  color: Color
  map: Texture | undefined

  /**
   * @param options 颜色 / 贴图
   */
  constructor(options: MeshBasicMaterialOptions = {}) {
    super(options)
    this.type = "MeshBasicMaterial"
    this.color = options.color ?? new Color(1, 1, 1, 1)
    this.map = options.map
    if (this.map) {
      this.defines.HAS_MAP = 1
    }
  }

  override packUniforms(out: ArrayBuffer): void {
    const f32 = new Float32Array(out)
    f32[0] = this.color.red
    f32[1] = this.color.green
    f32[2] = this.color.blue
    f32[3] = this.color.alpha
    f32[8] = 1
    f32[9] = 0
    f32[10] = this.opacity
    f32[11] = 1
    f32[19] = 3
  }

  override clone(): MeshBasicMaterial {
    return this.copy(new MeshBasicMaterial())
  }

  override copy(target: MeshBasicMaterial): MeshBasicMaterial {
    super.copy(target)
    target.color = this.color.clone() ?? new Color(1, 1, 1, 1)
    target.map = this.map
    return target
  }
}
