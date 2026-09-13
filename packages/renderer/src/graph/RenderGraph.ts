/**
 * 最小 Render Graph（M0）。
 *
 * 声明阶段（每帧）：`importTexture` / `createTexture` 得到句柄，`addPass(name, setup, execute)` 声明读写。
 * 编译阶段：裁剪无人读取且不写外部资源的 pass → 按依赖拓扑排序（声明顺序为稀疏排序的稳定基准）。
 * 执行阶段：一个 GPUCommandEncoder；每个 pass 一个 render pass；`queue.submit`。
 *
 * M0 不做：瞬态资源别名、compute / copy / readback pass、编译结果缓存、timestamp 包裹。
 * 见 docs/10-architecture/03-rhi-and-render-graph.md 第 2 节。
 */
import { DeveloperError } from "@webgpu-cesium/core"
import { type GpuDevice, makeLabel } from "@webgpu-cesium/rhi"
import { isDrawIndexed, type RenderItem } from "../RenderItem"
import type {
  ColorAttachmentOptions,
  CompiledGraph,
  DepthAttachmentOptions,
  PassBuilder,
  PassExecute,
  PassSetup,
  RenderPassContext,
  TextureHandle,
  TransientTextureDescriptor,
} from "./types"

const PACKAGE_LABEL = "renderer"

interface ImportedResource {
  kind: "imported"
  name: string
  texture: GPUTexture
}

interface TransientResource {
  kind: "transient"
  name: string
  descriptor: TransientTextureDescriptor
}

type Resource = ImportedResource | TransientResource

interface ColorWrite {
  handle: TextureHandle
  options: ColorAttachmentOptions
}

interface DepthWrite {
  handle: TextureHandle
  options: DepthAttachmentOptions
}

interface PassNode {
  index: number
  name: string
  execute: PassExecute
  reads: Set<number>
  colorWrites: ColorWrite[]
  depthWrite: DepthWrite | undefined
  hasSideEffect: boolean
}

function makeHandle(id: number, name: string): TextureHandle {
  return { id, name } as unknown as TextureHandle
}

/** 瞬态纹理默认用途：RENDER_ATTACHMENT (0x10) | TEXTURE_BINDING (0x04)；用数值避免依赖全局 GPUTextureUsage */
const DEFAULT_TRANSIENT_USAGE = 0x10 | 0x04

/** 瞬态纹理池键 */
function transientKey(descriptor: TransientTextureDescriptor): string {
  return [
    descriptor.width,
    descriptor.height,
    descriptor.format,
    descriptor.usage ?? DEFAULT_TRANSIENT_USAGE,
    descriptor.sampleCount ?? 1,
  ].join("|")
}

export class RenderGraph {
  private resources: Resource[] = []
  private passes: PassNode[] = []
  private compiled: PassNode[] | undefined
  private culled: string[] = []

  /** 瞬态纹理池：跨帧复用（M0 无别名，按描述精确匹配） */
  private readonly transientPool = new Map<string, GPUTexture[]>()
  private frameCounter = 0

  /** 导入外部纹理（例如 canvas 当前纹理）。每帧重新导入。 */
  importTexture(name: string, texture: GPUTexture): TextureHandle {
    const id = this.resources.length
    this.resources.push({ kind: "imported", name, texture })
    return makeHandle(id, name)
  }

  /** 声明瞬态纹理，执行时从池中取或创建 */
  createTexture(name: string, descriptor: TransientTextureDescriptor): TextureHandle {
    const id = this.resources.length
    this.resources.push({ kind: "transient", name, descriptor: { ...descriptor } })
    return makeHandle(id, name)
  }

  /**
   * 声明一个 render pass。`setup` 立即执行以收集读写；`execute` 在 `execute()` 阶段调用。
   */
  addPass(name: string, setup: PassSetup, execute: PassExecute): void {
    if (this.passes.some((pass) => pass.name === name)) {
      throw new DeveloperError(`RenderGraph: pass "${name}" 重复声明`)
    }
    const node: PassNode = {
      index: this.passes.length,
      name,
      execute,
      reads: new Set(),
      colorWrites: [],
      depthWrite: undefined,
      hasSideEffect: false,
    }
    const builder: PassBuilder = {
      read: (handle) => {
        this.assertHandle(handle)
        node.reads.add(handle.id)
      },
      writeColor: (handle, options = {}) => {
        this.assertHandle(handle)
        node.colorWrites.push({ handle, options })
      },
      writeDepth: (handle, options = {}) => {
        this.assertHandle(handle)
        if (node.depthWrite) {
          throw new DeveloperError(`RenderGraph: pass "${name}" 声明了多个深度附件`)
        }
        node.depthWrite = { handle, options }
      },
      sideEffect: () => {
        node.hasSideEffect = true
      },
    }
    setup(builder)
    this.passes.push(node)
    this.compiled = undefined
  }

