import { describe, expect, it } from "vitest"
import { getObjectId, stableKey } from "./stableKey"

describe("stableKey", () => {
  it("键顺序无关、忽略 undefined 与 label", () => {
    const a = stableKey({ x: 1, y: [1, 2], z: { k: "v" }, label: "A", u: undefined })
    const b = stableKey({ label: "B", z: { k: "v" }, y: [1, 2], x: 1 })
    expect(a).toBe(b)
    expect(a).toBe('{x:1,y:[1,2],z:{k:"v"}}')
  })

  it("数组顺序有关", () => {
    expect(stableKey([1, 2])).not.toBe(stableKey([2, 1]))
  })

  it("宿主对象用稳定 id 代替", () => {
    class Fake {}
    const one = new Fake()
    const two = new Fake()
    expect(getObjectId(one)).toBe(getObjectId(one))
    expect(getObjectId(one)).not.toBe(getObjectId(two))
    expect(stableKey({ module: one })).toBe(stableKey({ module: one }))
    expect(stableKey({ module: one })).not.toBe(stableKey({ module: two }))
    expect(stableKey({ module: one })).toMatch(/^\{module:@\d+\}$/)
  })

  it("典型 render pipeline 描述的哈希成本（粗测，M0 待验证项）", () => {
    class FakeModule {}
    class FakeLayout {}
    const descriptor = {
      layout: new FakeLayout(),
      vertex: {
        module: new FakeModule(),
        entryPoint: "vsMain",
        buffers: [
          {
            arrayStride: 20,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" },
              { shaderLocation: 1, offset: 8, format: "float32x3" },
            ],
          },
        ],
      },
      fragment: {
        module: new FakeModule(),
        entryPoint: "fsMain",
        targets: [{ format: "bgra8unorm", blend: undefined, writeMask: 0xf }],
      },
      primitive: { topology: "triangle-list", cullMode: "back", frontFace: "ccw" },
      depthStencil: { format: "depth32float", depthWriteEnabled: true, depthCompare: "greater" },
      multisample: { count: 1 },
    }
    const iterations = 10_000
    const start = performance.now()
    let length = 0
    for (let i = 0; i < iterations; i++) {
      length += stableKey(descriptor).length
    }
    const elapsed = performance.now() - start
    const perKeyMicroseconds = (elapsed / iterations) * 1000
    // 记录到 03-rhi-and-render-graph.md「待验证」：单次应远低于 50 µs
    console.info(
      `stableKey: ${perKeyMicroseconds.toFixed(2)} µs / key, key length ${String(length / iterations)}`,
    )
    expect(perKeyMicroseconds).toBeLessThan(200)
  })
})
