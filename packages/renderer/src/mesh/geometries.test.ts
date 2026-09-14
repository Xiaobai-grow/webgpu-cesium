import { describe, expect, it } from "vitest"
import { createSphereGeometry } from "./geometries"

describe("createSphereGeometry", () => {
  it("赤道三角形从外侧看为 CCW", () => {
    const geo = createSphereGeometry(1, 24, 16)
    const cols = 25
    const y = 8
    const x = 0
    const a = y * cols + x
    const b = a + cols
    expect(geo.indices[0 + (y * 24 + x) * 6]).toBe(a)
    expect(geo.indices[1 + (y * 24 + x) * 6]).toBe(a + 1)
    expect(geo.indices[2 + (y * 24 + x) * 6]).toBe(b)
    const pos = (index: number) => {
      const offset = index * 8
      return {
        x: geo.vertices[offset] ?? 0,
        y: geo.vertices[offset + 1] ?? 0,
        z: geo.vertices[offset + 2] ?? 0,
      }
    }
    const pa = pos(a)
    const pb = pos(a + 1)
    const pc = pos(b)
    const abx = pb.x - pa.x
    const aby = pb.y - pa.y
    const abz = pb.z - pa.z
    const acx = pc.x - pa.x
    const acy = pc.y - pa.y
    const acz = pc.z - pa.z
    const nx = aby * acz - abz * acy
    const ny = abz * acx - abx * acz
    const nz = abx * acy - aby * acx
    const outward = nx * pa.x + ny * pa.y + nz * pa.z
    expect(outward).toBeGreaterThan(0)
  })
})