  /**
   * 编译：裁剪 + 拓扑排序。可多次调用（幂等），`execute()` 会自动调用。
   */
  compile(): CompiledGraph {
    if (!this.compiled) {
      const alive = this.cullPasses()
      this.compiled = this.sortPasses(alive)
      this.culled = this.passes.filter((pass) => !alive.has(pass)).map((pass) => pass.name)
    }
    return {
      passes: this.compiled.map((pass) => pass.name),
      culled: this.culled,
    }
  }

  /**
   * 执行：创建 encoder，按顺序运行每个存活 pass 并提交。执行后自动 `reset()`。
   */
  execute(device: GpuDevice): void {
    this.compile()
    const passes = this.compiled!
    const frame = this.frameCounter++
    const gpu = device.device
    const encoder = gpu.createCommandEncoder({
      label: makeLabel("RenderGraph", `frame-${String(frame)}`, PACKAGE_LABEL),
    })

    // 本帧的视图缓存：句柄 id → 视图
    const views = new Map<number, GPUTextureView>()
    const usedTransients: GPUTexture[] = []
    const resolveView = (handle: TextureHandle): GPUTextureView => {
      let view = views.get(handle.id)
      if (!view) {
        const texture = this.resolveTexture(gpu, handle, usedTransients)
        view = texture.createView({
          label: makeLabel("TextureView", handle.name, PACKAGE_LABEL),
        })
        views.set(handle.id, view)
      }
      return view
    }

    for (const pass of passes) {
      const descriptor = this.buildPassDescriptor(pass, resolveView)
      const passEncoder = encoder.beginRenderPass(descriptor)
      const context = this.createContext(device, encoder, passEncoder, pass, resolveView)
      try {
        pass.execute(context)
      } finally {
        passEncoder.end()
      }
    }

    gpu.queue.submit([encoder.finish()])

    // 归还瞬态纹理
    for (const texture of usedTransients) {
      this.releaseTransient(texture)
    }
    this.reset()
  }

  /** 清空本帧声明（瞬态池保留） */
  reset(): void {
    this.resources = []
    this.passes = []
    this.compiled = undefined
    this.culled = []
  }

  /** 释放瞬态池中的所有纹理 */
  destroy(): void {
    for (const textures of this.transientPool.values()) {
      for (const texture of textures) {
        texture.destroy()
      }
    }
    this.transientPool.clear()
    this.reset()
  }

  /** 导出 Mermaid 流程图（调试） */
  toMermaid(): string {
    const compiled = this.compile()
    const lines = ["flowchart LR"]
    for (const pass of this.passes) {
      const isAlive = compiled.passes.includes(pass.name)
      lines.push(`  ${pass.name}["${pass.name}${isAlive ? "" : " (culled)"}"]`)
      for (const write of pass.colorWrites) {
        lines.push(`  ${pass.name} --> ${write.handle.name}`)
      }
      if (pass.depthWrite) {
        lines.push(`  ${pass.name} --> ${pass.depthWrite.handle.name}`)
      }
      for (const readId of pass.reads) {
        const resource = this.resources[readId]!
        lines.push(`  ${resource.name} --> ${pass.name}`)
      }
    }
    return lines.join("\n")
  }

  // ---- 编译 ----

  private writesOf(pass: PassNode): number[] {
    const ids = pass.colorWrites.map((write) => write.handle.id)
    if (pass.depthWrite) {
      ids.push(pass.depthWrite.handle.id)
    }
    return ids
  }

  /**
   * 裁剪：存活 = 有副作用 | 写入外部（导入）资源 | 写入被存活 pass 读取的资源。迭代到不动点。
   */
  private cullPasses(): Set<PassNode> {
    const alive = new Set<PassNode>()
    const neededResources = new Set<number>()
    for (const [id, resource] of this.resources.entries()) {
      if (resource.kind === "imported") {
        neededResources.add(id)
      }
    }

    let changed = true
    while (changed) {
      changed = false
      for (let i = this.passes.length - 1; i >= 0; i--) {
        const pass = this.passes[i]!
        if (alive.has(pass)) {
          continue
        }
        const writesNeeded = this.writesOf(pass).some((id) => neededResources.has(id))
        if (pass.hasSideEffect || writesNeeded) {
          alive.add(pass)
          for (const id of pass.reads) {
            neededResources.add(id)
          }
          changed = true
        }
      }
    }
    return alive
  }

