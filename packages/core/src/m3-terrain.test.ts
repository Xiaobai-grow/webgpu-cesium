import { afterEach, describe, expect, it } from "vitest"
import { ApproximateTerrainHeights } from "./ApproximateTerrainHeights"
import { ArcGISTiledElevationTerrainProvider } from "./ArcGISTiledElevationTerrainProvider"
import { BoundingSphere } from "./BoundingSphere"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { CesiumMath } from "./CesiumMath"
import { CesiumTerrainProvider } from "./CesiumTerrainProvider"
import { CustomHeightmapTerrainProvider } from "./CustomHeightmapTerrainProvider"
import { Ellipsoid } from "./Ellipsoid"
import { GeographicTilingScheme } from "./GeographicTilingScheme"
import { HeightmapTessellator } from "./HeightmapTessellator"
import { HeightmapTerrainData } from "./HeightmapTerrainData"
import { Ion } from "./Ion"
import { IonResource } from "./IonResource"
import { QuantizedMeshTerrainData } from "./QuantizedMeshTerrainData"
import { Ray } from "./Ray"
import { Rectangle } from "./Rectangle"
import { Resource } from "./Resource"
import { RuntimeError } from "./RuntimeError"
import { sampleTerrain } from "./sampleTerrain"
import { sampleTerrainMostDetailed } from "./sampleTerrainMostDetailed"
import { TerrainPicker } from "./TerrainPicker"
import { TileAvailability } from "./TileAvailability"
import { VerticalExaggeration } from "./VerticalExaggeration"
import { encodeQuantizedMesh, parseQuantizedMesh } from "./quantizedMesh"

const cesiumQuad = {
  quantizedU: [0, 0, 32767, 32767],
  quantizedV: [0, 32767, 0, 32767],
  quantizedHeight: [16384, 0, 32767, 16384],
  indices: [0, 2, 3, 0, 3, 1],
  westIndices: [0, 1],
  southIndices: [0, 2],
  eastIndices: [2, 3],
  northIndices: [1, 3],
  minimumHeight: -100,
  maximumHeight: 2101,
}

function makeRampHeightmap(width: number, height: number): Float32Array {
  const buffer = new Float32Array(width * height)
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      buffer[row * width + col] = col * 10 + row
    }
  }
  return buffer
}

describe("VerticalExaggeration", () => {
  it("相对 0 缩放高度", () => {
    expect(VerticalExaggeration.getHeight(100, 2, 0)).toBe(200)
    expect(VerticalExaggeration.getHeight(100, 2, 50)).toBe(150)
  })
})

describe("TileAvailability", () => {
  it("标记范围后 isTileAvailable / childMask", () => {
    const scheme = new GeographicTilingScheme()
    const availability = new TileAvailability(scheme, 4)
    availability.addAvailableTileRange(0, 0, 0, 1, 0)
    availability.addAvailableTileRange(1, 0, 0, 3, 1)
    expect(availability.isTileAvailable(0, 0, 0)).toBe(true)
    expect(availability.isTileAvailable(1, 0, 0)).toBe(true)
    const mask = availability.computeChildMaskForTile(0, 0, 0)
    expect(mask).toBe(15)
    const center = Cartographic.fromDegrees(-90, 0)
    expect(availability.computeMaximumLevelAtPosition(center)).toBeGreaterThanOrEqual(1)
  })
})

describe("ApproximateTerrainHeights", () => {
  it("initialize 后给出 min/max", async () => {
    await ApproximateTerrainHeights.initialize()
    const range = ApproximateTerrainHeights.getMinimumMaximumHeights(
      Rectangle.fromDegrees(-10, -10, 10, 10),
    )
    expect(range.maximumTerrainHeight).toBeGreaterThan(0)
    expect(range.minimumTerrainHeight).toBeLessThan(0)
    const sphere = ApproximateTerrainHeights.getBoundingSphere(Rectangle.fromDegrees(-1, -1, 1, 1))
    expect(sphere.radius).toBeGreaterThan(0)
  })
})

