/**
 * ReadbackQueue：异步 GPU 读回。像素断言继续走 renderer.copyTextureToBuffer。
 */
import { makeLabel } from "./labels"
import type { GpuDevice } from "./GpuDevice"

const PACKAGE_LABEL = "rhi"

export interface ReadTextureOptions {
  width?: number
  height?: number
  bytesPerRow?: number
}

/**
 * 把 texture / buffer 拷到 MAP_READ staging。
 */
export class ReadbackQueue {
  /**
   * @param device GpuDevice
   */
  constructor(private readonly device: GpuDevice) {}

  /**
   * 读回一块 buffer。
   *
   * @param buffer 源
   * @param size 字节
   */
  async readBuffer(buffer: GPUBuffer, size: number): Promise<ArrayBuffer> {
    const staging = this.device.device.createBuffer({
      label: makeLabel("ReadbackQueue", "buffer", PACKAGE_LABEL),
      size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })
    const encoder = this.device.device.createCommandEncoder({
      label: makeLabel("ReadbackQueue", "encoder", PACKAGE_LABEL),
    })
    encoder.copyBufferToBuffer(buffer, 0, staging, 0, size)
    this.device.device.queue.submit([encoder.finish()])
    await staging.mapAsync(GPUMapMode.READ)
    const copy = staging.getMappedRange().slice(0)
    staging.unmap()
    staging.destroy()
    return copy
  }

  /**
   * 读回纹理（调用方保证 COPY_SRC）。bytesPerRow 须 256 对齐。
   *
   * @param texture 源
   * @param options 区域
   */
  async readTexture(texture: GPUTexture, options: ReadTextureOptions = {}): Promise<Uint8Array> {
    const width = options.width ?? texture.width
    const height = options.height ?? texture.height
    const bytesPerRow = options.bytesPerRow ?? Math.ceil((width * 4) / 256) * 256
    const staging = this.device.device.createBuffer({
      label: makeLabel("ReadbackQueue", "texture", PACKAGE_LABEL),
      size: bytesPerRow * height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })
    const encoder = this.device.device.createCommandEncoder({
      label: makeLabel("ReadbackQueue", "tex-encoder", PACKAGE_LABEL),
    })
    encoder.copyTextureToBuffer({ texture }, { buffer: staging, bytesPerRow }, { width, height })
    this.device.device.queue.submit([encoder.finish()])
    await staging.mapAsync(GPUMapMode.READ)
    const copy = new Uint8Array(staging.getMappedRange().slice(0))
    staging.unmap()
    staging.destroy()
    return copy
  }
}
