import { describe, expect, it } from "vitest"
import { BUILTIN_MODULES, GLOBE_MODULES, SHADER_MODULES } from "../builtin"
import { composeShader, formatCompilationMessages, stripComments } from "./compose"
import { evaluateCondition } from "./condition"
import { hashString } from "./hash"
import { ShaderComposeError } from "./ShaderComposeError"

const MODULES: Record<string, string> = {
  "a.wgsl": `// a 依赖 b 与 c
#import "b.wgsl"
#import "c.wgsl"
fn a() -> f32 { return b() + c(); }
`,
  "b.wgsl": `#import "c.wgsl"
fn b() -> f32 {
    return c() * 2.0;   // 行尾注释
}
`,
  "c.wgsl": `/* 块注释
   跨行 */
fn c() -> f32 { return 1.0; }
`,
  "cond.wgsl": `#if HAS_NORMAL
fn normal() -> vec3<f32> { return vec3<f32>(0.0, 0.0, 1.0); }
#elif LAYERS == 2
fn normal() -> vec3<f32> { return vec3<f32>(0.0, 1.0, 0.0); }
#elif LAYERS > 2
fn normal() -> vec3<f32> { return vec3<f32>(1.0, 0.0, 0.0); }
#else
fn normal() -> vec3<f32> { return vec3<f32>(0.0); }
#endif
#if !DEBUG
fn debug() {}
#endif
`,
  "nested.wgsl": `#if OUTER
  #if INNER
    fn both() {}
  #else
    fn outerOnly() {}
  #endif
  #import "c.wgsl"
#endif
fn always() {}
`,
  "cycle-a.wgsl": `#import "cycle-b.wgsl"
fn ca() {}
`,
  "cycle-b.wgsl": `fn cb() {}
#import "cycle-a.wgsl"
`,
  "missing.wgsl": `fn x() {}
#import "nope.wgsl"
`,
  "unclosed.wgsl": `fn x() {}
#if A
fn y() {}
`,
  "bad-directive.wgsl": `#ifdef A
#endif
`,
  "bad-expr.wgsl": `#if A ==
#endif
`,
  "triangle.wgsl": `#import "builtin/constants.wgsl"
#import "builtin/frame.wgsl"

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec3<f32>,
}

@vertex
fn vsMain(@location(0) position: vec2<f32>, @location(1) color: vec3<f32>) -> VertexOutput {
    let angle = frame.time * HALF_PI;
    var out: VertexOutput;
    out.position = vec4<f32>(position, 0.0, 1.0);
    out.color = color;
    return out;
}
`,
}

describe("stripComments", () => {
  it("去掉行注释与跨行块注释并保持行数", () => {
    const lines = stripComments("a // x\n/* b\nc */ d\ne /* f */ g\n")
    expect(lines).toEqual(["a ", "", " d", "e  g", ""])
  })
})

describe("evaluateCondition", () => {
  const defines = { A: true, B: false, N: 3 }
  it.each([
    ["A", true],
    ["B", false],
    ["!B", true],
    ["UNDEFINED", false],
    ["N", true],
    ["N == 3", true],
    ["N != 3", false],
    ["N > 2", true],
    ["N < 2", false],
    ["N >= 3", true],
    ["N <= 2", false],
    ["A && N == 3", true],
    ["B || N > 5", false],
    ["(A || B) && !B", true],
    ["true", true],
    ["false", false],
  ])("%s → %s", (expression, expected) => {
    expect(evaluateCondition(expression, defines)).toBe(expected)
  })

  it("语法错误抛 SyntaxError", () => {
    expect(() => evaluateCondition("A ==", defines)).toThrow(SyntaxError)
    expect(() => evaluateCondition("", defines)).toThrow(SyntaxError)
    expect(() => evaluateCondition("A $ B", defines)).toThrow(SyntaxError)
  })
})