describe("HeightmapTerrainData M3", () => {
  it("双线性插值与 sampleTerrain 误差 < 1cm", async () => {
    const width = 5
    const height = 5
    const buffer = makeRampHeightmap(width, height)
    const data = new HeightmapTerrainData({ buffer, width, height })
    const rectangle = Rectangle.fromDegrees(0, 0, 4, 4)
    const atCorner = data.interpolateHeight(rectangle, rectangle.west, rectangle.north)
    expect(atCorner).toBeCloseTo(0, 5)
    const atEastNorth = data.interpolateHeight(rectangle, rectangle.east, rectangle.north)
    expect(atEastNorth).toBeCloseTo(40, 5)

    const provider = new CustomHeightmapTerrainProvider({
      width,
      height,
      callback: () => buffer,
      tilingScheme: new GeographicTilingScheme(),
    })
    const positions = [Cartographic.fromDegrees(2, 2)]
    await sampleTerrain(provider, 0, positions)
    const xy = provider.tilingScheme.positionToTileXY(positions[0]!, 0)
    expect(xy).toBeDefined()
    const tileRect = provider.tilingScheme.tileXYToRectangle(xy!.x, xy!.y, 0)
    const expected = data.interpolateHeight(
      tileRect,
      positions[0]!.longitude,
      positions[0]!.latitude,
    )
    expect(positions[0]!.height).toBeDefined()
    expect(Math.abs((positions[0]!.height ?? 0) - (expected ?? 0))).toBeLessThan(0.01)
  })

  it("裙边增加顶点与索引", () => {
    const rectangle = Rectangle.fromDegrees(-10, -10, 10, 10)
    const mesh = HeightmapTessellator.computeVertices({
      heightmap: new Uint8Array(16 * 16),
      width: 16,
      height: 16,
      rectangle,
      skirtHeight: 100,
    })
    expect(mesh.vertexCountWithoutSkirts).toBe(256)
    expect(mesh.indexCountWithoutSkirts).toBe(1350)
    expect(mesh.vertices.length).toBeGreaterThan(256 * 5)
    expect(mesh.indices.length).toBeGreaterThan(1350)
    expect(mesh.minimumHeight).toBeLessThan(0)
  })

  it("upsample 子瓦片高度落在父范围内", async () => {
    const buffer = makeRampHeightmap(5, 5)
    const parent = new HeightmapTerrainData({ buffer, width: 5, height: 5 })
    const scheme = new GeographicTilingScheme()
    const child = await parent.upsample(scheme, 0, 0, 0, 0, 0, 1)
    expect(child).toBeDefined()
    const childData = child as HeightmapTerrainData
    const rect = scheme.tileXYToRectangle(0, 0, 1)
    const h = childData.interpolateHeight(rect, rect.west, rect.north)
    expect(h).toBeGreaterThanOrEqual(0)
  })
})

describe("QuantizedMeshTerrainData", () => {
  it("编码再解析后插值与 Cesium 示例一致", async () => {
    const buffer = encodeQuantizedMesh({
      ...cesiumQuad,
      center: new Cartesian3(1, 2, 3),
      boundingSphere: new BoundingSphere(new Cartesian3(1, 2, 3), 10000),
      horizonOcclusionPoint: new Cartesian3(3, 2, 1),
    })
    const parsed = parseQuantizedMesh(buffer)
    expect(parsed.quantizedVertices.length).toBe(12)
    expect(parsed.indices.length).toBe(6)
    const data = new QuantizedMeshTerrainData({
      quantizedVertices: parsed.quantizedVertices,
      indices: parsed.indices,
      minimumHeight: parsed.minimumHeight,
      maximumHeight: parsed.maximumHeight,
      boundingSphere: parsed.boundingSphere,
      horizonOcclusionPoint: parsed.horizonOcclusionPoint,
      westIndices: parsed.westIndices,
      southIndices: parsed.southIndices,
      eastIndices: parsed.eastIndices,
      northIndices: parsed.northIndices,
      westSkirtHeight: 1,
      southSkirtHeight: 1,
      eastSkirtHeight: 1,
      northSkirtHeight: 1,
    })
    const rectangle = Rectangle.fromDegrees(-1, -1, 1, 1)
    const sw = data.interpolateHeight(rectangle, rectangle.west, rectangle.south)
    const ne = data.interpolateHeight(rectangle, rectangle.east, rectangle.north)
    expect(sw).toBeCloseTo(CesiumMath.lerp(-100, 2101, 16384 / 32767), 3)
    expect(ne).toBeCloseTo(CesiumMath.lerp(-100, 2101, 16384 / 32767), 3)
    const mesh = await data.createMesh({
      tilingScheme: {
        ellipsoid: Ellipsoid.WGS84,
        tileXYToRectangle: () => rectangle,
      },
      x: 0,
      y: 0,
      level: 0,
    })
    expect(mesh.vertexCountWithoutSkirts).toBe(4)
    expect(mesh.vertices.length).toBeGreaterThan(4 * 5)
  })
})

