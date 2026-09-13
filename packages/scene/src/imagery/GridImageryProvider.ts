/**
 * 程序化网格 / 坐标影像，供无网络测试与回退。
 */
import {
  type Credit,
  Event,
  GeographicTilingScheme,
  type TileProviderError,
  type TilingScheme,
  WebMercatorTilingScheme,
} from "@webgpu-cesium/core"
import { ImageryProvider } from "./ImageryProvider"
import { NeverTileDiscardPolicy } from "./TileDiscardPolicy"

export interface GridImageryProviderOptions {
  tilingScheme?: TilingScheme
  tileWidth?: number
  tileHeight?: number
  cells?: number
  color?: { r: number; g: number; b: number; a: number }
  glowColor?: { r: number; g: number; b: number; a: number }
  backgroundColor?: { r: number; g: number; b: number; a: number }
  credit?: Credit
}

/**
 * 彩色网格瓦片（createImageBitmap(ImageData)）。
 */
export class GridImageryProvider extends ImageryProvider {
  readonly ready = true
  readonly tilingScheme: TilingScheme
  readonly tileWidth: number
  readonly tileHeight: number
  readonly maximumLevel = undefined
  readonly minimumLevel = 0
  readonly credit: Credit | undefined
  readonly errorEvent = new Event<[TileProviderError]>()
  readonly hasAlphaChannel = true
  readonly tileDiscardPolicy = new NeverTileDiscardPolicy()
  private readonly _cells: number
  private readonly _color: { r: number; g: number; b: number; a: number }

  /**
   * @param options 网格参数
   */
  constructor(options?: GridImageryProviderOptions) {
    super()
    this.tilingScheme = options?.tilingScheme ?? new WebMercatorTilingScheme()
    this.tileWidth = options?.tileWidth ?? 256
    this.tileHeight = options?.tileHeight ?? 256
    this._cells = options?.cells ?? 8
    this._color = options?.color ?? { r: 40, g: 140, b: 220, a: 255 }
    this.credit = options?.credit
  }

  /**
   * 生成网格 ImageBitmap。
   *
   * @param x 列
   * @param y 行
   * @param level LOD
   */
  requestImage(x: number, y: number, level: number): Promise<ImageBitmap> {
    const width = this.tileWidth
    const height = this.tileHeight
    const data = new Uint8ClampedArray(width * height * 4)
    const hue = ((x * 37 + y * 17 + level * 53) % 180) + 40
    const baseR = (this._color.r + hue) % 200
    const baseG = (this._color.g + x * 13) % 200
    const baseB = (this._color.b + y * 11) % 220
    const cell = Math.max(1, (width / this._cells) | 0)
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const i = (row * width + col) * 4
        const grid = col % cell === 0 || row % cell === 0
        data[i] = grid ? 255 : 40 + baseR
        data[i + 1] = grid ? 255 : 60 + (baseG >> 1)
        data[i + 2] = grid ? 220 : 80 + (baseB >> 1)
        data[i + 3] = 255
      }
    }
    const imageData = new ImageData(data, width, height)
    const create = globalThis.createImageBitmap
    if (typeof create !== "function") {
      return Promise.reject(new Error("createImageBitmap is not available"))
    }
    return create(imageData)
  }
}

void GeographicTilingScheme