  /**
   * 拓扑排序（Kahn），边：写者 → 读者；同一资源多个写者按声明顺序串联。
   * 平局按声明顺序，保证稳定。
   */
  private sortPasses(alive: Set<PassNode>): PassNode[] {
    const nodes = this.passes.filter((pass) => alive.has(pass))
    const successors = new Map<PassNode, Set<PassNode>>()
    const inDegree = new Map<PassNode, number>()
    for (const node of nodes) {
      successors.set(node, new Set())
      inDegree.set(node, 0)
    }
    const addEdge = (from: PassNode, to: PassNode): void => {
      if (from === to) {
        return
      }
      const set = successors.get(from)!
      if (!set.has(to)) {
        set.add(to)
        inDegree.set(to, inDegree.get(to)! + 1)
      }
    }

    // 资源 → 写者列表（声明顺序）
    const writers = new Map<number, PassNode[]>()
    for (const node of nodes) {
      for (const id of this.writesOf(node)) {
        const list = writers.get(id) ?? []
        list.push(node)
        writers.set(id, list)
      }
    }
    for (const list of writers.values()) {
      for (let i = 1; i < list.length; i++) {
        addEdge(list[i - 1]!, list[i]!)
      }
    }
    // 读者依赖其之前声明的最后一个写者；若写者全部声明在读者之后，则依赖最后一个写者
    for (const reader of nodes) {
      for (const id of reader.reads) {
        const list = writers.get(id)
        if (!list || list.length === 0) {
          continue
        }
        const before = list.filter((writer) => writer.index < reader.index)
        const writer = before.length > 0 ? before[before.length - 1]! : list[list.length - 1]!
        addEdge(writer, reader)
      }
    }

    const ready = nodes.filter((node) => inDegree.get(node) === 0)
    const order: PassNode[] = []
    while (ready.length > 0) {
      ready.sort((a, b) => a.index - b.index)
      const node = ready.shift()!
      order.push(node)
      for (const next of successors.get(node)!) {
        const degree = inDegree.get(next)! - 1
        inDegree.set(next, degree)
        if (degree === 0) {
          ready.push(next)
        }
      }
    }
    if (order.length !== nodes.length) {
      const stuck = nodes.filter((node) => !order.includes(node)).map((node) => node.name)
      throw new DeveloperError(`RenderGraph: pass 之间存在循环依赖：${stuck.join(", ")}`)
    }
    return order
  }

  // ---- 执行 ----

  private assertHandle(handle: TextureHandle): void {
    if (this.resources[handle.id] === undefined) {
      throw new DeveloperError(`RenderGraph: 无效的资源句柄 "${handle.name}"`)
    }
  }

  private resolveTexture(
    gpu: GPUDevice,
    handle: TextureHandle,
    usedTransients: GPUTexture[],
  ): GPUTexture {
    const resource = this.resources[handle.id]!
    if (resource.kind === "imported") {
      return resource.texture
    }
    const key = transientKey(resource.descriptor)
    const pool = this.transientPool.get(key) ?? []
    let texture = pool.pop()
    if (!texture) {
      const descriptor = resource.descriptor
      texture = gpu.createTexture({
        label: makeLabel("TransientTexture", resource.name, PACKAGE_LABEL),
        size: { width: descriptor.width, height: descriptor.height },
        format: descriptor.format,
        usage: descriptor.usage ?? DEFAULT_TRANSIENT_USAGE,
        sampleCount: descriptor.sampleCount ?? 1,
      })
    }
    this.transientPool.set(key, pool)
    usedTransients.push(texture)
    return texture
  }

  private releaseTransient(texture: GPUTexture): void {
    const key = [
      texture.width,
      texture.height,
      texture.format,
      texture.usage,
      texture.sampleCount,
    ].join("|")
    const pool = this.transientPool.get(key) ?? []
    pool.push(texture)
    this.transientPool.set(key, pool)
  }

