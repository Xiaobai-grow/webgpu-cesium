import { describe, expect, it } from "vitest"
import { Color } from "./Color"

describe("Color", () => {
  it("fromBytes 映射到 0..1", () => {
    const color = Color.fromBytes(255, 128, 0, 255)
    expect(color.red).toBeCloseTo(1, 10)
    expect(color.green).toBeCloseTo(128 / 255, 10)
    expect(color.blue).toBe(0)
    expect(color.alpha).toBeCloseTo(1, 10)
  })

  it("fromCssColorString 解析 hex / 命名色 / rgb", () => {
    const hex = Color.fromCssColorString("#67ADDF")
    expect(hex).toBeDefined()
    expect(hex?.red).toBeCloseTo(0x67 / 255, 10)
    expect(hex?.green).toBeCloseTo(0xad / 255, 10)
    expect(hex?.blue).toBeCloseTo(0xdf / 255, 10)

    const named = Color.fromCssColorString("green")
    expect(named).toBeDefined()
    expect(Color.equals(named, Color.GREEN)).toBe(true)

    const rgb = Color.fromCssColorString("rgb(255, 0, 0)")
    expect(rgb).toBeDefined()
    expect(Color.equals(rgb, Color.RED)).toBe(true)

    const shortHex = Color.fromCssColorString("#0f0")
    expect(shortHex).toBeDefined()
    expect(shortHex?.green).toBeCloseTo(1, 10)
  })
})
