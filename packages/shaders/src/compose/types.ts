/**
 * 组合器公开类型。
 */

/** defines 取值：布尔或整数（`#if NAME`、`#if NAME == 2` 等） */
export type DefineValue = boolean | number

/** 模块解析：路径 → 源码；返回 undefined 表示找不到 */
export type ModuleResolver = (path: string) => string | undefined

export interface ComposeOptions {
  /** 入口模块路径，例如 `"examples/hello-triangle.wgsl"`，必须能被 `modules` 解析到 */
  entry: string
  /** 模块表或解析函数；通常为 `{ ...BUILTIN_MODULES, [entry]: source }` */
  modules: Readonly<Record<string, string>> | ModuleResolver
  /** 编译期条件 */
  defines?: Readonly<Record<string, DefineValue>>
}

/** 输出行到原始位置的映射 */
export interface SourceLocation {
  /** 模块路径 */
  file: string
  /** 原文件中的行号（1 起） */
  line: number
}

export interface ComposeResult {
  /** 规范化后的 WGSL（去注释、统一空白、无空行、无指令行） */
  code: string
  /** `code` 的稳定哈希（十六进制字符串），用作 pipeline / shader module 缓存键的一部分 */
  hash: string
  /** `sourceMap[i]` 为输出第 i 行（0 起）对应的原始位置 */
  sourceMap: readonly SourceLocation[]
  /** 参与组合的模块路径，拓扑顺序（依赖在前） */
  modules: readonly string[]
  /**
   * 把 GPU 编译错误的行号（1 起，对应 `code`）映射回原始文件与行号；
   * 越界返回 undefined。
   */
  mapLine(outputLine: number): SourceLocation | undefined
}

/** 与 `GPUCompilationMessage` 结构兼容的最小子集（不依赖 @webgpu/types） */
export interface CompilationMessageLike {
  message: string
  type: "error" | "warning" | "info"
  lineNum: number
  linePos: number
}
