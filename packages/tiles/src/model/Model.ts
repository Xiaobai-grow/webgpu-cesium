/**
 * Model：glTF 运行时，输出 G-buffer RenderItem。
 */
import {
  BoundingSphere,
  Cartesian3,
  Matrix4,
  type Resource,
  RuntimeError,
} from "@webgpu-cesium/core"
import type { FrameUniformsBuffer, Material, RenderItem } from "@webgpu-cesium/renderer"
import type { GpuDevice } from "@webgpu-cesium/rhi"
import { GltfLoader } from "../gltf/GltfLoader"
import type { ModelComponents, ModelPrimitive } from "../gltf/ModelComponents"
import { GpuMeshPrimitive } from "./GpuMeshPrimitive"

export interface ModelFromGltfOptions {
  url?: string
  resource?: Resource
  gltf?: Parameters<typeof GltfLoader.load>[0]["gltf"]
  modelMatrix?: Matrix4
  incrementallyLoadTextures?: boolean
}

export interface ModelNodeHandle {
  name: string
  primitives: ModelPrimitive[]
}

/**
 * glTF 模型。`model.material` 覆写全部图元；单图元走 getNode().primitives[i].material。
 */
export class Model {
  modelMatrix = Matrix4.clone(Matrix4.IDENTITY, new Matrix4())
  show = true
  material: Material | undefined
  customShader: unknown
  /** i3dm / EXT_mesh_gpu_instancing：额外实例（左乘到节点世界矩阵） */
  instanceMatrices: Matrix4[] | undefined
  readonly boundingSphere = new BoundingSphere()
  private _components: ModelComponents | undefined
  private _gpu: GpuMeshPrimitive[] = []
  private _ready = false
  private _error: Error | undefined
  private _initialized = false

  /**
   * 异步从 glTF / GLB 创建。
   *
   * @param options URL 或内存文档
   */
  static async fromGltfAsync(options: ModelFromGltfOptions): Promise<Model> {
    const model = new Model()
    if (options.modelMatrix) {
      Matrix4.clone(options.modelMatrix, model.modelMatrix)
    }
    const loaded = await GltfLoader.load({
      ...(options.url !== undefined ? { url: options.url } : {}),
      ...(options.resource !== undefined ? { resource: options.resource } : {}),
      ...(options.gltf !== undefined ? { gltf: options.gltf } : {}),
    })
    model._components = loaded.components
    model._ready = true
    model.updateBoundingSphere()
    return model
  }

  get readyPromise(): Promise<Model> {
    if (this._error) {
      return Promise.reject(this._error)
    }
    return Promise.resolve(this)
  }

  get ready(): boolean {
    return this._ready
  }

  get components(): ModelComponents {
    if (!this._components) {
      throw new RuntimeError("Model is not loaded.")
    }
    return this._components
  }

  /**
   * 按名取节点（含该节点网格图元）。
   *
   * @param name 节点名
   */
  getNode(name: string): ModelNodeHandle | undefined {
    const components = this._components
    if (!components) {
      return undefined
    }
    const node = components.nodes.find((item) => item.name === name)
    if (!node) {
      return undefined
    }
    return {
      name: node.name,
      primitives: node.meshPrimitives
        .map((index) => components.primitives[index])
        .filter((item): item is ModelPrimitive => item !== undefined),
    }
  }

  /**
   * 上传 GPU。
   *
   * @param device 设备
   * @param frameUniforms group 0
   */
  initialize(device: GpuDevice, frameUniforms: FrameUniformsBuffer): void {
    if (this._initialized || !this._components) {
      return
    }
    this._gpu = this._components.primitives.map((primitive) => {
      const material = this.material ?? primitive.material
      return new GpuMeshPrimitive(primitive, material)
    })
    for (const gpu of this._gpu) {
      gpu.initialize(device, frameUniforms)
    }
    this._initialized = true
  }

  get initialized(): boolean {
    return this._initialized
  }

