/**
 * 瓦片内容基接口。
 */
import type { FrameUniformsBuffer, RenderItem } from "@webgpu-cesium/renderer"
import type { GpuDevice } from "@webgpu-cesium/rhi"
import type { Cesium3DTileFeature } from "../feature/Cesium3DTileFeature"
import type { Model } from "../model/Model"

export const Cesium3DTileContentState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
  EXPIRED: 5,
} as const

export type Cesium3DTileContentStateValue =
  (typeof Cesium3DTileContentState)[keyof typeof Cesium3DTileContentState]

export interface Cesium3DTileContent {
  readonly ready: boolean
  readonly featuresLength: number
  readonly bytes: number
  readonly model: Model | undefined
  getFeature(index: number): Cesium3DTileFeature | undefined
  initialize(device: GpuDevice, frameUniforms: FrameUniformsBuffer): void
  createRenderItems(device: GpuDevice, frameUniforms: FrameUniformsBuffer): RenderItem[]
  destroy(): void
}

export class Empty3DTileContent implements Cesium3DTileContent {
  readonly ready = true
  readonly featuresLength = 0
  readonly bytes = 0
  readonly model = undefined

  getFeature(_index: number): undefined {
    return undefined
  }

  initialize(): void {
    void this.bytes
  }

  createRenderItems(): RenderItem[] {
    return []
  }

  destroy(): void {
    void this.ready
  }
}
