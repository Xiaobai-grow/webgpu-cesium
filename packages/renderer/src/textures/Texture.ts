/**
 * Texture 对象（对齐 three.js；flipY 默认 false）。
 */
import { type GpuDevice, makeLabel } from "@webgpu-cesium/rhi"
import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from "../materials/constants"

export type TextureSource =
  | ImageBitmap
  | HTMLCanvasElement
  | ImageData
  | { data: ArrayBufferView; width: number; height: number }

export interface TextureOptions {
  source?: TextureSource
  wrapS?: number
  wrapT?: number
  magFilter?: number
  minFilter?: number
  format?: GPUTextureFormat
  colorSpace?: string
  flipY?: boolean
  generateMipmaps?: boolean
  name?: string
}

let textureId = 0

/**
 * 采样参数进 SamplerCache；像素进 GPUTexture（uuid+version 缓存）。
 */
export class Texture {
  readonly id: number
  readonly uuid: string
  name: string
  source: TextureSource | undefined
  wrapS: number
  wrapT: number
  magFilter: number
  minFilter: number
  format: GPUTextureFormat
  colorSpace: string
  flipY: boolean
  generateMipmaps: boolean
  needsUpdate = true
  version = 0
  offset = { x: 0, y: 0 }
  repeat = { x: 1, y: 1 }
  rotation = 0
  private gpuTexture: GPUTexture | undefined
  private refCount = 0

  /**
   * @param options 源与采样
   */
  constructor(options: TextureOptions = {}) {
    this.id = ++textureId
    this.uuid = `tex-${String(this.id)}`
    this.name = options.name ?? ""
    this.source = options.source
    this.wrapS = options.wrapS ?? ClampToEdgeWrapping
    this.wrapT = options.wrapT ?? ClampToEdgeWrapping
    this.magFilter = options.magFilter ?? LinearFilter
    this.minFilter = options.minFilter ?? LinearMipmapLinearFilter
    this.format =
      options.format ?? (options.colorSpace === SRGBColorSpace ? "rgba8unorm-srgb" : "rgba8unorm")
    this.colorSpace = options.colorSpace ?? SRGBColorSpace
    this.flipY = options.flipY ?? false
    this.generateMipmaps = options.generateMipmaps ?? false
  }

  addRef(): void {
    this.refCount++
  }

  /**
   * 上传或返回已有 GPUTexture。
   *
   * @param device 设备
   */
  acquireGpu(device: GpuDevice): GPUTexture {
    if (this.gpuTexture && !this.needsUpdate) {
      return this.gpuTexture
    }
    this.gpuTexture?.destroy()
    const size = this.sourceSize()
    const gpu = device.device
    this.gpuTexture = gpu.createTexture({
      label: makeLabel("Texture", this.uuid, "renderer"),
      size,
      format: this.format,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    })
    this.upload(device, this.gpuTexture, size)
    this.needsUpdate = false
    this.version++
    return this.gpuTexture
  }

  /**
   * GPUSampler 描述。
   */
  samplerDescriptor(): GPUSamplerDescriptor {
    return {
      addressModeU: wrapMode(this.wrapS),
      addressModeV: wrapMode(this.wrapT),
      magFilter: this.magFilter === LinearFilter ? "linear" : "nearest",
      minFilter:
        this.minFilter === LinearFilter || this.minFilter === LinearMipmapLinearFilter
          ? "linear"
          : "nearest",
    }
  }

  dispose(): void {
    this.refCount = Math.max(0, this.refCount - 1)
    if (this.refCount === 0) {
      this.gpuTexture?.destroy()
      this.gpuTexture = undefined
    }
  }

  private sourceSize(): { width: number; height: number } {
    const source = this.source
    if (!source) {
      return { width: 1, height: 1 }
    }
    if ("width" in source && "height" in source) {
      return { width: source.width, height: source.height }
    }
    return { width: 1, height: 1 }
  }

  private upload(
    device: GpuDevice,
    texture: GPUTexture,
    size: { width: number; height: number },
  ): void {
    const source = this.source
    if (!source) {
      const pixel = new Uint8Array([255, 255, 255, 255])
      device.device.queue.writeTexture({ texture }, pixel, { bytesPerRow: 4 }, size)
      return
    }
    if ("data" in source) {
      device.device.queue.writeTexture(
        { texture },
        source.data,
        { bytesPerRow: size.width * 4 },
        size,
      )
      return
    }
    device.device.queue.copyExternalImageToTexture({ source, flipY: this.flipY }, { texture }, size)
  }
}

function wrapMode(value: number): GPUAddressMode {
  if (value === RepeatWrapping) {
    return "repeat"
  }
  if (value === 1002) {
    return "mirror-repeat"
  }
  return "clamp-to-edge"
}

let defaultWhite: Texture | undefined
let defaultNormal: Texture | undefined

/**
 * 1×1 白。
 */
export function defaultWhiteTexture(): Texture {
  defaultWhite ??= new Texture({
    source: { data: new Uint8Array([255, 255, 255, 255]), width: 1, height: 1 },
    colorSpace: SRGBColorSpace,
    name: "default-white",
  })
  return defaultWhite
}

/**
 * 1×1 平直法线。
 */
export function defaultNormalTexture(): Texture {
  defaultNormal ??= new Texture({
    source: { data: new Uint8Array([128, 128, 255, 255]), width: 1, height: 1 },
    colorSpace: "",
    format: "rgba8unorm",
    name: "default-normal",
  })
  return defaultNormal
}
