import { Color } from "@webgpu-cesium/core"
import { describe, expect, it } from "vitest"
import { MATERIAL_UNIFORM_BYTES } from "./constants"
import { Material } from "./Material"
import { MeshPhysicalMaterial } from "./MeshPhysicalMaterial"
import { MeshStandardMaterial } from "./MeshStandardMaterial"

describe("Material", () => {
  it("变体键含类型与 defines，数值不进键", () => {
    const a = new MeshStandardMaterial({ roughness: 0.2, metalness: 0.8 })
    const b = new MeshStandardMaterial({ roughness: 0.9, metalness: 0.1 })
    expect(a.variantKey()).toBe(b.variantKey())
    const physical = new MeshPhysicalMaterial({ clearcoat: 1 })
    expect(physical.variantKey()).toContain("MATERIAL_PHYSICAL")
    expect(physical.variantKey()).not.toBe(a.variantKey())
  })

  it("packUniforms 写满 80 字节且 materialId 可区分", () => {
    const standard = new MeshStandardMaterial({
      color: new Color(1, 0, 0, 1),
      roughness: 0.4,
      metalness: 0.7,
    })
    const buf = new ArrayBuffer(MATERIAL_UNIFORM_BYTES)
    standard.packUniforms(buf)
    const f32 = new Float32Array(buf)
    expect(f32[0]).toBeCloseTo(1)
    expect(f32[8]).toBeCloseTo(0.4)
    expect(f32[9]).toBeCloseTo(0.7)
    expect(f32[19]).toBe(2)

    const physical = new MeshPhysicalMaterial({ clearcoat: 0.8, clearcoatRoughness: 0.2 })
    const buf2 = new ArrayBuffer(MATERIAL_UNIFORM_BYTES)
    physical.packUniforms(buf2)
    const f2 = new Float32Array(buf2)
    expect(f2[13]).toBeCloseTo(0.8)
    expect(f2[19]).toBe(4)
  })

  it("onBeforeCompose 可调用", () => {
    const material = new Material()
    let called = false
    material.onBeforeCompose = (shader) => {
      called = true
      shader.defines.HOOK_MATERIAL_BASECOLOR = 1
    }
    const target = { source: "", defines: {} as Record<string, number>, uniforms: {} }
    material.applyComposeHooks(target)
    expect(called).toBe(true)
    expect(target.defines.HOOK_MATERIAL_BASECOLOR).toBe(1)
  })
})
