import { describe, expect, it } from "vitest"
import { Event } from "./Event"
import { defined } from "./defined"
import { RuntimeError } from "./RuntimeError"
import { DeveloperError } from "./DeveloperError"

describe("Event", () => {
  it("按注册顺序触发监听器并传递参数", () => {
    const event = new Event<[number, string]>()
    const calls: string[] = []
    event.addEventListener((n, s) => calls.push(`a${n}${s}`))
    event.addEventListener((n, s) => calls.push(`b${n}${s}`))
    event.raiseEvent(1, "x")
    expect(calls).toEqual(["a1x", "b1x"])
    expect(event.numberOfListeners).toBe(2)
  })

  it("移除函数可用，且 raise 期间移除延迟生效", () => {
    const event = new Event()
    let count = 0
    const remove = event.addEventListener(() => {
      count++
      remove()
    })
    event.raiseEvent()
    event.raiseEvent()
    expect(count).toBe(1)
    expect(event.numberOfListeners).toBe(0)
  })

  it("scope 作为 this 传入", () => {
    const event = new Event()
    const scope = { hit: false }
    event.addEventListener(function (this: { hit: boolean }) {
      this.hit = true
    }, scope)
    event.raiseEvent()
    expect(scope.hit).toBe(true)
  })
})

describe("defined / errors", () => {
  it("defined 排除 undefined 与 null", () => {
    expect(defined(0)).toBe(true)
    expect(defined("")).toBe(true)
    expect(defined(null)).toBe(false)
    expect(defined(undefined)).toBe(false)
  })

  it("错误类携带正确的 name 并支持 instanceof", () => {
    const runtime = new RuntimeError("boom")
    const developer = new DeveloperError("bad call")
    expect(runtime).toBeInstanceOf(Error)
    expect(runtime).toBeInstanceOf(RuntimeError)
    expect(runtime.name).toBe("RuntimeError")
    expect(developer.name).toBe("DeveloperError")
    expect(developer.message).toBe("bad call")
  })
})
