/**
 * Render Graph（M4）：编译、瞬态别名、调试导出；render / compute / copy。
 *
 * 声明阶段（每帧）：`importTexture` / `createTexture` 得到句柄，`addPass` / `addComputePass` / `addCopyPass`。
 * 编译阶段：裁剪 → 拓扑排序 → 生命区间 → 同格式同尺寸别名。
 * 执行阶段：一个 GPUCommandEncoder；分辨率变化时销毁未再使用的池纹理。
 */
import { DeveloperError } from "@webgpu-cesium/core"
import { type GpuDevice, makeLabel } from "@webgpu-cesium/rhi"
import { isDrawIndexed, type RenderItem } from "../RenderItem"
import type {
  ColorAttachmentOptions,
  CompiledGraph,
  ComputePassContext,
  ComputePassExecute,
  CopyPassContext,
  CopyPassExecute,
  DepthAttachmentOptions,
  GraphAliasInfo,
  GraphJson,
  PassBuilder,
  PassExecute,
  PassKind,
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
  kind: PassKind
  execute: PassExecute | ComputePassExecute | CopyPassExecute
  reads: Set<number>
  colorWrites: ColorWrite[]
  depthWrite: DepthWrite | undefined
  storageWrites: Set<number>
  hasSideEffect: boolean
}

function makeHandle(id: number, name: string): TextureHandle {
  return { id, name } as unknown as TextureHandle
}

/** 瞬态纹理默认用途：RENDER_ATTACHMENT | TEXTURE_BINDING */
const DEFAULT_TRANSIENT_USAGE = 0x10 | 0x04

/** 瞬态纹理池键 */
function transientKey(descriptor: TransientTextureDescriptor): string {
  return [
    descriptor.width,
    descriptor.height,
    descriptor.depthOrArrayLayers ?? 1,
    descriptor.format,
    descriptor.usage ?? DEFAULT_TRANSIENT_USAGE,
    descriptor.sampleCount ?? 1,
  ].join("|")
}

function descriptorOf(resource: Resource): TransientTextureDescriptor | undefined {
  return resource.kind === "transient" ? resource.descriptor : undefined
}

export class RenderGraph {
  /** 可选：包裹 timestamp-query（需设备 feature，默认关） */
  enableTimestamps = false

  private resources: Resource[] = []
  private passes: PassNode[] = []
  private compiled: PassNode[] | undefined
  private culled: string[] = []
  private lastHash: string | undefined
  private aliases: GraphAliasInfo[] = []
  private aliasSlotOf = new Map<number, string>()

  /** 瞬态纹理池：跨帧复用 */
  private readonly transientPool = new Map<string, GPUTexture[]>()
  private readonly transientKeys = new WeakMap<GPUTexture, string>()
  private frameCounter = 0

  /** 导入外部纹理（例如 canvas 当前纹理）。每帧重新导入。 */
  importTexture(name: string, texture: GPUTexture): TextureHandle {
    const id = this.resources.length
    this.resources.push({ kind: "imported", name, texture })
    return makeHandle(id, name)
  }

  /** 声明瞬态纹理，执行时从池中取或创建（可与生命区间不重叠的同规格资源别名） */
  createTexture(name: string, descriptor: TransientTextureDescriptor): TextureHandle {
    const id = this.resources.length
    this.resources.push({ kind: "transient", name, descriptor: { ...descriptor } })
    return makeHandle(id, name)
  }

  /**
   * 声明一个 render pass。`setup` 立即执行以收集读写；`execute` 在 `execute()` 阶段调用。
   */
  addPass(name: string, setup: PassSetup, execute: PassExecute): void {
    this.addTypedPass("render", name, setup, execute)
  }

  /**
   * 声明 compute pass。
   *
   * @param name pass 名
   * @param setup 读写
   * @param execute dispatch
   */
  addComputePass(name: string, setup: PassSetup, execute: ComputePassExecute): void {
    this.addTypedPass("compute", name, setup, execute)
  }

  /**
   * 声明 copy pass。
   *
   * @param name pass 名
   * @param setup 读写
   * @param execute copyTextureToTexture 等
   */
  addCopyPass(name: string, setup: PassSetup, execute: CopyPassExecute): void {
    this.addTypedPass("copy", name, setup, execute)
  }

