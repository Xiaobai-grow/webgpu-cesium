import { describe, expect, it } from "vitest"
import {
  Cartesian2,
  Cartesian3,
  Cartesian4,
  CesiumMath,
  EncodedCartesian3,
  HeadingPitchRange,
  Matrix4,
} from "@webgpu-cesium/core"
import { Camera } from "./Camera"
import { TweenCollection } from "./TweenCollection"

describe("Camera Reverse-Z 与 RTE", () => {
  it("视图矩阵平移为 0", () => {
    const camera = new Camera({
      canvas: { clientWidth: 800, clientHeight: 600 },
    })
    camera.updateFrustumAspect(800, 600)
    const view = camera.viewMatrix
    const translation = Matrix4.getTranslation(view, new Cartesian3())
    expect(translation.x).toBeCloseTo(0)
    expect(translation.y).toBeCloseTo(0)
    expect(translation.z).toBeCloseTo(0)
  })

  it("投影 near→NDC 1、far→0", () => {
    const camera = new Camera()
    camera.updateFrustumAspect(800, 600)
    const near = camera.frustum.near
    const far = camera.frustum.far
    const proj = camera.frustum.projectionMatrix
    const clipNear = Matrix4.multiplyByVector(
      proj,
      new Cartesian4(0, 0, -near, 1),
      new Cartesian4(),
    )
    const clipFar = Matrix4.multiplyByVector(proj, new Cartesian4(0, 0, -far, 1), new Cartesian4())
    expect(clipNear.z / clipNear.w).toBeCloseTo(1, 5)
    expect(clipFar.z / clipFar.w).toBeCloseTo(0, 5)
  })

  it("setView 后可 pickEllipsoid", () => {
    const camera = new Camera({
      canvas: { clientWidth: 800, clientHeight: 600 },
    })
    camera.updateFrustumAspect(800, 600)
    camera.setView({
      destination: Cartesian3.fromDegrees(0, 0, 2.0e7),
      orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
    })
    const hit = camera.pickEllipsoid(new Cartesian2(400, 300))
    expect(hit).toBeDefined()
    expect(Cartesian3.magnitude(hit!)).toBeGreaterThan(6e6)
  })

  it("flyTo duration=0 立即到达", () => {
    const tweens = new TweenCollection()
    const camera = new Camera({
      canvas: { clientWidth: 800, clientHeight: 600 },
      tweens,
    })
    const dest = Cartesian3.fromDegrees(10, 20, 1.5e7)
    let done = false
    camera.flyTo({
      destination: dest,
      duration: 0,
      complete: () => {
        done = true
      },
    })
    expect(done).toBe(true)
    expect(Cartesian3.distance(camera.position, dest)).toBeLessThan(1)
  })

  it("lookAt HeadingPitchRange 看向目标", () => {
    const camera = new Camera()
    const target = Cartesian3.fromDegrees(0, 0, 0)
    camera.lookAt(target, new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2e7))
    const toTarget = Cartesian3.subtract(target, camera.position, new Cartesian3())
    Cartesian3.normalize(toTarget, toTarget)
    expect(Cartesian3.dot(toTarget, camera.direction)).toBeGreaterThan(0.99)
  })

  it("RTE 编码可还原相机位置", () => {
    const camera = new Camera()
    const encoded = camera.encodedPosition()
    const restored = EncodedCartesian3.toCartesian(encoded)
    expect(Cartesian3.equalsEpsilon(restored, camera.positionWC, CesiumMath.EPSILON7)).toBe(true)
  })
})
