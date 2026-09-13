/**
 * 地平线遮挡：EllipsoidalOccluder 包装。
 *
 * 不用球心做 isPointVisible：0 级瓦片包围球心常在地球内部，会被误剔。
 */
import {
  type BoundingSphere,
  Cartesian3,
  type Ellipsoid,
  EllipsoidalOccluder,
} from "@webgpu-cesium/core"

const toCenterScratch = new Cartesian3()
const nearestScratch = new Cartesian3()

/**
 * 四叉树地平线剔除。
 */
export class QuadtreeOccluders {
  readonly ellipsoid: EllipsoidalOccluder
  private readonly _minRadius: number

  /**
   * @param ellipsoid 椭球
   */
  constructor(ellipsoid: Ellipsoid) {
    this.ellipsoid = new EllipsoidalOccluder(ellipsoid)
    this._minRadius = ellipsoid.minimumRadius
  }

  /**
   * 更新相机位置。
   *
   * @param position 相机 ECEF
   */
  setCameraPosition(position: Cartesian3): void {
    this.ellipsoid.cameraPosition = position
  }

  /**
   * 包围球是否可能可见。
   *
   * @param sphere ECEF 包围球
   */
  isBoundingSphereVisible(sphere: BoundingSphere): boolean {
    const camera = this.ellipsoid.cameraPosition
    const toCenter = Cartesian3.subtract(sphere.center, camera, toCenterScratch)
    const distance = Cartesian3.magnitude(toCenter)
    if (distance <= sphere.radius + 1) {
      return true
    }
    // 大瓦片：球心在地球内，球心点测不可用
    if (sphere.radius > this._minRadius * 0.35) {
      return true
    }
    if (this.ellipsoid.isPointVisible(sphere.center)) {
      return true
    }
    Cartesian3.normalize(toCenter, toCenter)
    const nearest = Cartesian3.add(
      camera,
      Cartesian3.multiplyByScalar(toCenter, distance - sphere.radius, nearestScratch),
      nearestScratch,
    )
    return this.ellipsoid.isPointVisible(nearest)
  }
}
