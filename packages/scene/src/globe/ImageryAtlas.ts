/**
 * texture_2d_array 影像图集：分配 / 释放 layer，ImageBitmap 上传。
 */
import { makeLabel, type GpuDevice } from "@webgpu-cesium/rhi"

const PACKAGE_LABEL = "scene"

export interface ImageryAtlasOptions {
  tileSize?: number
  layerCount?: number
}

/**
 * 每层影像一个 array；M2 单层影像共用一个图集。
 */
export class ImageryAtlas {
  readonly tileSize: number
  readonly layerCount: number
  readonly texture: GPUTexture
  readonly sampler: GPUSampler
  private readonly _free: number[] = []
  private readonly _used = new Set<number>()

  /**
   * @param device GpuDevice
   * @param options 尺寸与层数
   */
  constructor(device: GpuDevice, options?: ImageryAtlasOptions) {
    this.tileSize = options?.tileSize ?? 256
    const maxLayers = Math.min(device.limits.maxTextureArrayLayers, options?.layerCount ?? 256)
    this.layerCount = Math.max(1, maxLayers)
    for (let i = 0; i < this.layerCount; i++) {
      this._free.push(i)
    }
    this.texture = device.device.createTexture({
      label: makeLabel("ImageryAtlas", "array", PACKAGE_LABEL),
      size: { width: this.tileSize, height: this.tileSize, depthOrArrayLayers: this.layerCount },
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    })
    this.sampler = device.samplers.get({
      label: makeLabel("ImageryAtlas", "sampler", PACKAGE_LABEL),
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    })
  }

  get usedCount(): number {
    return this._used.size
  }

  /**
   * 分配一层；满则返回 undefined。
   */
  allocate(): number | undefined {
    const layer = this._free.pop()
    if (layer === undefined) {
      return undefined
    }
    this._used.add(layer)
    return layer
  }

  /**
   * 释放一层。
   *
   * @param layer 层号
   */
  free(layer: number): void {
    if (!this._used.has(layer)) {
      return
    }
    this._used.delete(layer)
    this._free.push(layer)
  }

  /**
   * 上传 ImageBitmap 到指定层。
   *
   * @param device GpuDevice
   * @param layer 层号
   * @param image 图像
   */
  upload(
    device: GpuDevice,
    layer: number,
    image: ImageBitmap | HTMLCanvasElement | OffscreenCanvas,
  ): void {
    const width = Math.min(this.tileSize, "width" in image ? image.width : this.tileSize)
    const height = Math.min(this.tileSize, "height" in image ? image.height : this.tileSize)
    device.device.queue.copyExternalImageToTexture(
      { source: image, flipY: false },
      { texture: this.texture, origin: { x: 0, y: 0, z: layer } },
      { width, height },
    )
  }

  destroy(): void {
    this.texture.destroy()
    this._used.clear()
    this._free.length = 0
  }
}
