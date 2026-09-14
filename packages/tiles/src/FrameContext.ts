/**
 * tiles 用的帧上下文。不依赖 @webgpu-cesium/scene，由 Scene.frameState 结构满足。
 * 见 docs/10-architecture/02-packages.md「待验证」M5。
 */
import type { Cartesian3, Credit, CullingVolume } from "@webgpu-cesium/core"

/** 相机子集 */
export interface TilesetCamera {
  positionWC: Cartesian3
  directionWC: Cartesian3
  frustum: { sseDenominator: number | undefined }
}

/** 归属展示 */
export interface TilesetCreditDisplay {
  addCredit(credit: Credit): void
}

/**
 * 遍历 / 请求 / 拾取读取的帧状态。
 */
export interface FrameContext {
  frameNumber: number
  camera: TilesetCamera
  cullingVolume: CullingVolume | undefined
  drawingBufferWidth: number
  drawingBufferHeight: number
  pixelRatio: number
  maximumScreenSpaceError: number
  afterRender: (() => void)[]
  creditDisplay: TilesetCreditDisplay | undefined
  passes: { render: boolean; pick: boolean }
}
