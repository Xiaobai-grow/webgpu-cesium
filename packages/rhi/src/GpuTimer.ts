/**
 * GpuTimer：可选 timestamp-query。默认不开启（M4 待验证开销后再作为面板默认项）。
 */
import { makeLabel } from "./labels"
import type { GpuDevice } from "./GpuDevice"

const PACKAGE_LABEL = "rhi"

export interface GpuTimerResult {
  pass: string
  milliseconds: number
}

/**
 * 每 pass 一对 begin/end timestamp。feature 不可用时全部方法为空操作。
 */
export class GpuTimer {
  readonly supported: boolean
  private querySet: GPUQuerySet | undefined
  private resolveBuffer: GPUBuffer | undefined
  private readBuffer: GPUBuffer | undefined
  private labels: string[] = []
  private capacity = 0

  /**
   * @param device GpuDevice
   */
  constructor(private readonly device: GpuDevice) {
    this.supported = device.features.has("timestamp-query")
  }

  /**
   * 为即将执行的 pass 列表准备 query set。
   *
   * @param passNames 存活 pass
   */
  beginFrame(passNames: readonly string[]): GPUComputePassTimestampWrites | undefined {
    if (!this.supported || passNames.length === 0) {
      return undefined
    }
    this.labels = [...passNames]
    const count = passNames.length * 2
    if (this.capacity < count) {
      this.querySet?.destroy()
      this.resolveBuffer?.destroy()
      this.readBuffer?.destroy()
      this.querySet = this.device.device.createQuerySet({
        label: makeLabel("GpuTimer", "querySet", PACKAGE_LABEL),
        type: "timestamp",
        count,
      })
      const bytes = count * 8
      this.resolveBuffer = this.device.device.createBuffer({
        label: makeLabel("GpuTimer", "resolve", PACKAGE_LABEL),
        size: bytes,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      })
      this.readBuffer = this.device.device.createBuffer({
        label: makeLabel("GpuTimer", "read", PACKAGE_LABEL),
        size: bytes,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      })
      this.capacity = count
    }
    return undefined
  }

  /**
   * 某 pass 的 timestampWrites（render / compute 描述符）。
   *
   * @param passIndex 顺序
   */
  writesFor(passIndex: number): GPURenderPassTimestampWrites | undefined {
    if (!this.supported || !this.querySet) {
      return undefined
    }
    return {
      querySet: this.querySet,
      beginningOfPassWriteIndex: passIndex * 2,
      endOfPassWriteIndex: passIndex * 2 + 1,
    }
  }

  /**
   * 解析并读回。调用方须在 queue.submit 之后 await。
   *
   * @param encoder 本帧 encoder（submit 前调用）
   */
  resolve(encoder: GPUCommandEncoder): void {
    if (!this.querySet || !this.resolveBuffer || !this.readBuffer) {
      return
    }
    const count = this.labels.length * 2
    encoder.resolveQuerySet(this.querySet, 0, count, this.resolveBuffer, 0)
    encoder.copyBufferToBuffer(this.resolveBuffer, 0, this.readBuffer, 0, count * 8)
  }

  /**
   * 读毫秒。
   */
  async read(): Promise<GpuTimerResult[]> {
    if (!this.readBuffer || this.labels.length === 0) {
      return []
    }
    await this.readBuffer.mapAsync(GPUMapMode.READ)
    const data = new BigInt64Array(this.readBuffer.getMappedRange().slice(0))
    this.readBuffer.unmap()
    const period = 1
    const results: GpuTimerResult[] = []
    for (let i = 0; i < this.labels.length; i++) {
      const begin = data[i * 2]
      const end = data[i * 2 + 1]
      if (begin === undefined || end === undefined) {
        continue
      }
      results.push({
        pass: this.labels[i]!,
        milliseconds: (Number(end - begin) * period) / 1e6,
      })
    }
    return results
  }

  destroy(): void {
    this.querySet?.destroy()
    this.resolveBuffer?.destroy()
    this.readBuffer?.destroy()
    this.querySet = undefined
    this.resolveBuffer = undefined
    this.readBuffer = undefined
  }
}