  /**
   * 收集 RenderItem。
   *
   * @param device 设备
   * @param frameUniforms group 0
   */
  createRenderItems(device: GpuDevice, frameUniforms: FrameUniformsBuffer): RenderItem[] {
    if (!this.show || !this._components || !this._initialized) {
      return []
    }
    const localWorlds = this.computePrimitiveWorlds(Matrix4.IDENTITY)
    const extras = this.instanceMatrices ?? [Matrix4.IDENTITY]
    const items: RenderItem[] = []
    for (let i = 0; i < this._gpu.length; i++) {
      const gpu = this._gpu[i]
      const local = localWorlds[i]
      if (!gpu || !local) {
        continue
      }
      if (this.material) {
        gpu.writeMaterial(device)
      }
      const instances = extras.map((extra) => {
        const tiled = Matrix4.multiply(this.modelMatrix, extra, new Matrix4())
        return { worldMatrix: Matrix4.multiply(tiled, local, new Matrix4()) }
      })
      items.push(...gpu.createRenderItems(device, frameUniforms, instances))
    }
    return items
  }

  /**
   * 射线与包围球相交（要素级 GPU 拾取留作异步扩展）。
   *
   * @param origin 射线原点
   * @param direction 方向
   */
  pickBoundingSphere(origin: Cartesian3, direction: Cartesian3): boolean {
    const toCenter = Cartesian3.subtract(this.boundingSphere.center, origin, new Cartesian3())
    const t = Cartesian3.dot(toCenter, direction)
    if (t < 0) {
      return Cartesian3.magnitude(toCenter) <= this.boundingSphere.radius
    }
    const closest = Cartesian3.multiplyByScalar(direction, t, new Cartesian3())
    Cartesian3.add(origin, closest, closest)
    return Cartesian3.distance(closest, this.boundingSphere.center) <= this.boundingSphere.radius
  }

  destroy(): void {
    for (const gpu of this._gpu) {
      gpu.destroy()
    }
    this._gpu = []
    this._initialized = false
  }

  private computePrimitiveWorlds(rootMatrix: Matrix4 = this.modelMatrix): Matrix4[] {
    const components = this._components
    if (!components) {
      return []
    }
    const nodeWorld = components.nodes.map(() => new Matrix4())
    const visit = (index: number, parent: Matrix4): void => {
      const node = components.nodes[index]
      const dest = nodeWorld[index]
      if (!node || !dest) {
        return
      }
      const local = Matrix4.fromArray(Array.from(node.localMatrix), 0, new Matrix4())
      Matrix4.multiply(parent, local, dest)
      for (const child of node.children) {
        visit(child, dest)
      }
    }
    for (const root of components.roots) {
      visit(root, rootMatrix)
    }
    const worlds: Matrix4[] = components.primitives.map(() =>
      Matrix4.clone(rootMatrix, new Matrix4()),
    )
    for (let n = 0; n < components.nodes.length; n++) {
      const node = components.nodes[n]
      const world = nodeWorld[n]
      if (!node || !world) {
        continue
      }
      for (const primitiveIndex of node.meshPrimitives) {
        worlds[primitiveIndex] = Matrix4.clone(world, new Matrix4())
      }
    }
    return worlds
  }

  private updateBoundingSphere(): void {
    const components = this._components
    if (!components) {
      return
    }
    const points: Cartesian3[] = []
    const worlds = this.computePrimitiveWorlds(this.modelMatrix)
    for (let i = 0; i < components.primitives.length; i++) {
      const primitive = components.primitives[i]
      const world = worlds[i] ?? this.modelMatrix
      if (!primitive) {
        continue
      }
      const corners = [
        primitive.boundingMin,
        primitive.boundingMax,
        [primitive.boundingMin[0], primitive.boundingMin[1], primitive.boundingMax[2]],
        [primitive.boundingMax[0], primitive.boundingMax[1], primitive.boundingMin[2]],
      ]
      for (const corner of corners) {
        const local = new Cartesian3(corner[0] ?? 0, corner[1] ?? 0, corner[2] ?? 0)
        points.push(Matrix4.multiplyByPoint(world, local, new Cartesian3()))
      }
    }
    if (points.length > 0) {
      BoundingSphere.fromPoints(points, this.boundingSphere)
    }
  }
}

export { Model as ModelType }
