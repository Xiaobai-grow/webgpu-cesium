/**
 * 最小 Viewer：挂载 canvas、创建 Scene、Credit 与性能条。
 */
import { GpuDevice } from "@webgpu-cesium/rhi"
import {
  Globe,
  OpenStreetMapImageryProvider,
  PerformanceDisplay,
  Scene,
  type GlobeOptions,
} from "@webgpu-cesium/scene"

export interface CesiumViewerOptions {
  container: HTMLElement
  canvas?: HTMLCanvasElement
  globe?: Globe
  globeOptions?: GlobeOptions
  requestRenderMode?: boolean
  useOsm?: boolean
}

/**
 * 画布挂载 + 场景生命周期。
 */
export class CesiumViewer {
  readonly scene: Scene
  readonly canvas: HTMLCanvasElement
  readonly creditContainer: HTMLElement
  readonly performanceContainer: HTMLElement
  private readonly _device: GpuDevice
  private readonly _performance: PerformanceDisplay
  private readonly _ownsCanvas: boolean
  private _raf = 0
  private _disposed = false

  private constructor(
    device: GpuDevice,
    canvas: HTMLCanvasElement,
    scene: Scene,
    creditContainer: HTMLElement,
    performanceContainer: HTMLElement,
    ownsCanvas: boolean,
  ) {
    this._device = device
    this.canvas = canvas
    this.scene = scene
    this.creditContainer = creditContainer
    this.performanceContainer = performanceContainer
    this._ownsCanvas = ownsCanvas
    this._performance = new PerformanceDisplay(performanceContainer)
    const loop = (): void => {
      if (this._disposed) {
        return
      }
      this.scene.render()
      this.scene.creditDisplay.updateContainer(this.creditContainer)
      this._performance.update(this.scene.frameState.statistics)
      this._raf = requestAnimationFrame(loop)
    }
    this._raf = requestAnimationFrame(loop)
  }

  /**
   * 异步创建。
   *
   * @param options 容器
   */
  static async create(options: CesiumViewerOptions): Promise<CesiumViewer> {
    const device = await GpuDevice.create({ label: "viewer" })
    let canvas = options.canvas
    let ownsCanvas = false
    if (!canvas) {
      canvas = document.createElement("canvas")
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      options.container.appendChild(canvas)
      ownsCanvas = true
    }
    const globe = options.globe ?? new Globe(options.globeOptions)
    if (options.useOsm !== false && globe.imageryLayers.length === 0) {
      globe.imageryLayers.addImageryProvider(new OpenStreetMapImageryProvider())
    }
    const scene = new Scene({
      canvas,
      device,
      globe,
      ...(options.requestRenderMode !== undefined
        ? { requestRenderMode: options.requestRenderMode }
        : {}),
    })
    const credit = document.createElement("div")
    credit.className = "webgpu-cesium-credits"
    credit.setAttribute("data-testid", "globe-credits")
    const perf = document.createElement("div")
    perf.className = "webgpu-cesium-perf"
    perf.setAttribute("data-testid", "globe-perf")
    options.container.appendChild(credit)
    options.container.appendChild(perf)
    return new CesiumViewer(device, canvas, scene, credit, perf, ownsCanvas)
  }

  destroy(): void {
    if (this._disposed) {
      return
    }
    this._disposed = true
    cancelAnimationFrame(this._raf)
    this.scene.destroy()
    this._device.destroy()
    this.creditContainer.remove()
    this.performanceContainer.remove()
    if (this._ownsCanvas) {
      this.canvas.remove()
    }
  }
}
