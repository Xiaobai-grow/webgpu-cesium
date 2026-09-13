/**
 * DirectionalLight：固定方向（ECEF）。
 */
import { Cartesian3, type Color } from "@webgpu-cesium/core"
import { Light } from "./Light"

export class DirectionalLight extends Light {
  direction: Cartesian3

  /**
   * @param options 方向指向光源（与 Cesium 一致：从表面指向光）
   */
  constructor(options: { direction?: Cartesian3; color?: Color; intensity?: number } = {}) {
    super(options)
    this.direction = options.direction ?? new Cartesian3(0, 0, 1)
  }
}
