/**
 * 隐式 tileset 描述。对标 Cesium `ImplicitTileset`。
 */
import { ImplicitSubdivisionScheme, type ImplicitTileCoordinates } from "./ImplicitTileCoordinates"

export interface ImplicitTilingJson {
  subdivisionScheme?: string
  subtreeLevels?: number
  availableLevels?: number
  subtrees?: { uri?: string }
}

/**
 * 根上的 implicitTiling。
 */
export class ImplicitTileset {
  readonly subdivisionScheme: number
  readonly subtreeLevels: number
  readonly availableLevels: number
  readonly subtreeUri: string

  /**
   * @param json implicitTiling
   */
  constructor(json: ImplicitTilingJson) {
    this.subdivisionScheme =
      json.subdivisionScheme === "OCTREE"
        ? ImplicitSubdivisionScheme.OCTREE
        : ImplicitSubdivisionScheme.QUADTREE
    this.subtreeLevels = json.subtreeLevels ?? 1
    this.availableLevels = json.availableLevels ?? 1
    this.subtreeUri = json.subtrees?.uri ?? ""
  }

  /**
   * 替换 subtree URI 模板。
   *
   * @param coordinates 坐标
   */
  getSubtreeUri(coordinates: ImplicitTileCoordinates): string {
    return this.subtreeUri
      .replace(/{level}/g, String(coordinates.level))
      .replace(/{x}/g, String(coordinates.x))
      .replace(/{y}/g, String(coordinates.y))
      .replace(/{z}/g, String(coordinates.z))
  }

  isOctree(): boolean {
    return this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE
  }
}
