/**
 * GpuDevice：WebGPU 设备初始化、能力探测、canvas 配置、设备丢失事件与缓存持有者。
 *
 * 约定（见 docs/10-architecture/03-rhi-and-render-graph.md）：
 * - 设备初始化异步且只做一次：`const device = await GpuDevice.create()`；
 * - 设备描述符保守：只请求白名单内且适配器支持的可选 feature；
 * - `device.lost` 触发 `onLost`，不做自动重建；
 * - 错误文案见 docs/20-tech-stack/03-browser-support.md 第 2 节。
 */
import { Event, RuntimeError } from "@webgpu-cesium/core"
import { BindGroupLayoutCache } from "./caches/BindGroupLayoutCache"
import { PipelineCache } from "./caches/PipelineCache"
import { SamplerCache } from "./caches/SamplerCache"
import { ShaderModuleCache } from "./caches/ShaderModuleCache"
import { OPTIONAL_FEATURE_WHITELIST, selectSupportedFeatures } from "./features"
import { makeLabel } from "./labels"

export interface GpuDeviceOptions {
  /** 设备标签后缀，默认 "main" */
  label?: string
  /** 适配器偏好 */
  powerPreference?: GPUPowerPreference
  /** 可选 feature 白名单，默认 OPTIONAL_FEATURE_WHITELIST */
  optionalFeatures?: readonly string[]
  /** 需要提升的 limits（失败时抛错，调用方可降级重试） */
  requiredLimits?: Record<string, number>
  /** 注入 `GPU` 对象（测试或非浏览器宿主），默认 `navigator.gpu`；传 `null` 表示明确不可用 */
  gpu?: GPU | null
}

export interface CanvasConfiguration {
  /** 默认 `canvasFormat` */
  format?: GPUTextureFormat
  /** 默认 RENDER_ATTACHMENT */
  usage?: GPUTextureUsageFlags
  /** 默认 "opaque" */
  alphaMode?: GPUCanvasAlphaMode
  /** 默认 "srgb" */
  colorSpace?: PredefinedColorSpace
}

/** `GpuDevice.probe()` 的结果，供错误面板显示 */
export interface GpuProbeResult {
  supported: boolean
  adapterInfo?: GPUAdapterInfo
  isCompatibilityMode?: boolean
  reason?: string
}

/** 把 adapter.info 格式化成一行，附在错误信息后 */
export function describeAdapterInfo(info: GPUAdapterInfo | undefined): string {
  if (!info) {
    return "adapter info unavailable"
  }
  const parts = [info.vendor, info.architecture, info.device, info.description].filter(
    (part) => part.length > 0,
  )
  return parts.length > 0 ? parts.join(" / ") : "adapter info empty"
}

/** compatibility mode 判定：显式标志优先；标志存在但缺 core feature 也视为 compat */
function isCompatibilityAdapter(adapter: GPUAdapter): boolean {
  const flag = (adapter as GPUAdapter & { isCompatibilityMode?: boolean }).isCompatibilityMode
  if (flag === true) {
    return true
  }
  if (flag === false) {
    return !adapter.features.has("core-features-and-limits")
  }
  return false
}

let deviceCounter = 0

export class GpuDevice {
  readonly adapter: GPUAdapter
  readonly device: GPUDevice
  readonly adapterInfo: GPUAdapterInfo
  /** 已启用的 feature（与 `device.features` 相同，暴露为 Set<string> 便于上层判断） */
  readonly features: ReadonlySet<string>
  readonly limits: GPUSupportedLimits
  readonly canvasFormat: GPUTextureFormat
  readonly label: string

  /** 设备丢失事件；参数为 `GPUDeviceLostInfo` */
  readonly onLost = new Event<[GPUDeviceLostInfo]>()

  readonly pipelines: PipelineCache
  readonly bindGroupLayouts: BindGroupLayoutCache
  readonly samplers: SamplerCache
  readonly shaderModules: ShaderModuleCache

  private destroyed = false
  private readonly configuredContexts = new Set<GPUCanvasContext>()

  private constructor(
    gpu: GPU,
    adapter: GPUAdapter,
    device: GPUDevice,
    adapterInfo: GPUAdapterInfo,
    label: string,
  ) {
    this.adapter = adapter
    this.device = device
    this.adapterInfo = adapterInfo
    this.features = new Set<string>(device.features as Iterable<string>)
    this.limits = device.limits
    this.canvasFormat = gpu.getPreferredCanvasFormat()
    this.label = label

    this.bindGroupLayouts = new BindGroupLayoutCache(device)
    this.pipelines = new PipelineCache(device)
    this.samplers = new SamplerCache(device)
    this.shaderModules = new ShaderModuleCache(device)

    // 设备丢失：转发为事件；不自动重建
    void device.lost.then((info) => {
      this.destroyed = true
      this.onLost.raiseEvent(info)
    })
  }