describe("composeShader #import", () => {
  it("拓扑排序、去重，依赖在前", () => {
    const result = composeShader({ entry: "a.wgsl", modules: MODULES })
    expect(result.modules).toEqual(["c.wgsl", "b.wgsl", "a.wgsl"])
    expect(result.code).toMatchSnapshot()
    expect(result.sourceMap).toMatchSnapshot()
  })

  it("哈希稳定且随源码变化", () => {
    const first = composeShader({ entry: "a.wgsl", modules: MODULES })
    const second = composeShader({ entry: "a.wgsl", modules: MODULES })
    expect(first.hash).toBe(second.hash)
    expect(first.hash).toMatch(/^[0-9a-f]{14}$/)
    const changed = composeShader({
      entry: "a.wgsl",
      modules: { ...MODULES, "c.wgsl": "fn c() -> f32 { return 2.0; }" },
    })
    expect(changed.hash).not.toBe(first.hash)
  })

  it("支持解析函数作为模块表", () => {
    const result = composeShader({
      entry: "a.wgsl",
      modules: (path) => MODULES[path],
    })
    expect(result.modules).toHaveLength(3)
  })

  it("循环依赖报错并给出链路", () => {
    expect(() => composeShader({ entry: "cycle-a.wgsl", modules: MODULES })).toThrowError(
      ShaderComposeError,
    )
    try {
      composeShader({ entry: "cycle-a.wgsl", modules: MODULES })
    } catch (error) {
      const composeError = error as ShaderComposeError
      expect(composeError.file).toBe("cycle-b.wgsl")
      expect(composeError.line).toBe(2)
      expect(composeError.message).toMatchSnapshot()
    }
  })

  it("找不到模块时指向 #import 所在行", () => {
    try {
      composeShader({ entry: "missing.wgsl", modules: MODULES })
      expect.unreachable()
    } catch (error) {
      const composeError = error as ShaderComposeError
      expect(composeError.file).toBe("missing.wgsl")
      expect(composeError.line).toBe(2)
      expect(composeError.message).toMatchSnapshot()
    }
  })

  it("找不到入口模块", () => {
    expect(() => composeShader({ entry: "none.wgsl", modules: MODULES })).toThrowError(
      /找不到入口模块/,
    )
  })
})

describe("composeShader #if / #elif / #else", () => {
  it("HAS_NORMAL 为真取第一分支", () => {
    const result = composeShader({
      entry: "cond.wgsl",
      modules: MODULES,
      defines: { HAS_NORMAL: true, DEBUG: false },
    })
    expect(result.code).toMatchSnapshot()
  })

  it("整数比较 == 取第二分支", () => {
    const result = composeShader({
      entry: "cond.wgsl",
      modules: MODULES,
      defines: { LAYERS: 2, DEBUG: true },
    })
    expect(result.code).toMatchSnapshot()
  })

  it("整数比较 > 取第三分支", () => {
    const result = composeShader({ entry: "cond.wgsl", modules: MODULES, defines: { LAYERS: 5 } })
    expect(result.code).toContain("vec3<f32>(1.0, 0.0, 0.0)")
  })

  it("全部为假取 #else 分支", () => {
    const result = composeShader({ entry: "cond.wgsl", modules: MODULES })
    expect(result.code).toMatchSnapshot()
  })

  it("嵌套条件与条件内 #import", () => {
    const outerInner = composeShader({
      entry: "nested.wgsl",
      modules: MODULES,
      defines: { OUTER: true, INNER: true },
    })
    expect(outerInner.modules).toEqual(["c.wgsl", "nested.wgsl"])
    expect(outerInner.code).toMatchSnapshot()

    const outerOnly = composeShader({
      entry: "nested.wgsl",
      modules: MODULES,
      defines: { OUTER: true },
    })
    expect(outerOnly.code).toContain("fn outerOnly() {}")
    expect(outerOnly.code).not.toContain("fn both() {}")

    const none = composeShader({ entry: "nested.wgsl", modules: MODULES })
    expect(none.modules).toEqual(["nested.wgsl"])
    expect(none.code).toBe("fn always() {}")
  })

  it("#if 未闭合报错并指向 #if 行", () => {
    try {
      composeShader({ entry: "unclosed.wgsl", modules: MODULES })
      expect.unreachable()
    } catch (error) {
      const composeError = error as ShaderComposeError
      expect(composeError.file).toBe("unclosed.wgsl")
      expect(composeError.line).toBe(2)
      expect(composeError.message).toMatchSnapshot()
    }
  })

  it("未知指令与错误表达式报错", () => {
    expect(() => composeShader({ entry: "bad-directive.wgsl", modules: MODULES })).toThrowError(
      /bad-directive\.wgsl:1: 无法识别的指令/,
    )
    expect(() => composeShader({ entry: "bad-expr.wgsl", modules: MODULES })).toThrowError(
      /bad-expr\.wgsl:1: 条件表达式错误/,
    )
  })
})

