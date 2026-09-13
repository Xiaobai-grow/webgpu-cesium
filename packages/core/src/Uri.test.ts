import { describe, expect, it } from "vitest"
import { appendForwardSlash } from "./appendForwardSlash"
import { binarySearch } from "./binarySearch"
import { ComponentDatatype } from "./ComponentDatatype"
import { getExtensionFromUri } from "./getExtensionFromUri"
import { getFilenameFromUri } from "./getFilenameFromUri"
import { IndexDatatype } from "./IndexDatatype"
import { isBlobUri } from "./isBlobUri"
import { isDataUri } from "./isDataUri"
import { isLeapYear } from "./isLeapYear"
import { objectToQuery } from "./objectToQuery"
import { PrimitiveType } from "./PrimitiveType"
import { queryToObject } from "./queryToObject"
import { srgbToLinear } from "./srgbToLinear"

describe("URI helpers", () => {
  it("appendForwardSlash / 文件名 / 扩展名 / data blob", () => {
    expect(appendForwardSlash("https://a.com/x")).toBe("https://a.com/x/")
    expect(appendForwardSlash("https://a.com/x/")).toBe("https://a.com/x/")
    expect(getFilenameFromUri("https://a.com/foo/bar.gltf?x=1")).toBe("bar.gltf")
    expect(getExtensionFromUri("https://a.com/foo/bar.gltf?x=1")).toBe("gltf")
    expect(isDataUri("data:text/plain,hi")).toBe(true)
    expect(isBlobUri("blob:https://a.com/1")).toBe(true)
  })

  it("objectToQuery / queryToObject 往返（含数组）", () => {
    const q = objectToQuery({ a: "1", b: ["x", "y"] })
    expect(q).toContain("a=1")
    const obj = queryToObject(q)
    expect(obj.a).toBe("1")
    expect(obj.b).toEqual(["x", "y"])
  })
})

describe("binarySearch / leap / color / datatypes", () => {
  it("binarySearch 找到或返回按位取反插入点", () => {
    const numbers = [0, 2, 4, 6, 8]
    expect(binarySearch(numbers, 6, (a, b) => a - b)).toBe(3)
    expect(binarySearch(numbers, 5, (a, b) => a - b)).toBe(~3)
  })

  it("isLeapYear 与 srgbToLinear", () => {
    expect(isLeapYear(2000)).toBe(true)
    expect(isLeapYear(1900)).toBe(false)
    expect(srgbToLinear(0)).toBe(0)
    expect(srgbToLinear(1)).toBeCloseTo(1, 10)
  })

  it("ComponentDatatype / IndexDatatype / PrimitiveType", () => {
    expect(ComponentDatatype.getSizeInBytes(ComponentDatatype.FLOAT)).toBe(4)
    expect(ComponentDatatype.fromTypedArray(new Float32Array(1))).toBe(ComponentDatatype.FLOAT)
    expect(ComponentDatatype.toGpuVertexFormat(ComponentDatatype.FLOAT, 3)).toBe("float32x3")
    expect(IndexDatatype.getSizeInBytes(IndexDatatype.UNSIGNED_SHORT)).toBe(2)
    expect(IndexDatatype.toGpuIndexFormat(IndexDatatype.UNSIGNED_INT)).toBe("uint32")
    expect(PrimitiveType.isTriangles(PrimitiveType.TRIANGLES)).toBe(true)
    expect(PrimitiveType.toGpuPrimitiveTopology(PrimitiveType.TRIANGLES)).toBe("triangle-list")
  })
})
