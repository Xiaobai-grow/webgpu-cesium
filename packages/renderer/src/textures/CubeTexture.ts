/**
 * 立方体贴图（IBL）。
 */
import { Texture, type TextureOptions } from "./Texture"

export class CubeTexture extends Texture {
  /**
   * @param options 与 Texture 相同；6 面由调用方写成 texture_2d_array
   */
  constructor(options: TextureOptions = {}) {
    super(options)
    this.name = options.name ?? "CubeTexture"
  }
}
