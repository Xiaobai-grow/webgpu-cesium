/**
 * 按 magic / URI 把瓦片字节变成内容。
 */
import { type Cartesian3, Matrix4, type Resource } from "@webgpu-cesium/core"
import { parseB3dm } from "../content/B3dmParser"
import { parseComposite } from "../content/CompositeParser"
import { parseI3dm } from "../content/I3dmParser"
import { parsePnts } from "../content/PntsParser"
import { detectTileContentType } from "../content/tileHeader"
import { featuresFromBatchTable } from "../feature/Cesium3DTileFeatureTable"
import type { Cesium3DTileFeature } from "../feature/Cesium3DTileFeature"
import { Model } from "../model/Model"
import { Empty3DTileContent, type Cesium3DTileContent } from "./Cesium3DTileContent"
import type { Cesium3DTile } from "./Cesium3DTile"
import type { FrameUniformsBuffer, RenderItem } from "@webgpu-cesium/renderer"
import type { GpuDevice } from "@webgpu-cesium/rhi"

class Model3DTileContent implements Cesium3DTileContent {
  readonly model: Model
  readonly features: Cesium3DTileFeature[]
  readonly bytes: number

  constructor(model: Model, features: Cesium3DTileFeature[], bytes: number) {
    this.model = model
    this.features = features
    this.bytes = bytes
  }

  get ready(): boolean {
    return this.model.ready
  }

  get featuresLength(): number {
    return this.features.length
  }

  getFeature(index: number): Cesium3DTileFeature | undefined {
    return this.features[index]
  }

  initialize(device: GpuDevice, frameUniforms: FrameUniformsBuffer): void {
    this.model.initialize(device, frameUniforms)
  }

  createRenderItems(device: GpuDevice, frameUniforms: FrameUniformsBuffer): RenderItem[] {
    if (this.features.length > 0 && this.features.some((feature) => !feature.show)) {
      if (this.features.every((feature) => !feature.show)) {
        return []
      }
    }
    return this.model.createRenderItems(device, frameUniforms)
  }

  destroy(): void {
    this.model.destroy()
  }
}

/**
 * 解析字节为内容；外部 tileset JSON 返回 children 描述。
 *
 * @param tile 宿主
 * @param bytes 文件
 * @param resource 基 Resource
 */
export async function loadTileContent(
  tile: Cesium3DTile,
  bytes: Uint8Array,
  resource: Resource,
): Promise<{ content: Cesium3DTileContent; external?: unknown }> {
  const type = detectTileContentType(bytes)
  if (type === "json") {
    return {
      content: new Empty3DTileContent(),
      external: JSON.parse(new TextDecoder().decode(bytes)) as unknown,
    }
  }
  if (type === "cmpt") {
    const inner = parseComposite(bytes)
    const models: Model[] = []
    const features: Cesium3DTileFeature[] = []
    const bytesUsed = bytes.byteLength
    for (const part of inner) {
      const loaded = await loadTileContent(tile, part, resource)
      if (loaded.content.model) {
        models.push(loaded.content.model)
      }
      for (let i = 0; i < loaded.content.featuresLength; i++) {
        const feature = loaded.content.getFeature(i)
        if (feature) {
          features.push(feature)
        }
      }
    }
    if (models.length === 1 && models[0]) {
      return { content: new Model3DTileContent(models[0], features, bytesUsed) }
    }
    if (models[0]) {
      return { content: new Model3DTileContent(models[0], features, bytesUsed) }
    }
    return { content: new Empty3DTileContent() }
  }
  if (type === "pnts") {
    parsePnts(bytes)
    return { content: new Empty3DTileContent() }
  }
  if (type === "b3dm") {
    const parsed = parseB3dm(bytes)
    const model = await Model.fromGltfAsync({
      gltf: parsed.gltf,
      resource,
      modelMatrix: applyRtc(tile.computedTransform, parsed.rtcCenter),
    })
    applyOverride(tile, model)
    const features = featuresFromBatchTable(
      tile,
      parsed.batchTableJson,
      parsed.featureTableJson.BATCH_LENGTH ?? 0,
    )
    applyStyle(tile, features)
    return { content: new Model3DTileContent(model, features, bytes.byteLength) }
  }
  if (type === "i3dm") {
    const parsed = parseI3dm(bytes)
    const model = await Model.fromGltfAsync({
      gltf: parsed.gltf,
      resource,
      modelMatrix: applyRtc(tile.computedTransform, parsed.rtcCenter),
    })
    model.instanceMatrices = parsed.instances
    applyOverride(tile, model)
    return { content: new Model3DTileContent(model, [], bytes.byteLength) }
  }
  const model = await Model.fromGltfAsync({
    gltf: bytes,
    resource,
    modelMatrix: Matrix4.clone(tile.computedTransform, new Matrix4()),
  })
  applyOverride(tile, model)
  return { content: new Model3DTileContent(model, [], bytes.byteLength) }
}

function applyRtc(transform: Matrix4, rtc: Cartesian3 | undefined): Matrix4 {
  if (!rtc) {
    return Matrix4.clone(transform, new Matrix4())
  }
  const translation = Matrix4.fromTranslation(rtc, new Matrix4())
  return Matrix4.multiply(transform, translation, new Matrix4())
}

function applyOverride(tile: Cesium3DTile, model: Model): void {
  const override = tile.tileset.material ?? tile.tileset.materialOverride
  if (typeof override === "function") {
    const first = model.components.primitives[0]
    const result = override({ tile, primitive: first, model })
    if (result) {
      model.material = result
    }
    return
  }
  if (override) {
    model.material = override
  }
}

function applyStyle(tile: Cesium3DTile, features: Cesium3DTileFeature[]): void {
  const style = tile.tileset.style
  if (!style) {
    return
  }
  for (const feature of features) {
    feature.show = style.evaluateShow(feature)
    feature.color = style.evaluateColor(feature)
  }
}
