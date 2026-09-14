/**
 * 瓦片包围体：region / sphere / box。
 */
import {
  BoundingSphere,
  Cartesian3,
  type CullingVolume,
  Ellipsoid,
  Intersect,
  type IntersectValue,
  Matrix3,
  Matrix4,
  OrientedBoundingBox,
  type Plane,
  Rectangle,
} from "@webgpu-cesium/core"

export interface TilesetBoundingVolumeJson {
  region?: number[]
  sphere?: number[]
  box?: number[]
}

/**
 * 可求交、可算 SSE 距离的包围体。
 */
export interface TileBoundingVolume {
  boundingSphere: BoundingSphere
  distanceToCamera(position: Cartesian3): number
  intersectPlane(plane: Plane): IntersectValue
  transform(matrix: Matrix4): TileBoundingVolume
}

/**
 * 球。
 */
export class TileBoundingSphere implements TileBoundingVolume {
  readonly boundingSphere: BoundingSphere

  /**
   * @param center 中心
   * @param radius 半径
   */
  constructor(center: Cartesian3, radius: number) {
    this.boundingSphere = new BoundingSphere(center, radius)
  }

  distanceToCamera(position: Cartesian3): number {
    return Math.max(
      0,
      Cartesian3.distance(this.boundingSphere.center, position) - this.boundingSphere.radius,
    )
  }

  intersectPlane(plane: Plane): IntersectValue {
    return this.boundingSphere.intersectPlane(plane)
  }

  transform(matrix: Matrix4): TileBoundingVolume {
    const center = Matrix4.multiplyByPoint(matrix, this.boundingSphere.center, new Cartesian3())
    const scale = Matrix4.getMaximumScale(matrix)
    return new TileBoundingSphere(center, this.boundingSphere.radius * scale)
  }
}

/**
 * OBB（tileset.json `box`）。
 */
export class TileOrientedBoundingBox implements TileBoundingVolume {
  readonly box: OrientedBoundingBox
  readonly boundingSphere: BoundingSphere

  /**
   * @param center 中心
   * @param halfAxes 半轴
   */
  constructor(center: Cartesian3, halfAxes: Matrix3) {
    this.box = new OrientedBoundingBox(center, halfAxes)
    this.boundingSphere = BoundingSphere.fromOrientedBoundingBox(this.box)
  }

  distanceToCamera(position: Cartesian3): number {
    return Math.sqrt(Math.max(0, this.box.distanceSquaredTo(position)))
  }

  intersectPlane(plane: Plane): IntersectValue {
    return this.box.intersectPlane(plane)
  }

  transform(matrix: Matrix4): TileBoundingVolume {
    const center = Matrix4.multiplyByPoint(matrix, this.box.center, new Cartesian3())
    const half = Matrix3.multiply(
      Matrix4.getMatrix3(matrix, new Matrix3()),
      this.box.halfAxes,
      new Matrix3(),
    )
    return new TileOrientedBoundingBox(center, half)
  }
}

/**
 * region：弧度矩形 + 高度。
 */
export class TileBoundingRegion implements TileBoundingVolume {
  readonly rectangle: Rectangle
  readonly minimumHeight: number
  readonly maximumHeight: number
  readonly boundingSphere: BoundingSphere
  private readonly _obb: OrientedBoundingBox

  /**
   * @param region [west, south, east, north, minH, maxH]
   * @param ellipsoid 椭球
   */
  constructor(region: number[], ellipsoid: Ellipsoid = Ellipsoid.default) {
    this.rectangle = new Rectangle(region[0] ?? 0, region[1] ?? 0, region[2] ?? 0, region[3] ?? 0)
    this.minimumHeight = region[4] ?? 0
    this.maximumHeight = region[5] ?? 0
    this.boundingSphere = BoundingSphere.fromRectangle3D(
      this.rectangle,
      ellipsoid,
      this.maximumHeight,
    )
    this._obb = OrientedBoundingBox.fromRectangle(
      this.rectangle,
      this.minimumHeight,
      this.maximumHeight,
      ellipsoid,
    )
  }

  distanceToCamera(position: Cartesian3): number {
    return Math.sqrt(Math.max(0, this._obb.distanceSquaredTo(position)))
  }

  intersectPlane(plane: Plane): IntersectValue {
    return this._obb.intersectPlane(plane)
  }

  transform(_matrix: Matrix4): TileBoundingVolume {
    return this
  }
}

/**
 * 从 tileset.json boundingVolume 构造。
 *
 * @param json 体积
 * @param transform 父变换
 * @param ellipsoid 椭球
 */
export function createTileBoundingVolume(
  json: TilesetBoundingVolumeJson | undefined,
  transform: Matrix4,
  ellipsoid: Ellipsoid = Ellipsoid.default,
): TileBoundingVolume {
  if (json?.sphere && json.sphere.length >= 4) {
    const sphere = new TileBoundingSphere(
      new Cartesian3(json.sphere[0] ?? 0, json.sphere[1] ?? 0, json.sphere[2] ?? 0),
      json.sphere[3] ?? 0,
    )
    return Matrix4.equals(transform, Matrix4.IDENTITY) ? sphere : sphere.transform(transform)
  }
  if (json?.box && json.box.length >= 12) {
    const center = new Cartesian3(json.box[0] ?? 0, json.box[1] ?? 0, json.box[2] ?? 0)
    const half = Matrix3.fromColumnMajorArray([
      json.box[3] ?? 0,
      json.box[4] ?? 0,
      json.box[5] ?? 0,
      json.box[6] ?? 0,
      json.box[7] ?? 0,
      json.box[8] ?? 0,
      json.box[9] ?? 0,
      json.box[10] ?? 0,
      json.box[11] ?? 0,
    ])
    const box = new TileOrientedBoundingBox(center, half)
    return Matrix4.equals(transform, Matrix4.IDENTITY) ? box : box.transform(transform)
  }
  if (json?.region && json.region.length >= 6) {
    return new TileBoundingRegion(json.region, ellipsoid)
  }
  return new TileBoundingSphere(Matrix4.getTranslation(transform, new Cartesian3()), 1)
}

/**
 * 视锥可见性。
 *
 * @param volume 包围体
 * @param culling 裁剪体
 */
export function boundingVolumeVisible(
  volume: TileBoundingVolume,
  culling: CullingVolume | undefined,
): boolean {
  if (!culling) {
    return true
  }
  return culling.computeVisibility(volume) !== Intersect.OUTSIDE
}