  private buildPassDescriptor(
    pass: PassNode,
    resolveView: (handle: TextureHandle) => GPUTextureView,
  ): GPURenderPassDescriptor {
    const colorAttachments: GPURenderPassColorAttachment[] = pass.colorWrites.map((write) => ({
      view: resolveView(write.handle),
      loadOp: write.options.loadOp ?? "clear",
      storeOp: write.options.storeOp ?? "store",
      clearValue: write.options.clearValue ?? { r: 0, g: 0, b: 0, a: 1 },
    }))
    const descriptor: GPURenderPassDescriptor = {
      label: makeLabel("RenderPass", pass.name, PACKAGE_LABEL),
      colorAttachments,
    }
    if (pass.depthWrite) {
      const options = pass.depthWrite.options
      const depth: GPURenderPassDepthStencilAttachment = {
        view: resolveView(pass.depthWrite.handle),
      }
      if (options.depthReadOnly) {
        depth.depthReadOnly = true
      } else {
        depth.depthLoadOp = options.depthLoadOp ?? "clear"
        depth.depthStoreOp = options.depthStoreOp ?? "store"
        depth.depthClearValue = options.depthClearValue ?? 0
      }
      if (options.stencilLoadOp !== undefined || options.stencilStoreOp !== undefined) {
        depth.stencilLoadOp = options.stencilLoadOp ?? "clear"
        depth.stencilStoreOp = options.stencilStoreOp ?? "store"
        depth.stencilClearValue = options.stencilClearValue ?? 0
      }
      if (options.stencilReadOnly) {
        depth.stencilReadOnly = true
      }
      descriptor.depthStencilAttachment = depth
    }
    return descriptor
  }

  private createContext(
    device: GpuDevice,
    encoder: GPUCommandEncoder,
    passEncoder: GPURenderPassEncoder,
    pass: PassNode,
    resolveView: (handle: TextureHandle) => GPUTextureView,
  ): RenderPassContext {
    const formatOf = (handle: TextureHandle): GPUTextureFormat => {
      const resource = this.resources[handle.id]!
      return resource.kind === "imported" ? resource.texture.format : resource.descriptor.format
    }
    const colorFormats = pass.colorWrites.map((write) => formatOf(write.handle))
    const depthFormat = pass.depthWrite ? formatOf(pass.depthWrite.handle) : undefined

    return {
      device,
      encoder,
      passEncoder,
      passName: pass.name,
      colorFormats,
      depthFormat,
      getTextureView: resolveView,
      drawItems: (items) => {
        drawRenderItems(device, passEncoder, items)
      },
    }
  }
}

/**
 * 提交 RenderItem 列表：按 (sortKey, pipeline 键) 排序，pipeline / bind group 只在变化时设置。
 */
export function drawRenderItems(
  device: GpuDevice,
  passEncoder: GPURenderPassEncoder,
  items: readonly RenderItem[],
): void {
  const cache = device.pipelines
  const resolved = items.map((item) => ({
    item,
    pipeline: cache.getRenderPipeline(item.pipeline),
    pipelineKey: cache.keyOf(item.pipeline),
  }))
  resolved.sort((a, b) => {
    if (a.item.sortKey !== b.item.sortKey) {
      return a.item.sortKey - b.item.sortKey
    }
    return a.pipelineKey < b.pipelineKey ? -1 : a.pipelineKey > b.pipelineKey ? 1 : 0
  })

  let currentPipeline: GPURenderPipeline | undefined
  const currentBindGroups: (GPUBindGroup | undefined)[] = []

  for (const { item, pipeline } of resolved) {
    if (pipeline !== currentPipeline) {
      passEncoder.setPipeline(pipeline)
      currentPipeline = pipeline
    }
    if (item.bindGroups) {
      for (let group = 0; group < item.bindGroups.length; group++) {
        const bindGroup = item.bindGroups[group]
        if (bindGroup !== undefined && bindGroup !== currentBindGroups[group]) {
          passEncoder.setBindGroup(group, bindGroup)
          currentBindGroups[group] = bindGroup
        }
      }
    }
    if (item.vertexBuffers) {
      for (let slot = 0; slot < item.vertexBuffers.length; slot++) {
        const binding = item.vertexBuffers[slot]!
        passEncoder.setVertexBuffer(slot, binding.buffer, binding.offset, binding.size)
      }
    }
    if (isDrawIndexed(item.draw)) {
      const index = item.indexBuffer
      if (!index) {
        throw new DeveloperError(
          `RenderItem "${item.label ?? ""}" 使用 drawIndexed 但未提供 indexBuffer`,
        )
      }
      passEncoder.setIndexBuffer(index.buffer, index.format, index.offset, index.size)
      const draw = item.draw
      passEncoder.drawIndexed(
        draw.indexCount,
        draw.instanceCount,
        draw.firstIndex,
        draw.baseVertex,
        draw.firstInstance,
      )
    } else {
      const draw = item.draw
      passEncoder.draw(draw.vertexCount, draw.instanceCount, draw.firstVertex, draw.firstInstance)
    }
  }
}
