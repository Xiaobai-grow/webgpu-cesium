import { describe, expect, it } from "vitest"
import { Cartesian3 } from "./Cartesian3"
import { CesiumMath } from "./CesiumMath"
import { JulianDate } from "./JulianDate"
import { Matrix4 } from "./Matrix4"
import { Transforms } from "./Transforms"

describe("Transforms", () => {
  it("eastNorthUpToFixedFrame 在 (0,0,0) 用退化轴", () => {
    const matrix = Transforms.eastNorthUpToFixedFrame(Cartesian3.ZERO)
    expect(matrix[0]).toBeCloseTo(0, 12)
    expect(matrix[1]).toBeCloseTo(1, 12)
    expect(matrix[2]).toBeCloseTo(0, 12)
    expect(matrix[4]).toBeCloseTo(-1, 12)
    expect(matrix[5]).toBeCloseTo(0, 12)
    expect(matrix[6]).toBeCloseTo(0, 12)
    expect(matrix[8]).toBeCloseTo(0, 12)
    expect(matrix[9]).toBeCloseTo(0, 12)
    expect(matrix[10]).toBeCloseTo(1, 12)
    expect(matrix[12]).toBe(0)
    expect(matrix[13]).toBe(0)
    expect(matrix[14]).toBe(0)
    expect(matrix[15]).toBe(1)
  })

  it("eastNorthUpToFixedFrame 赤道一点 east 沿经线切向", () => {
    const origin = Cartesian3.fromDegrees(0.0, 0.0)
    const matrix = Transforms.eastNorthUpToFixedFrame(origin)
    const east = new Cartesian3(matrix[0] ?? 0, matrix[1] ?? 0, matrix[2] ?? 0)
    const north = new Cartesian3(matrix[4] ?? 0, matrix[5] ?? 0, matrix[6] ?? 0)
    const up = new Cartesian3(matrix[8] ?? 0, matrix[9] ?? 0, matrix[10] ?? 0)
    expect(Cartesian3.magnitudeSquared(east)).toBeCloseTo(1, 10)
    expect(Cartesian3.magnitudeSquared(north)).toBeCloseTo(1, 10)
    expect(Cartesian3.magnitudeSquared(up)).toBeCloseTo(1, 10)
    expect(Math.abs(Cartesian3.dot(east, north))).toBeLessThan(CesiumMath.EPSILON10)
    expect(up.x).toBeGreaterThan(0.9)
    expect(east.y).toBeGreaterThan(0.9)
    expect(north.z).toBeGreaterThan(0.9)
    expect(Matrix4.getTranslation(matrix, new Cartesian3()).x).toBeCloseTo(origin.x, 6)
  })

  it("computeIcrfToFixedMatrix 在 XYS/EOP 未就绪时返回 undefined", () => {
    expect(Transforms.computeIcrfToFixedMatrix(JulianDate.now())).toBeUndefined()
  })
})