describe("行号映射", () => {
  it("输出行映射回原文件与行号", () => {
    const result = composeShader({ entry: "a.wgsl", modules: MODULES })
    // 输出第 1 行来自 c.wgsl 第 3 行（前两行是块注释）
    expect(result.mapLine(1)).toEqual({ file: "c.wgsl", line: 3 })
    // b.wgsl 的函数体
    expect(result.mapLine(2)).toEqual({ file: "b.wgsl", line: 2 })
    expect(result.mapLine(3)).toEqual({ file: "b.wgsl", line: 3 })
    expect(result.mapLine(4)).toEqual({ file: "b.wgsl", line: 4 })
    expect(result.mapLine(5)).toEqual({ file: "a.wgsl", line: 4 })
    expect(result.mapLine(0)).toBeUndefined()
    expect(result.mapLine(99)).toBeUndefined()
  })

  it("formatCompilationMessages 输出原始位置", () => {
    const result = composeShader({ entry: "a.wgsl", modules: MODULES })
    const text = formatCompilationMessages(
      [
        { type: "error", lineNum: 3, linePos: 12, message: "unresolved value 'c'" },
        { type: "warning", lineNum: 42, linePos: 1, message: "out of range" },
      ],
      result,
    )
    expect(text).toMatchSnapshot()
  })
})

describe("内置模块", () => {
  it("三角形着色器可组合内置模块", () => {
    const result = composeShader({
      entry: "triangle.wgsl",
      modules: { ...BUILTIN_MODULES, "triangle.wgsl": MODULES["triangle.wgsl"]! },
    })
    expect(result.modules).toEqual([
      "builtin/constants.wgsl",
      "builtin/frame.wgsl",
      "triangle.wgsl",
    ])
    expect(result.code).toContain("struct FrameUniforms {")
    expect(result.code).toContain("@group(0) @binding(0) var<uniform> frame: FrameUniforms;")
    expect(result.code).not.toContain("//")
    expect(result.code).toMatchSnapshot()
  })
})

describe("override 透传与顶层重名", () => {
  it("override 行原样进入输出", () => {
    const result = composeShader({
      entry: "ov.wgsl",
      modules: {
        "ov.wgsl": `override layerCount: u32 = 1;
fn useOverride() -> u32 { return layerCount; }
`,
      },
    })
    expect(result.code).toContain("override layerCount: u32 = 1;")
  })

  it("顶层 fn 重名报错", () => {
    expect(() =>
      composeShader({
        entry: "dup.wgsl",
        modules: {
          "dup.wgsl": `#import "other.wgsl"
fn shared() {}
`,
          "other.wgsl": `fn shared() {}
`,
        },
      }),
    ).toThrowError(/顶层符号 "shared" 重复定义/)
  })
})

describe("地形着色器组合", () => {
  it("terrain.wgsl 组合含 RTE 与 G-buffer 输出", () => {
    const result = composeShader({
      entry: "globe/terrain.wgsl",
      modules: SHADER_MODULES,
    })
    expect(result.modules).toContain("builtin/transforms.wgsl")
    expect(result.modules).toContain("materials/gbuffer.wgsl")
    expect(result.modules).toContain("globe/terrain.wgsl")
    expect(result.code).toContain("fn rteToEye")
    expect(result.code).toContain("fn vsTerrain")
    expect(result.code).toContain("fn writeGBuffer")
    expect(result.code).toContain("texture_2d_array")
    expect(result.code).toMatchSnapshot()
  })

  it("reproject.wgsl 恒等与 Mercator 分支", () => {
    const identity = composeShader({
      entry: "globe/reproject.wgsl",
      modules: GLOBE_MODULES,
    })
    expect(identity.code).toContain("override WORKGROUP_SIZE")
    expect(identity.code).not.toContain("geographicToMercatorV")
    const mercator = composeShader({
      entry: "globe/reproject.wgsl",
      modules: GLOBE_MODULES,
      defines: { REPROJECT_MERCATOR: 1 },
    })
    expect(mercator.code).toContain("fn geographicToMercatorV")
    expect(mercator.code).toMatchSnapshot()
  })
})

describe("M4 着色器组合", () => {
  it("延迟光照与大气模块可组合", () => {
    const lighting = composeShader({ entry: "lighting/deferred.wgsl", modules: SHADER_MODULES })
    expect(lighting.code).toContain("fn evaluateBrdf")
    expect(lighting.code).toContain("fn octDecode")
    expect(lighting.code).not.toMatch(/fn evaluateBrdf[\s\S]*fn evaluateBrdf/)
    const sky = composeShader({ entry: "atmosphere/sky.wgsl", modules: SHADER_MODULES })
    expect(sky.code).toContain("fn fsSky")
    const mesh = composeShader({
      entry: "materials/mesh.wgsl",
      modules: SHADER_MODULES,
      defines: { HAS_MAP: 1 },
    })
    expect(mesh.code).toContain("fn vsMesh")
    expect(mesh.code).toContain("textureSample(materialMap")
  })
})

describe("hashString", () => {
  it("同输入同输出，不同输入不同输出", () => {
    expect(hashString("abc")).toBe(hashString("abc"))
    expect(hashString("abc")).not.toBe(hashString("abd"))
    expect(hashString("")).toMatch(/^[0-9a-f]{14}$/)
  })
})
