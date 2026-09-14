/**
 * SunLight：方向由 EnvironmentState / 历表驱动。
 */
import type { Color } from "@webgpu-cesium/core"
import { Light } from "./Light"

export class SunLight extends Light {
  /**
   * @param options 颜色与强度倍率
   */
  constructor(options: { color?: Color; intensity?: number } = {}) {
    super(options)
  }
}