  /**
   * 探测 WebGPU 可用性（不创建设备），用于错误面板与能力展示。
   */
  static async probe(gpu: GPU | undefined = globalThis.navigator?.gpu): Promise<GpuProbeResult> {
    if (!gpu) {
      return { supported: false, reason: "WebGPU is not supported by this browser" }
    }
    let adapter: GPUAdapter | null
    try {
      adapter = await gpu.requestAdapter()
    } catch (error) {
      return { supported: false, reason: error instanceof Error ? error.message : String(error) }
    }
    if (!adapter) {
      return { supported: false, reason: "No WebGPU adapter available" }
    }
    const compat = isCompatibilityAdapter(adapter)
    return {
      supported: !compat,
      adapterInfo: adapter.info,
      isCompatibilityMode: compat,
      ...(compat ? { reason: "Compatibility mode adapters are not supported" } : {}),
    }
  }

  /**
   * 创建设备。失败时抛 `RuntimeError`，文案与 03-browser-support.md 一致。
   */
  static async create(options: GpuDeviceOptions = {}): Promise<GpuDevice> {
    const gpu = options.gpu === undefined ? globalThis.navigator?.gpu : options.gpu
    if (!gpu) {
      throw new RuntimeError("WebGPU is not supported by this browser")
    }

    const adapterOptions: GPURequestAdapterOptions = {}
    if (options.powerPreference !== undefined) {
      adapterOptions.powerPreference = options.powerPreference
    }
    const adapter = await gpu.requestAdapter(adapterOptions)
    if (!adapter) {
      throw new RuntimeError(
        "No WebGPU adapter available (GPU disabled, blocklisted, or remote desktop?)",
      )
    }

    const info = adapter.info
    if (isCompatibilityAdapter(adapter)) {
      throw new RuntimeError(
        `WebGPU compatibility mode adapters are not supported (${describeAdapterInfo(info)})`,
      )
    }

    const requiredFeatures = selectSupportedFeatures(
      adapter.features,
      options.optionalFeatures ?? OPTIONAL_FEATURE_WHITELIST,
    )

    const label = makeLabel("GpuDevice", options.label ?? `main-${String(deviceCounter++)}`)
    const descriptor: GPUDeviceDescriptor = {
      label,
      requiredFeatures,
      defaultQueue: { label: `${label}/queue` },
    }
    if (options.requiredLimits !== undefined) {
      descriptor.requiredLimits = options.requiredLimits
    }

    let device: GPUDevice
    try {
      device = await adapter.requestDevice(descriptor)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new RuntimeError(
        `Failed to create WebGPU device: ${reason} (adapter: ${describeAdapterInfo(info)})`,
        { cause: error },
      )
    }

    return new GpuDevice(gpu, adapter, device, info, label)
  }

  /** 设备是否已销毁或丢失 */
  get isDestroyed(): boolean {
    return this.destroyed
  }

  /**
   * 配置 canvas 并返回其 `GPUCanvasContext`。重复调用会用新参数重新配置。
   */
  configureCanvas(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    options: CanvasConfiguration = {},
  ): GPUCanvasContext {
    this.assertAlive()
    const context = canvas.getContext("webgpu")
    if (!context) {
      throw new RuntimeError("Failed to get a WebGPU canvas context")
    }
    context.configure({
      device: this.device,
      format: options.format ?? this.canvasFormat,
      usage: options.usage ?? GPUTextureUsage.RENDER_ATTACHMENT,
      alphaMode: options.alphaMode ?? "opaque",
      colorSpace: options.colorSpace ?? "srgb",
    })
    this.configuredContexts.add(context)
    return context
  }

  /** 释放缓存与设备。销毁后再调用任何方法都会抛错。 */
  destroy(): void {
    if (this.destroyed) {
      return
    }
    this.destroyed = true
    for (const context of this.configuredContexts) {
      context.unconfigure()
    }
    this.configuredContexts.clear()
    this.pipelines.clear()
    this.bindGroupLayouts.clear()
    this.samplers.clear()
    this.shaderModules.clear()
    this.device.destroy()
  }

  private assertAlive(): void {
    if (this.destroyed) {
      throw new RuntimeError("GpuDevice has been destroyed or lost")
    }
  }
}
