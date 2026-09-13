import { afterEach, describe, expect, it } from "vitest"
import { Resource } from "./Resource"

describe("Resource", () => {
  afterEach(() => {
    Resource.fetchImpl = undefined
  })

  it("getDerivedResource 合并 query（派生覆盖同名键）", () => {
    const parent = new Resource({
      url: "https://example.com/tiles",
      queryParameters: { a: "1", b: "2" },
    })
    const derived = parent.getDerivedResource({
      url: "layer.json?c=3",
      queryParameters: { b: "9" },
    })
    expect(derived.queryParameters.a).toBe("1")
    expect(derived.queryParameters.b).toBe("9")
    expect(derived.queryParameters.c).toBe("3")
    expect(derived.getUrlComponent(true)).toContain("b=9")
    expect(derived.getUrlComponent(true)).toContain("c=3")
  })

  it("fetchJson 走可注入 fetch", async () => {
    Resource.fetchImpl = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => "application/json" },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        text: () => Promise.resolve('{"ok":true}'),
        json: () => Promise.resolve({ ok: true }),
        blob: () => Promise.resolve({}),
      })
    const json = (await new Resource("https://example.com/data.json").fetchJson()) as {
      ok: boolean
    }
    expect(json.ok).toBe(true)
  })
})
