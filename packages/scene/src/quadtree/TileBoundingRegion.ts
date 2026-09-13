/**
 * 瓦片经纬矩形 + 高度范围的包围体。
 */
import {
  BoundingSphere,
  Cartesian3,
  type Ellipsoid,
  type Rectangle,
  type TerrainMesh,
} from "@webgpu-cesium/core"

/**
 * 由矩形估计 ECEF 包围球。
 */
export class TileBoundingRegion {
  rectangle: Rectangle
  minimumHeight: number
  maximumHeight: number
  boundingSphere: BoundingSphere

  /**
   * @param rectangle 经纬矩形
   * @param ellipsoid 椭球
   * @param minimumHeight 最小高
   * @param maximumHeight 最大高
   */
  constructor(rectangle: Rectangle, ellipsoid: Ellipsoid, minimumHeight = 0, maximumHeight = 0) {
    this.rectangle = rectangle
    this.minimumHeight = minimumHeight
    this.maximumHeight = maximumHeight
    this.boundingSphere = BoundingSphere.fromRectangle3D(
      rectangle,
      ellipsoid,
      (minimumHeight + maximumHeight) * 0.5,
    )
  }

  /**
   * 相机到包围球表面的距离。
   *
   * @param position 相机位置
   */
  distanceToCamera(position: Cartesian3): number {
    const toCenter = Cartesian3.subtract(this.boundingSphere.center, position, distanceScratch)
    return Math.max(0, Cartesian3.magnitude(toCenter) - this.boundingSphere.radius)
  }

  /**
   * 用真实网格高度更新包围体。
   *
   * @param mesh 地形网格
   */
  updateFromMesh(mesh: TerrainMesh): void {
    this.minimumHeight = mesh.minimumHeight
    this.maximumHeight = mesh.maximumHeight
    this.boundingSphere = new BoundingSphere(
      mesh.boundingSphere3D.center,
      mesh.boundingSphere3D.radius,
    )
  }
}

const distanceScratch = new Cartesian3()
