/**
 * 把 GPU 纹理拷到 CPU（`copyTextureToBuffer`）。
 *
 * 不要用 2d canvas `drawImage` 去读持续 rAF 的 WebGPU canvas：
 * `getCurrentTexture()` 会替换绘制缓冲，读到的是空图。
 */
import type { GpuDevice } from "@webgpu-cesium/rhi"
import { makeLabel } from "@webgpu-cesium/rhi"

const PACKAGE_LABEL = "renderer"

/** 字节行对齐（WebGPU 要求 256） */
export const TEXTURE_COPY_BYTES_PER_ROW_ALIGNMENT = 256

/**
 * 计算 copyTextureToBuffer 所需的 bytesPerRow。
 *
 * @param width 像素宽
 * @param bytesPerPixel 每像素字节，rgba8 / bgra8 为 4
 */
export function alignedBytesPerRow(width: number, bytesPerPixel = 4): number {
  const unaligned = width * bytesPerPixel
  return (
    Math.ceil(unaligned / TEXTURE_COPY_BYTES_PER_ROW_ALIGNMENT) *
    TEXTURE_COPY_BYTES_PER_ROW_ALIGNMENT
  )
}

export interface CopyTextureToBufferOptions {
  originX?: number
  originY?: number
  width?: number
  height?: number
}

/**
 * 同步提交拷贝并 `mapAsync` 读回紧凑 RGBA/BGRA 行（去掉 padding）。
 *
 * @param device GpuDevice
 * @param texture 源纹理（需 COPY_SRC）
 * @param options 子区域
 */
export async function copyTextureToBuffer(
  device: GpuDevice,
  texture: GPUTexture,
  options: CopyTextureToBufferOptions = {},
): Promise<Uint8Array> {
  const width = options.width ?? texture.width
  const height = options.height ?? texture.height
  const originX = options.originX ?? 0
  const originY = options.originY ?? 0
  const bytesPerRow = alignedBytesPerRow(width, 4)
  const size = bytesPerRow * height
  const gpu = device.device
  const staging = gpu.createBuffer({
    label: makeLabel("ReadbackBuffer", `${texture.label ?? "tex"}`, PACKAGE_LABEL),
    size,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  })
  const encoder = gpu.createCommandEncoder({
    label: makeLabel("ReadbackEncoder", "copyTextureToBuffer", PACKAGE_LABEL),
  })
  encoder.copyTextureToBuffer(
    { texture, origin: { x: originX, y: originY } },
    { buffer: staging, bytesPerRow },
    { width, height, depthOrArrayLayers: 1 },
  )
  gpu.queue.submit([encoder.finish()])
  await staging.mapAsync(GPUMapMode.READ)
  const mapped = new Uint8Array(staging.getMappedRange())
  const packed = new Uint8Array(width * height * 4)
  const rowBytes = width * 4
  for (let row = 0; row < height; row++) {
    packed.set(mapped.subarray(row * bytesPerRow, row * bytesPerRow + rowBytes), row * rowBytes)
  }
  staging.unmap()
  staging.destroy()
  return packed
}

/**
 * 判断像素是否「非全黑」（忽略 alpha）。
 *
 * @param pixels 紧凑 RGBA/BGRA
 * @param threshold 通道阈值，默认 8（避开清屏色 ~18 时请提高）
 */
export function hasNonBlackPixels(pixels: Uint8Array, threshold = 8): boolean {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] ?? 0
    const g = pixels[i + 1] ?? 0
    const b = pixels[i + 2] ?? 0
    if (r > threshold || g > threshold || b > threshold) {
      return true
    }
  }
  return false
}
