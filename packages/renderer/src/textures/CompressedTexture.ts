/**
 * CompressedTexture：KTX2 转码结果占位（按 device.features 选 BC / ETC2 / ASTC）。
 */
import { Texture, type TextureOptions } from "./Texture"

export interface CompressedTextureOptions extends TextureOptions {
  transcodeTarget?: "bc" | "etc2" | "astc" | "rgba"
}

/**
 * 压缩纹理。M5 若未转码则仍可走 rgba8 回退源。
 */
export class CompressedTexture extends Texture {
  transcodeTarget: "bc" | "etc2" | "astc" | "rgba"

  /**
   * @param options 源与目标格式
   */
  constructor(options: CompressedTextureOptions = {}) {
    super(options)
    this.transcodeTarget = options.transcodeTarget ?? "rgba"
  }
}
