/**
 * 高低位 RTE 辅助（为 M9 图元准备）。编码沿用 core.EncodedCartesian3。
 */
import { Cartesian3, EncodedCartesian3 } from "@webgpu-cesium/core"

const encoded = new EncodedCartesian3()

/**
 * 把 ECEF 中心写成 Tile/Object uniform 的 high/low（各 3 个 f32）。
 *
 * @param center 世界坐标
 * @param dest 至少 8 个 f32（high.xyz + pad + low.xyz）
 */
export function writeCenterRte(center: Cartesian3, dest: Float32Array): void {
  EncodedCartesian3.fromCartesian(center, encoded)
  dest[0] = encoded.high.x
  dest[1] = encoded.high.y
  dest[2] = encoded.high.z
  dest[4] = encoded.low.x
  dest[5] = encoded.low.y
  dest[6] = encoded.low.z
}

/**
 * 顶点相对中心的局部偏移（f32）。
 *
 * @param world 世界坐标
 * @param center 中心
 * @param result 局部
 */
export function worldToLocalRte(
  world: Cartesian3,
  center: Cartesian3,
  result: Cartesian3,
): Cartesian3 {
  return Cartesian3.subtract(world, center, result)
}
