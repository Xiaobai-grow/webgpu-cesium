/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Cartesian3 } from "./Cartesian3"
import { Cartesian4 } from "./Cartesian4"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { Intersect, type IntersectValue } from "./Intersect"
import { Plane } from "./Plane"
import type { BoundingSphere } from "./BoundingSphere"

/** 可用平面求交的包围体 */
export interface CullingBoundingVolume {
  intersectPlane(plane: Plane): IntersectValue
}

const faces = [new Cartesian3(), new Cartesian3(), new Cartesian3()]
Cartesian3.clone(Cartesian3.UNIT_X, faces[0])
Cartesian3.clone(Cartesian3.UNIT_Y, faces[1])
Cartesian3.clone(Cartesian3.UNIT_Z, faces[2])

const scratchPlaneCenter = new Cartesian3()
const scratchPlaneNormal = new Cartesian3()
const scratchPlane = new Plane(new Cartesian3(1.0, 0.0, 0.0), 0.0)

/**
 * 由一组裁剪平面定义的剔除体积。
 * 对标 Cesium `Core/CullingVolume.js`。
 */
export class CullingVolume {
  planes: Cartesian4[]

  /**
   * @param planes 平面，xyz 为单位法线、w 为到原点距离
   */
  constructor(planes?: Cartesian4[]) {
    this.planes = planes ?? []
  }

  /**
   * 由包围球生成轴对齐的六面剔除盒。
   *
   * @param boundingSphere 包围球
   * @param result 可选结果
   */
  static fromBoundingSphere(boundingSphere: BoundingSphere, result?: CullingVolume): CullingVolume {
    if (!defined(boundingSphere)) {
      throw new DeveloperError("boundingSphere is required.")
    }
    const out = defined(result) ? result : new CullingVolume()
    const length = faces.length
    const planes = out.planes
    planes.length = 2 * length
    const center = boundingSphere.center
    const radius = boundingSphere.radius
    let planeIndex = 0
    for (let i = 0; i < length; ++i) {
      const faceNormal = faces[i]!
      let plane0 = planes[planeIndex]
      let plane1 = planes[planeIndex + 1]
      if (!defined(plane0)) {
        plane0 = new Cartesian4()
        planes[planeIndex] = plane0
      }
      if (!defined(plane1)) {
        plane1 = new Cartesian4()
        planes[planeIndex + 1] = plane1
      }
      Cartesian3.multiplyByScalar(faceNormal, -radius, scratchPlaneCenter)
      Cartesian3.add(center, scratchPlaneCenter, scratchPlaneCenter)
      plane0.x = faceNormal.x
      plane0.y = faceNormal.y
      plane0.z = faceNormal.z
      plane0.w = -Cartesian3.dot(faceNormal, scratchPlaneCenter)

      Cartesian3.multiplyByScalar(faceNormal, radius, scratchPlaneCenter)
      Cartesian3.add(center, scratchPlaneCenter, scratchPlaneCenter)
      plane1.x = -faceNormal.x
      plane1.y = -faceNormal.y
      plane1.z = -faceNormal.z
      plane1.w = -Cartesian3.dot(
        Cartesian3.negate(faceNormal, scratchPlaneNormal),
        scratchPlaneCenter,
      )
      planeIndex += 2
    }
    return out
  }

  /**
   * 判断包围体与剔除体积的相交关系。
   *
   * @param boundingVolume 包围体
   */
  computeVisibility(boundingVolume: CullingBoundingVolume): IntersectValue {
    if (!defined(boundingVolume)) {
      throw new DeveloperError("boundingVolume is required.")
    }
    const planes = this.planes
    let intersecting = false
    for (let k = 0, len = planes.length; k < len; ++k) {
      const plane4 = planes[k]
      if (!defined(plane4)) {
        continue
      }
      const side = boundingVolume.intersectPlane(Plane.fromCartesian4(plane4, scratchPlane))
      if (side === Intersect.OUTSIDE) {
        return Intersect.OUTSIDE
      }
      if (side === Intersect.INTERSECTING) {
        intersecting = true
      }
    }
    return intersecting ? Intersect.INTERSECTING : Intersect.INSIDE
  }

  /**
   * 带父平面掩码的可见性（四叉树 / 3D Tiles 优化）。
   *
   * @param boundingVolume 包围体
   * @param parentPlaneMask 父节点掩码
   */
  computeVisibilityWithPlaneMask(
    boundingVolume: CullingBoundingVolume,
    parentPlaneMask: number,
  ): number {
    if (!defined(boundingVolume)) {
      throw new DeveloperError("boundingVolume is required.")
    }
    if (!defined(parentPlaneMask)) {
      throw new DeveloperError("parentPlaneMask is required.")
    }
    if (
      parentPlaneMask === CullingVolume.MASK_OUTSIDE ||
      parentPlaneMask === CullingVolume.MASK_INSIDE
    ) {
      return parentPlaneMask
    }
    let mask = CullingVolume.MASK_INSIDE
    const planes = this.planes
    for (let k = 0, len = planes.length; k < len; ++k) {
      const flag = k < 31 ? 1 << k : 0
      if (k < 31 && (parentPlaneMask & flag) === 0) {
        continue
      }
      const plane4 = planes[k]
      if (!defined(plane4)) {
        continue
      }
      const side = boundingVolume.intersectPlane(Plane.fromCartesian4(plane4, scratchPlane))
      if (side === Intersect.OUTSIDE) {
        return CullingVolume.MASK_OUTSIDE
      }
      if (side === Intersect.INTERSECTING) {
        mask |= flag
      }
    }
    return mask
  }

  /** 完全在外的平面掩码 */
  static readonly MASK_OUTSIDE = 0xffffffff

  /** 完全在内的平面掩码 */
  static readonly MASK_INSIDE = 0x00000000

  /** 可能与所有平面相交的掩码 */
  static readonly MASK_INDETERMINATE = 0x7fffffff
}
