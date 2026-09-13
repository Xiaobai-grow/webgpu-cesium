import { describe, expect, it } from "vitest"
import { Check } from "./Check"
import { CesiumMath } from "./CesiumMath"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { Event } from "./Event"
import { FeatureDetection } from "./FeatureDetection"
import { RuntimeError } from "./RuntimeError"

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

  it("移除函数可用，且 raise 期间移除延迟到本轮之后", () => {
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

  it("同一 listener+scope 不重复登记", () => {
    const event = new Event()
    const listener = (): void => undefined
    event.addEventListener(listener)
    event.addEventListener(listener)
    expect(event.numberOfListeners).toBe(1)
  })

  it("raise 期间新增的监听器本轮不调用", () => {
    const event = new Event()
    const calls: string[] = []
    event.addEventListener(() => {
      calls.push("a")
      event.addEventListener(() => {
        calls.push("b")
      })
    })
    event.raiseEvent()
    expect(calls).toEqual(["a"])
    event.raiseEvent()
    expect(calls).toEqual(["a", "a", "b"])
  })
})

describe("defined / errors / Check", () => {
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
    expect(developer.toString()).toContain("DeveloperError: bad call")
  })

  it("Check.defined / typeOf.number 抛 DeveloperError", () => {
    expect(() => {
      Check.defined("x", undefined)
    }).toThrow(DeveloperError)
    expect(() => {
      Check.typeOf.number("n", "1")
    }).toThrow(/typeof number/)
    Check.typeOf.number.lessThan("n", 1, 2)
    expect(() => {
      Check.typeOf.number.lessThan("n", 2, 2)
    }).toThrow(DeveloperError)
  })
})

describe("CesiumMath", () => {
  it("角度换算与经度归一化", () => {
    expect(CesiumMath.toRadians(180)).toBeCloseTo(Math.PI, 12)
    expect(CesiumMath.toDegrees(Math.PI)).toBeCloseTo(180, 12)
    const lon = CesiumMath.convertLongitudeRange(CesiumMath.toRadians(270))
    expect(CesiumMath.equalsEpsilon(lon, CesiumMath.toRadians(-90), CesiumMath.EPSILON10)).toBe(
      true,
    )
  })

  it("equalsEpsilon 绝对与相对容差", () => {
    expect(CesiumMath.equalsEpsilon(0.0, 0.01, CesiumMath.EPSILON2)).toBe(true)
    expect(CesiumMath.equalsEpsilon(0.0, 0.1, CesiumMath.EPSILON2)).toBe(false)
    expect(CesiumMath.equalsEpsilon(3699175.1634344, 3699175.2, CesiumMath.EPSILON7)).toBe(true)
    expect(CesiumMath.equalsEpsilon(3699175.1634344, 3699175.2, CesiumMath.EPSILON9)).toBe(false)
  })

  it("mod / zeroToTwoPi / 幂次", () => {
    expect(CesiumMath.mod(-1, 5)).toBe(4)
    expect(CesiumMath.zeroToTwoPi(-CesiumMath.PI_OVER_TWO)).toBeCloseTo(
      CesiumMath.THREE_PI_OVER_TWO,
      12,
    )
    expect(CesiumMath.isPowerOfTwo(16)).toBe(true)
    expect(CesiumMath.isPowerOfTwo(20)).toBe(false)
    expect(CesiumMath.nextPowerOfTwo(29)).toBe(32)
    expect(CesiumMath.previousPowerOfTwo(29)).toBe(16)
    expect(CesiumMath.factorial(7)).toBe(5040)
  })

  it("随机数在固定种子下可复现", () => {
    CesiumMath.setRandomNumberSeed(0)
    const a = CesiumMath.nextRandomNumber()
    const b = CesiumMath.nextRandomNumber()
    CesiumMath.setRandomNumberSeed(0)
    expect(CesiumMath.nextRandomNumber()).toBe(a)
    expect(CesiumMath.nextRandomNumber()).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })
})

describe("FeatureDetection", () => {
  it("Node 环境支持 typed array 与 endian 探测", () => {
    expect(FeatureDetection.supportsTypedArrays()).toBe(true)
    expect(FeatureDetection.supportsBigInt()).toBe(true)
    expect(typeof FeatureDetection.isLittleEndian()).toBe("boolean")
    expect(FeatureDetection.typedArrayTypes.length).toBeGreaterThan(0)
  })
})
