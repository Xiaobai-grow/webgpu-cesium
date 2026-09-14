/**
 * Render Graph 公开类型。
 */
import type { GpuDevice } from "@webgpu-cesium/rhi"
import type { RenderItem } from "../RenderItem"

declare const TEXTURE_HANDLE_BRAND: unique symbol

/** 纹理资源句柄：编译前的逻辑 ID，执行时才解析成真实 GPUTextureView */
export interface TextureHandle {
  readonly [TEXTURE_HANDLE_BRAND]: true
  readonly id: number
  readonly name: string
}

/** 瞬态纹理描述（帧图分配并跨帧复用 / 别名） */
export interface TransientTextureDescriptor {
  width: number
  height: number
  format: GPUTextureFormat
  /** 默认 RENDER_ATTACHMENT | TEXTURE_BINDING */
  usage?: GPUTextureUsageFlags
  sampleCount?: number
  depthOrArrayLayers?: number
}

export interface ColorAttachmentOptions {
  /** 默认 "clear" */
  loadOp?: GPULoadOp
  /** 默认 "store" */
  storeOp?: GPUStoreOp
  /** 默认黑色不透明 */
  clearValue?: GPUColor
}

export interface DepthAttachmentOptions {
  /** 默认 "clear" */
  depthLoadOp?: GPULoadOp
  /** 默认 "store" */
  depthStoreOp?: GPUStoreOp
  /** 默认 0（Reverse-Z：远平面为 0，见 ADR-0005） */
  depthClearValue?: number
  depthReadOnly?: boolean
  stencilLoadOp?: GPULoadOp
  stencilStoreOp?: GPUStoreOp
  stencilClearValue?: number
  stencilReadOnly?: boolean
}

export type PassKind = "render" | "compute" | "copy"

/** setup 阶段用于声明读写的构建器 */
export interface PassBuilder {
  /** 声明读取（用于依赖与裁剪） */
  read(handle: TextureHandle): void
  /** 声明写入颜色附件；多次调用按顺序对应 @location(n) */
  writeColor(handle: TextureHandle, options?: ColorAttachmentOptions): void
  /** 声明写入深度 / 模板附件 */
  writeDepth(handle: TextureHandle, options?: DepthAttachmentOptions): void
  /** compute / copy 写入（storage 或拷贝目标） */
  writeStorage(handle: TextureHandle): void
  /** 标记有外部副作用（如读回），即使无人读取也不裁剪 */
  sideEffect(): void
}

/** execute 阶段的上下文（render） */
export interface RenderPassContext {
  readonly device: GpuDevice
  readonly encoder: GPUCommandEncoder
  readonly passEncoder: GPURenderPassEncoder
  readonly passName: string
  readonly colorFormats: readonly GPUTextureFormat[]
  readonly depthFormat: GPUTextureFormat | undefined
  getTextureView(handle: TextureHandle): GPUTextureView
  getTexture(handle: TextureHandle): GPUTexture
  drawItems(items: readonly RenderItem[]): void
}

export interface ComputePassContext {
  readonly device: GpuDevice
  readonly encoder: GPUCommandEncoder
  readonly passEncoder: GPUComputePassEncoder
  readonly passName: string
  getTextureView(handle: TextureHandle): GPUTextureView
  getTexture(handle: TextureHandle): GPUTexture
}

export interface CopyPassContext {
  readonly device: GpuDevice
  readonly encoder: GPUCommandEncoder
  readonly passName: string
  getTexture(handle: TextureHandle): GPUTexture
}

export type PassSetup = (builder: PassBuilder) => void
export type PassExecute = (context: RenderPassContext) => void
export type ComputePassExecute = (context: ComputePassContext) => void
export type CopyPassExecute = (context: CopyPassContext) => void

export interface GraphAliasInfo {
  resource: string
  aliasSlot: string
  firstPass: string
  lastPass: string
}

/** compile() 的结果，供测试与调试导出 */
export interface CompiledGraph {
  /** 存活 pass 名，按执行顺序 */
  passes: readonly string[]
  /** 被裁剪的 pass 名 */
  culled: readonly string[]
  /** 声明哈希（未变化时可复用编译结果） */
  hash?: string
  /** 瞬态别名分配 */
  aliases?: readonly GraphAliasInfo[]
}

export interface GraphJson {
  passes: readonly string[]
  culled: readonly string[]
  resources: readonly { name: string; kind: "imported" | "transient"; format?: string }[]
  aliases: readonly GraphAliasInfo[]
  mermaid: string
}
