/**
 * RenderItem：一次绘制的**声明**（对标 Cesium `DrawCommand`）。
 *
 * 不持有 GPU 状态设置逻辑；pipeline 以描述符形式给出，由 pass 内通过 `PipelineCache` 解析并缓存。
 * 排序键约定（M0 简化）：调用方给出 `sortKey`，pass 内先按 `sortKey` 再按 pipeline 键排序，
 * `setPipeline` 只在变化时调用，bind group 逐槽位比较后再 `setBindGroup`。
 */

export interface VertexBufferBinding {
  buffer: GPUBuffer
  offset?: number
  size?: number
}

export interface IndexBufferBinding {
  buffer: GPUBuffer
  format: GPUIndexFormat
  offset?: number
  size?: number
}

export interface DrawArrays {
  vertexCount: number
  instanceCount?: number
  firstVertex?: number
  firstInstance?: number
}

export interface DrawIndexed {
  indexCount: number
  instanceCount?: number
  firstIndex?: number
  baseVertex?: number
  firstInstance?: number
}

export interface RenderItem {
  /** 所属 pass 标签（帧图中的 pass 名） */
  pass: string
  /** 排序键，越小越先绘制 */
  sortKey: number
  /**
   * 已解析的 pipeline 缓存键。M2 起由调用方在描述不变时复用，避免每帧 `stableKey`（约 6.7 µs）。
   * 缺省时 `drawRenderItems` 仍会现算。
   */
  pipelineKey?: string
  /** pipeline 描述（不含 `label`；同描述共享同一 pipeline） */
  pipeline: GPURenderPipelineDescriptor
  /** 按 group 索引排列的 bind group；`undefined` 槽位跳过 */
  bindGroups?: readonly (GPUBindGroup | undefined)[]
  /** 按 slot 索引排列的顶点 buffer */
  vertexBuffers?: readonly VertexBufferBinding[]
  indexBuffer?: IndexBufferBinding
  /** 绘制参数：有 `indexCount` 走 drawIndexed */
  draw: DrawArrays | DrawIndexed
  /** 调试标签 */
  label?: string
}

export function isDrawIndexed(draw: DrawArrays | DrawIndexed): draw is DrawIndexed {
  return "indexCount" in draw
}
