/**
 * 调试用：在瓦片上写 z/x/y（网格底色）。
 */
import { GridImageryProvider, type GridImageryProviderOptions } from "./GridImageryProvider"

/**
 * 与 Grid 相同的程序化瓦片（M2 不画文字，颜色随坐标变化即可区分）。
 */
export class TileCoordinatesImageryProvider extends GridImageryProvider {
  /**
   * @param options 网格参数
   */
  constructor(options?: GridImageryProviderOptions) {
    super(options)
  }
}
