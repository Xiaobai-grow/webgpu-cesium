/**
 * 隐式瓦片坐标。对标 Cesium `ImplicitTileCoordinates`。
 */
import { MortonOrder } from "./MortonOrder"

export const ImplicitSubdivisionScheme = {
  QUADTREE: 0,
  OCTREE: 1,
} as const

export type ImplicitSubdivisionSchemeValue =
  (typeof ImplicitSubdivisionScheme)[keyof typeof ImplicitSubdivisionScheme]

/**
 * (level, x, y, z) + Morton。
 */
export class ImplicitTileCoordinates {
  readonly level: number
  readonly x: number
  readonly y: number
  readonly z: number
  readonly subdivisionScheme: ImplicitSubdivisionSchemeValue

  /**
   * @param options 坐标
   */
  constructor(options: {
    level: number
    x: number
    y: number
    z?: number
    subdivisionScheme?: ImplicitSubdivisionSchemeValue
  }) {
    this.level = options.level
    this.x = options.x
    this.y = options.y
    this.z = options.z ?? 0
    this.subdivisionScheme = options.subdivisionScheme ?? ImplicitSubdivisionScheme.QUADTREE
  }

  get mortonIndex(): number {
    if (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
      return MortonOrder.encode3D(this.x, this.y, this.z)
    }
    return MortonOrder.encode2D(this.x, this.y)
  }

  /**
   * 子坐标。
   *
   * @param childIndex 0..3 或 0..7
   */
  deriveChild(childIndex: number): ImplicitTileCoordinates {
    const octree = this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE
    return new ImplicitTileCoordinates({
      level: this.level + 1,
      x: this.x * 2 + (childIndex & 1),
      y: this.y * 2 + ((childIndex >> 1) & 1),
      z: octree ? this.z * 2 + ((childIndex >> 2) & 1) : 0,
      subdivisionScheme: this.subdivisionScheme,
    })
  }

  toString(): string {
    return `${String(this.level)}/${String(this.x)}/${String(this.y)}/${String(this.z)}`
  }
}
