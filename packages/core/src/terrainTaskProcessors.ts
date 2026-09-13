/**
 * 可选地形 Worker。默认关闭（Node 同步路径）；浏览器可注入 TaskProcessor。
 */
import type { TaskProcessor } from "./TaskProcessor"

let heightmapProcessor: TaskProcessor | undefined
let quantizedMeshProcessor: TaskProcessor | undefined

/**
 * 注册高度图 / 量化网格 Worker。
 *
 * @param processors 可注入的 TaskProcessor
 */
export function setTerrainTaskProcessors(processors: {
  heightmap?: TaskProcessor
  quantizedMesh?: TaskProcessor
}): void {
  heightmapProcessor = processors.heightmap
  quantizedMeshProcessor = processors.quantizedMesh
}

/**
 * 高度图 TaskProcessor（未启用则为 undefined）。
 */
export function getHeightmapTaskProcessor(): TaskProcessor | undefined {
  return heightmapProcessor
}

/**
 * 量化网格 TaskProcessor（未启用则为 undefined）。
 */
export function getQuantizedMeshTaskProcessor(): TaskProcessor | undefined {
  return quantizedMeshProcessor
}
