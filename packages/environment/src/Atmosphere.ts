/**
 * 大气参数（保留 Cesium Atmosphere 属性名）。
 */
import { Cartesian3, Color } from "@webgpu-cesium/core"

export class Atmosphere {
  show = true
  lightIntensity = 20
  rayleighCoefficient = new Cartesian3(5.802e-6, 13.558e-6, 33.1e-6)
  mieCoefficient = 3.996e-6
  mieAnisotropy = 0.8
  rayleighScaleHeight = 8000
  mieScaleHeight = 1200
  hueShift = 0
  groundAlbedo = new Color(0.3, 0.3, 0.3, 1)
}
