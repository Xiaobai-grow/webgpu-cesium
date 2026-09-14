import { Color } from "@webgpu-cesium/core"
import { MeshBasicMaterial, MeshPhysicalMaterial } from "@webgpu-cesium/renderer"
import { describe, expect, it } from "vitest"
import { GltfLoader } from "./GltfLoader"
import { createBoxGlb, createBoxGltfJson } from "./createBoxGltf"
import { mapGltfMaterial, specularGlossinessToMetallic } from "./mapGltfMaterial"
import { encodeGlb, isGlb, parseGlb } from "./parseGlb"
import { addDefaults } from "./addDefaults"
import { updateVersion } from "./updateVersion"
import { hasExtension } from "./hasExtension"

describe("glTF 解析", () => {
  it("encode/parse GLB 往返", () => {
    const { json, bin } = createBoxGltfJson({ color: [1, 0, 0, 1] })
    const glb = encodeGlb(json, bin)
    expect(isGlb(glb)).toBe(true)
    const parsed = parseGlb(glb)
    expect(parsed.json.meshes?.[0]?.primitives[0]?.attributes.POSITION).toBe(0)
    expect(parsed.bin?.byteLength).toBe(bin.byteLength)
  })

  it("GltfLoader 展开盒子图元与 PBR 材质", async () => {
    const glb = createBoxGlb({ metallic: 0.7, roughness: 0.2, color: [0.2, 0.4, 0.8, 1] })
    const loaded = await GltfLoader.load({ gltf: glb })
    expect(loaded.components.primitives).toHaveLength(1)
    const primitive = loaded.components.primitives[0]!
    expect(primitive.positions.length).toBe(24 * 3)
    expect(primitive.indices.length).toBe(36)
    expect(primitive.material).toBeInstanceOf(MeshPhysicalMaterial)
    const physical = primitive.material as MeshPhysicalMaterial
    expect(physical.metalness).toBeCloseTo(0.7)
    expect(physical.roughness).toBeCloseTo(0.2)
  })

  it("KHR_materials_unlit → MeshBasicMaterial", async () => {
    const glb = createBoxGlb({ unlit: true, color: [1, 1, 0, 1] })
    const loaded = await GltfLoader.load({ gltf: glb })
    expect(loaded.components.primitives[0]?.material).toBeInstanceOf(MeshBasicMaterial)
  })

  it("addDefaults / updateVersion / hasExtension", () => {
    const json = addDefaults({ asset: { version: "1.0" }, nodes: [{}] })
    updateVersion(json)
    expect(json.asset?.version).toBe("2.0")
    expect(json.scenes?.length).toBe(1)
    expect(hasExtension({ extensions: { KHR_materials_unlit: {} } }, "KHR_materials_unlit")).toBe(
      true,
    )
  })

  it("specular-glossiness 近似转换", () => {
    const converted = specularGlossinessToMetallic({
      diffuseFactor: [0.8, 0.1, 0.1, 1],
      specularFactor: [0.9, 0.9, 0.9],
      glossinessFactor: 0.8,
    })
    expect(converted.metalness).toBeGreaterThan(0.5)
    expect(converted.roughness).toBeCloseTo(0.2)
  })

  it("mapGltfMaterial 映射 clearcoat / transmission / MASK", () => {
    const material = mapGltfMaterial(
      {},
      {
        alphaMode: "MASK",
        alphaCutoff: 0.4,
        doubleSided: true,
        extensions: {
          KHR_materials_clearcoat: { clearcoatFactor: 0.8, clearcoatRoughnessFactor: 0.1 },
          KHR_materials_transmission: { transmissionFactor: 0.5 },
          KHR_materials_ior: { ior: 1.4 },
        },
      },
      { textures: [] },
    )
    expect(material).toBeInstanceOf(MeshPhysicalMaterial)
    const physical = material as MeshPhysicalMaterial
    expect(physical.clearcoat).toBeCloseTo(0.8)
    expect(physical.transmission).toBeCloseTo(0.5)
    expect(physical.alphaTest).toBeCloseTo(0.4)
    expect(physical.isTransparentPass).toBe(true)
    expect(physical.color).toBeInstanceOf(Color)
  })
})
