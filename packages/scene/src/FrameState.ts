/**
 * 每帧状态。对标 Cesium `FrameState`，删除 commandList / 多视锥 / 2D。
 */
import {
  Cartesian2,
  type Cartesian3,
  type Clock,
  type CullingVolume,
  JulianDate,
  type Request,
} from "@webgpu-cesium/core"
import type { RenderItem } from "@webgpu-cesium/renderer"
import type { Camera } from "./Camera"
import type { CreditDisplay } from "./CreditDisplay"

export interface FrameStatePasses {
  render: boolean
  pick: boolean
}

export interface FrameStateStatistics {
  cpuFrameTimeMs: number
  tilesSelected: number
  tilesRendered: number
  tilesLoaded: number
  tilesRequested: number
  renderItemCount: number
  pipelineCount: number
}

/**
 * Scene 每帧写入、图元读取的共享状态。
 */
export class FrameState {
  frameNumber = 0
  time = JulianDate.now()
  camera: Camera
  cullingVolume: CullingVolume | undefined
  pixelRatio = 1
  viewport = new Cartesian2(1, 1)
  drawingBufferWidth = 1
  drawingBufferHeight = 1
  passes: FrameStatePasses = { render: true, pick: false }
  lightDirectionWC: Cartesian3 | undefined
  creditDisplay: CreditDisplay | undefined
  afterRender: (() => void)[] = []
  renderItems: RenderItem[] = []
  clock: Clock | undefined
  maximumScreenSpaceError = 2
  statistics: FrameStateStatistics = {
    cpuFrameTimeMs: 0,
    tilesSelected: 0,
    tilesRendered: 0,
    tilesLoaded: 0,
    tilesRequested: 0,
    renderItemCount: 0,
    pipelineCount: 0,
  }
  pendingRequests: Request[] = []

  /**
   * @param camera 本帧相机
   */
  constructor(camera: Camera) {
    this.camera = camera
  }
}
