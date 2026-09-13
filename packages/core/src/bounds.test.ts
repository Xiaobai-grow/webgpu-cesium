import { describe, expect, it } from "vitest"
import { BoundingSphere } from "./BoundingSphere"
import { Cartesian3 } from "./Cartesian3"
import { Cartesian4 } from "./Cartesian4"
import { CesiumMath } from "./CesiumMath"
import { Intersect } from "./Intersect"
import { IntersectionTests } from "./IntersectionTests"
import { Matrix4 } from "./Matrix4"
import { PerspectiveFrustum } from "./PerspectiveFrustum"
import { Plane } from "./Plane"
import { Ray } from "./Ray"

describe("BoundingSphere", () => {
  it("fromPoints 包住两点并给出 Ritter/naive 较小球", () => {
    const sphere = BoundingSphere.fromPoints([new Cartesian3(0, 0, 0), new Cartesian3(2, 0, 0)])
    expect(CesiumMath.equalsEpsilon(sphere.center.x, 1, CesiumMath.EPSILON12)).toBe(true)
    expect(CesiumMath.equalsEpsilon(sphere.center.y, 0, CesiumMath.EPSILON12)).toBe(true)
    expect(CesiumMath.equalsEpsilon(sphere.center.z, 0, CesiumMath.EPSILON12)).toBe(true)
    expect(CesiumMath.equalsEpsilon(sphere.radius, 1, CesiumMath.EPSILON12)).toBe(true)
  })

  it("union 合并两球", () => {
    const left = new BoundingSphere(new Cartesian3(0, 0, 0), 1)
    const right = new BoundingSphere(new Cartesian3(4, 0, 0), 1)
    const merged = BoundingSphere.union(left, right)
    expect(CesiumMath.equalsEpsilon(merged.center.x, 2, CesiumMath.EPSILON12)).toBe(true)
    expect(CesiumMath.equalsEpsilon(merged.radius, 3, CesiumMath.EPSILON12)).toBe(true)
  })

  it("intersectPlane 区分内 / 交 / 外", () => {
    const sphere = new BoundingSphere(Cartesian3.ZERO, 1)
    expect(BoundingSphere.intersectPlane(sphere, Plane.ORIGIN_YZ_PLANE)).toBe(
      Intersect.INTERSECTING,
    )
    const farPlane = Plane.fromPointNormal(new Cartesian3(5, 0, 0), Cartesian3.UNIT_X)
    expect(BoundingSphere.intersectPlane(sphere, farPlane)).toBe(Intersect.OUTSIDE)
    const behind = Plane.fromPointNormal(new Cartesian3(-5, 0, 0), Cartesian3.UNIT_X)
    expect(BoundingSphere.intersectPlane(sphere, behind)).toBe(Intersect.INSIDE)
  })
})

describe("Ray + IntersectionTests", () => {
  it("rayPlane 打到 XY 平面", () => {
    const ray = new Ray(new Cartesian3(0, 0, 2), new Cartesian3(0, 0, -1))
    const hit = IntersectionTests.rayPlane(ray, Plane.ORIGIN_XY_PLANE)
    expect(hit).toBeDefined()
    expect(CesiumMath.equalsEpsilon(hit!.x, 0, CesiumMath.EPSILON12)).toBe(true)
    expect(CesiumMath.equalsEpsilon(hit!.y, 0, CesiumMath.EPSILON12)).toBe(true)
    expect(CesiumMath.equalsEpsilon(hit!.z, 0, CesiumMath.EPSILON12)).toBe(true)
  })
})

describe("PerspectiveFrustum Reverse-Z", () => {
  it("projection 把 near 映到 NDC z=1、far 映到 0", () => {
    const near = 1
    const far = 100
    const frustum = new PerspectiveFrustum({
      fov: CesiumMath.PI_OVER_TWO,
      aspectRatio: 1,
      near,
      far,
    })
    const proj = frustum.projectionMatrix
    const nearEye = new Cartesian4(0, 0, -near, 1)
    const farEye = new Cartesian4(0, 0, -far, 1)
    const nearClip = Matrix4.multiplyByVector(proj, nearEye, new Cartesian4())
    const farClip = Matrix4.multiplyByVector(proj, farEye, new Cartesian4())
    expect(CesiumMath.equalsEpsilon(nearClip.z / nearClip.w, 1, CesiumMath.EPSILON10)).toBe(true)
    expect(CesiumMath.equalsEpsilon(farClip.z / farClip.w, 0, CesiumMath.EPSILON10)).toBe(true)
  })

  it("computeCullingVolume 返回 6 个平面", () => {
    const frustum = new PerspectiveFrustum({
      fov: CesiumMath.PI_OVER_THREE,
      aspectRatio: 1,
      near: 0.1,
      far: 1e9,
    })
    const volume = frustum.computeCullingVolume(
      Cartesian3.ZERO,
      Cartesian3.UNIT_Z,
      Cartesian3.UNIT_Y,
    )
    expect(volume.planes.length).toBe(6)
    for (const plane of volume.planes) {
      expect(plane).toBeDefined()
      const mag = Math.sqrt(plane.x * plane.x + plane.y * plane.y + plane.z * plane.z)
      expect(CesiumMath.equalsEpsilon(mag, 1, CesiumMath.EPSILON10)).toBe(true)
    }
  })

  it("far = Infinity 时 near 仍映到 1、远处趋近 0", () => {
    const near = 0.1
    const frustum = new PerspectiveFrustum({
      fov: CesiumMath.PI_OVER_TWO,
      aspectRatio: 1,
      near,
      far: Number.POSITIVE_INFINITY,
    })
    const proj = frustum.projectionMatrix
    const nearClip = Matrix4.multiplyByVector(
      proj,
      new Cartesian4(0, 0, -near, 1),
      new Cartesian4(),
    )
    const farClip = Matrix4.multiplyByVector(proj, new Cartesian4(0, 0, -1e12, 1), new Cartesian4())
    expect(CesiumMath.equalsEpsilon(nearClip.z / nearClip.w, 1, CesiumMath.EPSILON10)).toBe(true)
    expect(Math.abs(farClip.z / farClip.w)).toBeLessThan(1e-9)
  })
})
