/**
 * 瓦片要素。对标 Cesium `Cesium3DTileFeature`。
 */
import { Color } from "@webgpu-cesium/core"
import type { Cesium3DTile } from "../tileset/Cesium3DTile"
import type { Cesium3DTileset } from "../tileset/Cesium3DTileset"

/**
 * 单个 batch / feature。
 */
export class Cesium3DTileFeature {
  readonly tileset: Cesium3DTileset
  readonly tile: Cesium3DTile
  readonly featureId: number
  show = true
  color = new Color(1, 1, 1, 1)
  private readonly _properties: Record<string, unknown>

  /**
   * @param tile 所属瓦片
   * @param featureId 索引
   * @param properties 批表属性
   */
  constructor(tile: Cesium3DTile, featureId: number, properties: Record<string, unknown>) {
    this.tile = tile
    this.tileset = tile.tileset
    this.featureId = featureId
    this._properties = properties
  }

  /**
   * 读属性。
   *
   * @param name 名
   */
  getProperty(name: string): unknown {
    return this._properties[name]
  }

  /**
   * 属性名。
   */
  getPropertyIds(): string[] {
    return Object.keys(this._properties)
  }

  hasProperty(name: string): boolean {
    return name in this._properties
  }
}

export class Cesium3DTilePointFeature extends Cesium3DTileFeature {}
