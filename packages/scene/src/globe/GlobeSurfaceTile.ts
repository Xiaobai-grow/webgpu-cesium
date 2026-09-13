/**
 * 单块地表：地形网格 + 影像引用 + GPU buffer。
 */
import type { TerrainMesh } from "@webgpu-cesium/core"
import type { QuadtreeTileData } from "../quadtree/QuadtreeTile"
import type { TileImagery } from "../imagery/TileImagery"
import { TerrainState, type TerrainStateValue } from "./TerrainState"

/**
 * 挂在 QuadtreeTile.data 上。
 */
export class GlobeSurfaceTile implements QuadtreeTileData {
  terrainState: TerrainStateValue = TerrainState.UNLOADED
  mesh: TerrainMesh | undefined
  vertexBuffer: GPUBuffer | undefined
  indexBuffer: GPUBuffer | undefined
  tileUniformBuffer: GPUBuffer | undefined
  tileBindGroup: GPUBindGroup | undefined
  tileImagery: TileImagery[] = []
  renderable = false
  indexCount = 0

  /**
   * 释放 GPU 与影像引用。
   */
  freeResources(): void {
    this.vertexBuffer?.destroy()
    this.indexBuffer?.destroy()
    this.tileUniformBuffer?.destroy()
    this.vertexBuffer = undefined
    this.indexBuffer = undefined
    this.tileUniformBuffer = undefined
    this.tileBindGroup = undefined
    for (const imagery of this.tileImagery) {
      imagery.freeResources()
    }
    this.tileImagery.length = 0
    this.mesh = undefined
    this.renderable = false
    this.terrainState = TerrainState.UNLOADED
  }
}
