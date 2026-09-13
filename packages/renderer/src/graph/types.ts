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

/** 瞬态纹理描述（帧图分配并跨帧复用） */
export interface TransientTextureDescriptor {
  width: number
  height: number
  format: GPUTextureFormat
  /** 默认 RENDER_ATTACHMENT | TEXTURE_BINDING */
  usage?: GPUTextureUsageFlags
  sampleCount?: number
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

/** setup 阶段用于声明读写的构建器 */
export interface PassBuilder {
  /** 声明读取（用于依赖与裁剪） */
  read(handle: TextureHandle): void
  /** 声明写入颜色附件；多次调用按顺序对应 @location(n) */
  writeColor(handle: TextureHandle, options?: ColorAttachmentOptions): void
  /** 声明写入深度 / 模板附件 */
  writeDepth(handle: TextureHandle, options?: DepthAttachmentOptions): void
  /** 标记有外部副作用（如读回），即使无人读取也不裁剪 */
  sideEffect(): void
}

/** execute 阶段的上下文 */
export interface RenderPassContext {
  readonly device: GpuDevice
  readonly encoder: GPUCommandEncoder
  readonly passEncoder: GPURenderPassEncoder
  readonly passName: string
  /** 本 pass 颜色附件格式，按 @location 顺序（构造 pipeline 描述时使用） */
  readonly colorFormats: readonly GPUTextureFormat[]
  /** 本 pass 深度附件格式 */
  readonly depthFormat: GPUTextureFormat | undefined
  /** 解析句柄到真实视图（读取用） */
  getTextureView(handle: TextureHandle): GPUTextureView
  /** 提交 RenderItem 列表：排序、pipeline 解析与状态去重 */
  drawItems(items: readonly RenderItem[]): void
}

export type PassSetup = (builder: PassBuilder) => void
export type PassExecute = (context: RenderPassContext) => void

/** compile() 的结果，供测试与调试导出 */
export interface CompiledGraph {
  /** 存活 pass 名，按执行顺序 */
  passes: readonly string[]
  /** 被裁剪的 pass 名 */
  culled: readonly string[]
}