  private addTypedPass(
    kind: PassKind,
    name: string,
    setup: PassSetup,
    execute: PassExecute | ComputePassExecute | CopyPassExecute,
  ): void {
    if (this.passes.some((pass) => pass.name === name)) {
      throw new DeveloperError(`RenderGraph: pass "${name}" 重复声明`)
    }
    const node: PassNode = {
      index: this.passes.length,
      name,
      kind,
      execute,
      reads: new Set(),
      colorWrites: [],
      depthWrite: undefined,
      storageWrites: new Set(),
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
      writeStorage: (handle) => {
        this.assertHandle(handle)
        node.storageWrites.add(handle.id)
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
   * 编译：裁剪 + 拓扑排序 + 别名。可多次调用（幂等），`execute()` 会自动调用。
   */
  compile(): CompiledGraph {
    const hash = this.declarationHash()
    if (!this.compiled || this.lastHash !== hash) {
      const alive = this.cullPasses()
      this.compiled = this.sortPasses(alive)
      this.culled = this.passes.filter((pass) => !alive.has(pass)).map((pass) => pass.name)
      this.assignAliases(this.compiled)
      this.lastHash = hash
    }
    return {
      passes: this.compiled.map((pass) => pass.name),
      culled: this.culled,
      hash,
      aliases: this.aliases,
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

    const views = new Map<number, GPUTextureView>()
    const textures = new Map<number, GPUTexture>()
    const usedTransients: GPUTexture[] = []
    const usedKeys = new Set<string>()
    const resolveTexture = (handle: TextureHandle): GPUTexture => {
      let texture = textures.get(handle.id)
      if (!texture) {
        texture = this.resolveTexture(gpu, handle, usedTransients, usedKeys, textures)
        textures.set(handle.id, texture)
      }
      return texture
    }
    const resolveView = (handle: TextureHandle): GPUTextureView => {
      let view = views.get(handle.id)
      if (!view) {
        const texture = resolveTexture(handle)
        view = texture.createView({
          label: makeLabel("TextureView", handle.name, PACKAGE_LABEL),
        })
        views.set(handle.id, view)
      }
      return view
    }

    for (const pass of passes) {
      if (pass.kind === "compute") {
        const passEncoder = encoder.beginComputePass({
          label: makeLabel("ComputePass", pass.name, PACKAGE_LABEL),
        })
        const context: ComputePassContext = {
          device,
          encoder,
          passEncoder,
          passName: pass.name,
          getTextureView: resolveView,
          getTexture: resolveTexture,
        }
        try {
          ;(pass.execute as ComputePassExecute)(context)
        } finally {
          passEncoder.end()
        }
        continue
      }
      if (pass.kind === "copy") {
        const context: CopyPassContext = {
          device,
          encoder,
          passName: pass.name,
          getTexture: resolveTexture,
        }
        ;(pass.execute as CopyPassExecute)(context)
        continue
      }
      const descriptor = this.buildPassDescriptor(pass, resolveView)
      const passEncoder = encoder.beginRenderPass(descriptor)
      const context = this.createContext(
        device,
        encoder,
        passEncoder,
        pass,
        resolveView,
        resolveTexture,
      )
      try {
        ;(pass.execute as PassExecute)(context)
      } finally {
        passEncoder.end()
      }
    }

    gpu.queue.submit([encoder.finish()])

    for (const texture of usedTransients) {
      this.releaseTransient(texture)
    }
    this.evictUnusedPool(usedKeys)
    this.reset()
  }

  /** 清空本帧声明（瞬态池保留） */
  reset(): void {
    this.resources = []
    this.passes = []
    this.compiled = undefined
    this.culled = []
    this.lastHash = undefined
    this.aliases = []
    this.aliasSlotOf.clear()
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
      const kind = pass.kind === "render" ? "" : ` / ${pass.kind}`
      lines.push(`  ${pass.name}["${pass.name}${kind}${isAlive ? "" : " (culled)"}"]`)
      for (const write of pass.colorWrites) {
        lines.push(`  ${pass.name} --> ${write.handle.name}`)
      }
      if (pass.depthWrite) {
        lines.push(`  ${pass.name} --> ${pass.depthWrite.handle.name}`)
      }
      for (const id of pass.storageWrites) {
        const resource = this.resources[id]!
        lines.push(`  ${pass.name} --> ${resource.name}`)
      }
      for (const readId of pass.reads) {
        const resource = this.resources[readId]!
        lines.push(`  ${resource.name} --> ${pass.name}`)
      }
    }
    return lines.join("\n")
  }

  /**
   * 导出 JSON + Mermaid（调试 / 验收）。
   */
  toJson(): GraphJson {
    const compiled = this.compile()
    return {
      passes: compiled.passes,
      culled: compiled.culled,
      resources: this.resources.map((resource) => ({
        name: resource.name,
        kind: resource.kind,
        ...(resource.kind === "transient" ? { format: resource.descriptor.format } : {}),
      })),
      aliases: compiled.aliases ?? [],
      mermaid: this.toMermaid(),
    }
  }

  // ---- 编译 ----

  private declarationHash(): string {
    const parts: string[] = []
    for (const resource of this.resources) {
      if (resource.kind === "imported") {
        parts.push(`i:${resource.name}`)
      } else {
        parts.push(`t:${resource.name}:${transientKey(resource.descriptor)}`)
      }
    }
    for (const pass of this.passes) {
      parts.push(
        [
          pass.kind,
          pass.name,
          [...pass.reads].join(","),
          this.writesOf(pass).join(","),
          pass.hasSideEffect ? "1" : "0",
        ].join("|"),
      )
    }
    return parts.join(";")
  }

  private writesOf(pass: PassNode): number[] {
    const ids = pass.colorWrites.map((write) => write.handle.id)
    if (pass.depthWrite) {
      ids.push(pass.depthWrite.handle.id)
    }
    for (const id of pass.storageWrites) {
      ids.push(id)
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

  /**
   * 按编译顺序计算瞬态资源生命区间，同规格不重叠则共享别名槽。
   */
  private assignAliases(order: PassNode[]): void {
    this.aliases = []
    this.aliasSlotOf.clear()
    const first = new Map<number, number>()
    const last = new Map<number, number>()
    for (let i = 0; i < order.length; i++) {
      const pass = order[i]!
      const ids = [...pass.reads, ...this.writesOf(pass)]
      for (const id of ids) {
        if (this.resources[id]?.kind !== "transient") {
          continue
        }
        if (!first.has(id)) {
          first.set(id, i)
        }
        last.set(id, i)
      }
    }

    interface Slot {
      key: string
      last: number
      index: number
    }
    const slots: Slot[] = []
    const transients = [...first.keys()].sort((a, b) => a - b)
    for (const id of transients) {
      const resource = this.resources[id]!
      const desc = descriptorOf(resource)
      if (!desc) {
        continue
      }
      const key = transientKey(desc)
      const start = first.get(id)!
      const end = last.get(id)!
      let chosen = slots.find((slot) => slot.key === key && slot.last < start)
      if (!chosen) {
        chosen = { key, last: end, index: slots.length }
        slots.push(chosen)
      } else {
        chosen.last = end
      }
      const aliasSlot = `${key}#${String(chosen.index)}`
      this.aliasSlotOf.set(id, aliasSlot)
      this.aliases.push({
        resource: resource.name,
        aliasSlot,
        firstPass: order[start]!.name,
        lastPass: order[end]!.name,
      })
    }
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
    usedKeys: Set<string>,
    textures: Map<number, GPUTexture>,
  ): GPUTexture {
    const resource = this.resources[handle.id]!
    if (resource.kind === "imported") {
      return resource.texture
    }
    const slot = this.aliasSlotOf.get(handle.id)
    const key = slot ?? transientKey(resource.descriptor)
    usedKeys.add(transientKey(resource.descriptor))
    if (slot) {
      for (const [otherId, existing] of textures) {
        if (this.aliasSlotOf.get(otherId) === slot) {
          textures.set(handle.id, existing)
          return existing
        }
      }
    }
    const pool = this.transientPool.get(key) ?? []
    let texture = pool.pop()
    if (!texture) {
      const descriptor = resource.descriptor
      texture = gpu.createTexture({
        label: makeLabel("TransientTexture", resource.name, PACKAGE_LABEL),
        size: {
          width: descriptor.width,
          height: descriptor.height,
          depthOrArrayLayers: descriptor.depthOrArrayLayers ?? 1,
        },
        format: descriptor.format,
        usage: descriptor.usage ?? DEFAULT_TRANSIENT_USAGE,
        sampleCount: descriptor.sampleCount ?? 1,
      })
    }
    this.transientPool.set(key, pool)
    usedTransients.push(texture)
    this.transientKeys.set(texture, key)
    return texture
  }

  private releaseTransient(texture: GPUTexture): void {
    const tagged = this.transientKeys.get(texture)
    const key =
      tagged ??
      [
        texture.width,
        texture.height,
        texture.depthOrArrayLayers,
        texture.format,
        texture.usage,
        texture.sampleCount,
      ].join("|")
    const pool = this.transientPool.get(key) ?? []
    pool.push(texture)
    this.transientPool.set(key, pool)
  }

  /**
   * 分辨率变化后：销毁本帧未再申请规格的池纹理。
   */
  private evictUnusedPool(usedKeys: Set<string>): void {
    for (const [key, textures] of this.transientPool) {
      const spec = key.split("#")[0] ?? key
      if (usedKeys.has(spec) || usedKeys.has(key)) {
        continue
      }
      for (const texture of textures) {
        texture.destroy()
      }
      this.transientPool.delete(key)
    }
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
    resolveTexture: (handle: TextureHandle) => GPUTexture,
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
      getTexture: resolveTexture,
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
  const resolved = items.map((item) => {
    const pipelineKey = item.pipelineKey ?? cache.keyOf(item.pipeline)
    return {
      item,
      pipeline: cache.getRenderPipeline(item.pipeline),
      pipelineKey,
    }
  })
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