describe("sampleTerrainMostDetailed", () => {
  it("无 availability 时抛错", async () => {
    const provider = new CustomHeightmapTerrainProvider({
      width: 4,
      height: 4,
      callback: () => new Float32Array(16),
    })
    await expect(sampleTerrainMostDetailed(provider, [new Cartographic(0, 0, 0)])).rejects.toThrow(
      /availability/,
    )
  })
})

describe("TerrainPicker", () => {
  it("天顶射线打中零高度网格", async () => {
    const rectangle = Rectangle.fromDegrees(-1, -1, 1, 1)
    const data = new HeightmapTerrainData({
      buffer: new Float32Array(17 * 17),
      width: 17,
      height: 17,
    })
    const mesh = await data.createMesh({
      tilingScheme: {
        ellipsoid: Ellipsoid.WGS84,
        tileXYToRectangle: () => rectangle,
      },
      x: 0,
      y: 0,
      level: 0,
    })
    const origin = Cartesian3.fromDegrees(0, 0, 1e6)
    const surface = Cartesian3.fromDegrees(0, 0, 0)
    const direction = Cartesian3.normalize(
      Cartesian3.subtract(surface, origin, new Cartesian3()),
      new Cartesian3(),
    )
    const hit = TerrainPicker.pick(mesh, new Ray(origin, direction))
    expect(hit).toBeDefined()
    const carto = Ellipsoid.WGS84.cartesianToCartographic(hit!)
    expect(carto).toBeDefined()
    expect(Math.abs(carto!.height)).toBeLessThan(300)
  })
})

