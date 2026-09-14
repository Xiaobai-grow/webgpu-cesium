import { describe, expect, it } from "vitest"
import { ImplicitAvailabilityBitstream } from "./ImplicitAvailabilityBitstream"
import { ImplicitSubdivisionScheme, ImplicitTileCoordinates } from "./ImplicitTileCoordinates"
import { ImplicitTileset } from "./ImplicitTileset"
import { MortonOrder } from "./MortonOrder"
import { HilbertOrder } from "./HilbertOrder"

describe("隐式瓦片", () => {
  it("Morton 2D/3D 往返", () => {
    const key2 = MortonOrder.encode2D(3, 5)
    expect(MortonOrder.decode2D(key2)).toEqual({ x: 3, y: 5 })
    const key3 = MortonOrder.encode3D(2, 1, 3)
    expect(MortonOrder.decode3D(key3)).toEqual({ x: 2, y: 1, z: 3 })
  })

  it("子坐标与 subtree URI", () => {
    const root = new ImplicitTileCoordinates({ level: 0, x: 0, y: 0 })
    const child = root.deriveChild(3)
    expect(child.level).toBe(1)
    expect(child.x).toBe(1)
    expect(child.y).toBe(1)
    const implicit = new ImplicitTileset({
      subdivisionScheme: "QUADTREE",
      subtreeLevels: 3,
      availableLevels: 8,
      subtrees: { uri: "{level}/{x}/{y}.subtree" },
    })
    expect(implicit.getSubtreeUri(child)).toBe("1/1/1.subtree")
    expect(implicit.subdivisionScheme).toBe(ImplicitSubdivisionScheme.QUADTREE)
  })

  it("可用性位流", () => {
    const bits = new ImplicitAvailabilityBitstream({
      bitstream: new Uint8Array([0b00001010]),
      length: 8,
    })
    expect(bits.getBit(1)).toBe(true)
    expect(bits.getBit(2)).toBe(false)
    expect(bits.getBit(3)).toBe(true)
    const constant = new ImplicitAvailabilityBitstream({ length: 4, constant: true })
    expect(constant.getBit(0)).toBe(true)
  })

  it("Hilbert 编码单调", () => {
    expect(HilbertOrder.encode2D(2, 0, 0)).toBe(0)
    expect(HilbertOrder.encode2D(2, 1, 0)).toBeGreaterThanOrEqual(0)
  })
})
