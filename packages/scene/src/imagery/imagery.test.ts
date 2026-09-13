import { describe, expect, it } from "vitest"
import { Credit, WebMercatorTilingScheme } from "@webgpu-cesium/core"
import { ImageryLayer } from "./ImageryLayer"
import { ImageryLayerCollection } from "./ImageryLayerCollection"
import { ImageryState } from "./ImageryState"
import { OpenStreetMapImageryProvider, OSM_OFFICIAL_URL } from "./OpenStreetMapImageryProvider"
import { TileMapServiceImageryProvider } from "./TileMapServiceImageryProvider"
import { UrlTemplateImageryProvider } from "./UrlTemplateImageryProvider"

describe("UrlTemplateImageryProvider", () => {
  it("展开 {z}/{x}/{y} 与 {reverseY}", () => {
    const provider = new UrlTemplateImageryProvider({
      url: "https://example.test/{z}/{x}/{y}.png",
    })
    expect(provider.buildImageUrl(3, 1, 2)).toBe("https://example.test/2/3/1.png")
    const tms = new UrlTemplateImageryProvider({
      url: "https://example.test/{z}/{reverseY}/{x}.png",
    })
    // WebMercator level 2 有 4 行，y=1 → reverseY=2
    expect(tms.buildImageUrl(3, 1, 2)).toBe("https://example.test/2/2/3.png")
  })
})

describe("OpenStreetMapImageryProvider", () => {
  it("默认 CORS URL 与 OSM Credit", () => {
    const provider = new OpenStreetMapImageryProvider()
    expect(provider.url.startsWith(OSM_OFFICIAL_URL)).toBe(true)
    expect(provider.buildImageUrl(1, 2, 3)).toContain("/3/1/2.png")
    expect(provider.credit).toBeInstanceOf(Credit)
    expect(provider.credit?.text).toMatch(/OpenStreetMap/)
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme)
  })
})

describe("TileMapServiceImageryProvider", () => {
  it("使用 reverseY 模板", () => {
    const provider = new TileMapServiceImageryProvider({
      url: "https://example.test/tms",
      tilingScheme: new WebMercatorTilingScheme(),
    })
    expect(provider.buildImageUrl(0, 0, 1)).toMatch(/\/1\/1\/0\.png$/)
  })
})

describe("ImageryLayer", () => {
  it("缓存 Imagery 并创建 TileImagery", () => {
    const provider = new UrlTemplateImageryProvider({
      url: "https://example.test/{z}/{x}/{y}.png",
    })
    const layer = new ImageryLayer(provider)
    const a = layer.getImageryFromCache(1, 2, 3)
    const b = layer.getImageryFromCache(1, 2, 3)
    expect(a).toBe(b)
    expect(a.state).toBe(ImageryState.UNLOADED)
    const tile = layer.createTileImagery(1, 2, 3)
    expect(tile?.loadingImagery).toBe(a)
    expect(a.referenceCount).toBe(1)
  })
})

describe("ImageryLayerCollection", () => {
  it("添加与移除", () => {
    const collection = new ImageryLayerCollection()
    const provider = new UrlTemplateImageryProvider({ url: "https://example.test/{z}/{x}/{y}.png" })
    const layer = collection.addImageryProvider(provider)
    expect(collection.length).toBe(1)
    expect(collection.get(0)).toBe(layer)
    expect(collection.remove(layer)).toBe(true)
    expect(collection.length).toBe(0)
  })
})