describe("CesiumTerrainProvider.fromUrl", () => {
  const previousFetch = Resource.fetchImpl

  afterEach(() => {
    Resource.fetchImpl = previousFetch
  })

  it("解析 layer.json 并解码合成 quantized-mesh", async () => {
    const tile = encodeQuantizedMesh({
      ...cesiumQuad,
      center: Cartesian3.fromDegrees(0, 0, 0),
      boundingSphere: new BoundingSphere(Cartesian3.fromDegrees(0, 0, 0), 1e6),
      horizonOcclusionPoint: new Cartesian3(1, 0, 0),
    })
    Resource.fetchImpl = (input) => {
      const url = String(input)
      if (url.includes("layer.json")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: { get: () => "application/json" },
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          text: () => Promise.resolve(""),
          json: () =>
            Promise.resolve({
              format: "quantized-mesh-1.0",
              tiles: ["{z}/{x}/{y}.terrain"],
              projection: "EPSG:4326",
              scheme: "tms",
              maxzoom: 2,
              available: [[{ startX: 0, startY: 0, endX: 1, endY: 0 }]],
            }),
          blob: () => Promise.resolve({}),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => "application/octet-stream" },
        arrayBuffer: () => Promise.resolve(tile.slice(0)),
        text: () => Promise.resolve(""),
        json: () => Promise.resolve({}),
        blob: () => Promise.resolve({}),
      })
    }
    const provider = await CesiumTerrainProvider.fromUrl("https://example.test/terrain/")
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme)
    expect(provider.availability?.isTileAvailable(0, 0, 0)).toBe(true)
    const data = await provider.requestTileGeometry(0, 0, 0)
    expect(data).toBeInstanceOf(QuantizedMeshTerrainData)
    const mesh = await data!.createMesh({
      tilingScheme: provider.tilingScheme,
      x: 0,
      y: 0,
      level: 0,
    })
    expect(mesh.vertexCountWithoutSkirts).toBe(4)
  })

  it("解析 mars3d 形态 layer.json 并露出 attribution", async () => {
    const tile = encodeQuantizedMesh({
      ...cesiumQuad,
      center: Cartesian3.fromDegrees(103, 31, 3000),
      boundingSphere: new BoundingSphere(Cartesian3.fromDegrees(103, 31, 3000), 1e5),
      horizonOcclusionPoint: new Cartesian3(1, 0, 0),
    })
    Resource.fetchImpl = (input) => {
      const url = String(input)
      if (url.includes("layer.json")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: { get: () => "application/json" },
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          text: () => Promise.resolve(""),
          json: () =>
            Promise.resolve({
              name: "Mars3D中国地形12.5米",
              attribution: "http://mars3d.cn",
              minzoom: 0,
              maxzoom: 15,
              bounds: [-180, -90, 180, 90],
              projection: "EPSG:4326",
              scheme: "tms",
              version: "1.0.0",
              tilejson: "1.0",
              format: "quantized-mesh-1.0",
              tiles: ["{z}/{x}/{y}.terrain"],
              extensions: ["octvertexnormals"],
              available: [[{ startX: 0, startY: 0, endX: 1, endY: 0 }]],
            }),
          blob: () => Promise.resolve({}),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => "application/octet-stream" },
        arrayBuffer: () => Promise.resolve(tile.slice(0)),
        text: () => Promise.resolve(""),
        json: () => Promise.resolve({}),
        blob: () => Promise.resolve({}),
      })
    }
    const provider = await CesiumTerrainProvider.fromUrl("http://example.test/mars3d/")
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme)
    expect(provider.credit?.text).toContain("mars3d.cn")
    expect(provider.hasVertexNormals).toBe(true)
    expect(provider.getTileDataAvailable(0, 0, 0)).toBe(true)
    const data = await provider.requestTileGeometry(0, 0, 0)
    expect(data).toBeInstanceOf(QuantizedMeshTerrainData)
  })
})

describe("IonResource", () => {
  const previousFetch = Resource.fetchImpl
  afterEach(() => {
    Resource.fetchImpl = previousFetch
    Ion.defaultAccessToken = ""
  })

  it("无 token 时 fromAssetId 抛错", async () => {
    await expect(IonResource.fromAssetId(1)).rejects.toBeInstanceOf(RuntimeError)
  })

  it("有 token 时拉 endpoint", async () => {
    Ion.defaultAccessToken = "test-token"
    Resource.fetchImpl = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => "application/json" },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        text: () => Promise.resolve(""),
        json: () =>
          Promise.resolve({
            url: "https://assets.example/terrain/",
            attributions: [{ html: "ion terrain", collapsible: false }],
          }),
        blob: () => Promise.resolve({}),
      })
    const resource = await IonResource.fromAssetId(1)
    expect(resource.url).toContain("assets.example")
    expect(resource.credits[0]?.text).toContain("ion terrain")
  })
})

describe("ArcGISTiledElevationTerrainProvider", () => {
  const previousFetch = Resource.fetchImpl
  afterEach(() => {
    Resource.fetchImpl = previousFetch
  })

  it("LERC 服务拒绝解码", async () => {
    Resource.fetchImpl = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => "application/json" },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        text: () => Promise.resolve(""),
        json: () =>
          Promise.resolve({
            copyrightText: "Esri",
            cacheType: "esriMapCacheStorageModeLERC",
            tileInfo: {
              rows: 4,
              cols: 4,
              lods: [{ level: 0 }],
              spatialReference: { wkid: 4326 },
            },
          }),
        blob: () => Promise.resolve({}),
      })
    const provider = await ArcGISTiledElevationTerrainProvider.fromUrl(
      "https://example.test/arcgis/",
    )
    await expect(provider.requestTileGeometry(0, 0, 0)).rejects.toThrow(/LERC/)
  })
})
