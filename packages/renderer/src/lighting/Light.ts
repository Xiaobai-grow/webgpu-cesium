/**
 * Light 基类（Cesium 原名）。
 */
import { Color } from "@webgpu-cesium/core"

export class Light {
  color: Color
  intensity: number

  /**
   * @param options 颜色与强度
   */
  constructor(options: { color?: Color; intensity?: number } = {}) {
    this.color = options.color ?? new Color(1, 1, 1, 1)
    this.intensity = options.intensity ?? 1
  }
}
