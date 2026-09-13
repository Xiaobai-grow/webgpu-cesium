import { describe, expect, it } from "vitest"
import { Heap } from "./Heap"
import { mergeSort } from "./mergeSort"

describe("mergeSort", () => {
  it("稳定排序并保留相等项相对顺序", () => {
    const items = [
      { k: 2, id: "a" },
      { k: 1, id: "b" },
      { k: 2, id: "c" },
      { k: 1, id: "d" },
    ]
    mergeSort(items, (left, right) => left.k - right.k)
    expect(items.map((item) => item.id)).toEqual(["b", "d", "a", "c"])
  })
})

describe("Heap", () => {
  it("按优先级弹出", () => {
    const heap = new Heap<number>({ comparator: (a, b) => a - b })
    heap.insert(5)
    heap.insert(1)
    heap.insert(3)
    expect(heap.pop()).toBe(1)
    expect(heap.pop()).toBe(3)
    expect(heap.pop()).toBe(5)
    expect(heap.length).toBe(0)
  })
})
