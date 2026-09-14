import { Cartesian3, Matrix3, Matrix4, Resource } from "@webgpu-cesium/core"
import { describe, expect, it } from "vitest"
import { parseB3dm } from "../content/B3dmParser"
import { detectTileContentType } from "../content/tileHeader"
import { createBoxB3dm, createBoxGlb, createCityTilesetJson } from "../gltf/createBoxGltf"
import { Model } from "../model/Model"
import { Cesium3DTileStyle } from "../style/Cesium3DTileStyle"
import { Expression } from "../style/Expression"
import { computeScreenSpaceError, selectTiles } from "./Cesium3DTilesetTraversal"
import { Cesium3DTileset } from "./Cesium3DTileset"
import { createTileBoundingVolume } from "./TileBoundingVolume"

describe("3D Tiles", () => {
  it("解析 b3dm 并检出 magic", () => {
    const b3dm = createBoxB3dm({ color: [0, 1, 0, 1] })
    expect(detectTileContentType(b3dm)).toBe("b3dm")
    const parsed = parseB3dm(b3dm)
    expect(detectTileContentType(parsed.gltf)).toBe("gltf")
    expect(parsed.featureTableJson.BATCH_LENGTH).toBe(0)
  })

  it("fromJson 城市 fixture 有 4 个子瓦片", async () => {
    const { tileset } = createCityTilesetJson({ longitude: 8, latitude: 46, height: 8 })
    const loaded = await Cesium3DTileset.fromJson(tileset)
    expect(loaded.ready).toBe(true)
    expect(loaded.root).toBeDefined()
    expect(loaded.root?.children).toHaveLength(4)
    expect(loaded.boundingSphere?.radius).toBeGreaterThan(0)
    const expected = Cartesian3.fromDegrees(8, 46, 8)
    expect(Cartesian3.distance(loaded.boundingSphere!.center, expected)).toBeLessThan(1)
  })

  it("近相机 REPLACE 选中 4 个叶子", async () => {
    const { tileset } = createCityTilesetJson({ longitude: 8, latitude: 46, height: 8 })
    const loaded = await Cesium3DTileset.fromJson(tileset)
    const center = loaded.boundingSphere!.center
    const selected = selectTiles(loaded, {
      frameNumber: 1,
      camera: {
        positionWC: Cartesian3.add(center, new Cartesian3(20, 20, 20), new Cartesian3()),
        directionWC: new Cartesian3(0, 0, -1),
        frustum: { sseDenominator: 1 },
      },
      cullingVolume: undefined,
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      pixelRatio: 1,
      maximumScreenSpaceError: 16,
      afterRender: [],
      creditDisplay: undefined,
      passes: { render: true, pick: false },
    })
    expect(selected).toHaveLength(4)
    expect(selected.every((tile) => tile.parent === loaded.root)).toBe(true)
    const child = loaded.root!.children[0]!
    const translation = Matrix4.getTranslation(child.computedTransform, new Cartesian3())
    expect(Cartesian3.magnitude(translation)).toBeGreaterThan(1e6)
    await child.requestContent()
    expect(child.contentReady).toBe(true)
    const model = child.content.model
    expect(model).toBeDefined()
    const modelAt = Matrix4.getTranslation(model!.modelMatrix, new Cartesian3())
    expect(Cartesian3.distance(modelAt, translation)).toBeLessThan(1)
    const rot = Matrix4.getMatrix3(model!.modelMatrix, new Matrix3())
    expect(Matrix3.determinant(rot)).toBeCloseTo(1, 5)
    const primitive = model!.components.primitives[0]
    expect(primitive?.positions.length).toBeGreaterThan(8)
    expect(primitive?.indices.length).toBeGreaterThan(3)
  })

  it("SSE 随距离增大而减小", async () => {
    const { tileset } = createCityTilesetJson()
    const loaded = await Cesium3DTileset.fromJson(tileset)
    const tile = loaded.root!
    const near = computeScreenSpaceError(tile, {
      frameNumber: 1,
      camera: {
        positionWC: tile.boundingVolume.boundingSphere.center,
        directionWC: new Cartesian3(0, 0, -1),
        frustum: { sseDenominator: 1 },
      },
      cullingVolume: undefined,
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      pixelRatio: 1,
      maximumScreenSpaceError: 16,
      afterRender: [],
      creditDisplay: undefined,
      passes: { render: true, pick: false },
    })
    const farPos = Cartesian3.add(
      tile.boundingVolume.boundingSphere.center,
      new Cartesian3(1e5, 0, 0),
      new Cartesian3(),
    )
    const far = computeScreenSpaceError(tile, {
      frameNumber: 1,
      camera: {
        positionWC: farPos,
        directionWC: new Cartesian3(0, 0, -1),
        frustum: { sseDenominator: 1 },
      },
      cullingVolume: undefined,
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      pixelRatio: 1,
      maximumScreenSpaceError: 16,
      afterRender: [],
      creditDisplay: undefined,
      passes: { render: true, pick: false },
    })
    expect(near).toBeGreaterThan(far)
  })

  it("region / sphere 包围体可构造", () => {
    const sphere = createTileBoundingVolume({ sphere: [1, 2, 3, 10] }, Matrix4.IDENTITY)
    expect(sphere.boundingSphere.radius).toBe(10)
    const region = createTileBoundingVolume({ region: [0, 0, 0.1, 0.1, 0, 100] }, Matrix4.IDENTITY)
    expect(region.boundingSphere.radius).toBeGreaterThan(0)
  })

  it("样式表达式 color / 比较", () => {
    const style = new Cesium3DTileStyle({
      color: "color('#ff0000')",
      show: "${Height} > 10",
    })
    const feature = {
      getProperty(name: string): unknown {
        return name === "Height" ? 20 : undefined
      },
    }
    expect(style.evaluateShow(feature)).toBe(true)
    expect(style.evaluateColor(feature).red).toBeCloseTo(1)
    expect(new Expression("false").evaluateBoolean()).toBe(false)
  })

  it("Model.fromGltfAsync 内存 GLB", async () => {
    const model = await Model.fromGltfAsync({ gltf: createBoxGlb() })
    expect(model.ready).toBe(true)
    expect(model.components.primitives).toHaveLength(1)
    expect(model.getNode("Box")?.primitives).toHaveLength(1)
  })

  it("data URI Resource 可被 fromUrl 使用", async () => {
    const { tileset } = createCityTilesetJson()
    const uri = `data:application/json,${encodeURIComponent(JSON.stringify(tileset))}`
    const loaded = await Cesium3DTileset.fromUrl(new Resource({ url: uri }))
    expect(loaded.root?.children.length).toBe(4)
  })
})
