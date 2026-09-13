import { describe, expect, it } from "vitest"
import { Cartesian3 } from "./Cartesian3"
import { EncodedCartesian3 } from "./EncodedCartesian3"

describe("EncodedCartesian3", () => {
  it("encode/decode 标量往返", () => {
    const value = 1234567.1234567
    const encoded = EncodedCartesian3.encode(value)
    expect(EncodedCartesian3.decode(encoded)).toBeCloseTo(value, 8)
    const negative = -10000000.25
    expect(EncodedCartesian3.decode(EncodedCartesian3.encode(negative))).toBeCloseTo(negative, 8)
  })

  it("fromCartesian / toCartesian 往返", () => {
    const cart = new Cartesian3(-10000000.0, 0.0, 10000000.0)
    const encoded = EncodedCartesian3.fromCartesian(cart)
    const decoded = EncodedCartesian3.toCartesian(encoded)
    expect(decoded.x).toBeCloseTo(cart.x, 6)
    expect(decoded.y).toBeCloseTo(cart.y, 6)
    expect(decoded.z).toBeCloseTo(cart.z, 6)
  })
})
