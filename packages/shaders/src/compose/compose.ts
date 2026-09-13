/**
 * WGSL 组合器最小子集（M0）。
 *
 * 支持的指令（必须独占一行，行首可有空白）：
 *   #import "path.wgsl"          依赖引入：拓扑排序、去重、循环依赖报错
 *   #if EXPR / #elif EXPR / #else / #endif   编译期条件（EXPR 见 condition.ts）
 *
 * 处理流程：
 *   1. 逐模块：去注释 → 按 defines 求值条件块 → 收集活动行与 #import；
 *   2. DFS 解析依赖：visiting 集合检测循环；后序得到拓扑顺序（依赖在前）；
 *   3. 输出：拼接各模块的活动行（统一空白、去空行），同时记录每行的原始位置；
 *   4. 计算哈希。
 *
 * 后续（M2+）再加：`#import ... as ns`、`#define_import_path`、`@binding_auto`、反射。
 */
import { evaluateCondition } from "./condition"
import { hashString } from "./hash"
import { ShaderComposeError } from "./ShaderComposeError"
import type {
  CompilationMessageLike,
  ComposeOptions,
  ComposeResult,
  DefineValue,
  ModuleResolver,
  SourceLocation,
} from "./types"

const IMPORT_RE = /^#import\s+"([^"]+)"\s*$/
const IF_RE = /^#if\s+(.+)$/
const ELIF_RE = /^#elif\s+(.+)$/
const ELSE_RE = /^#else\s*$/
const ENDIF_RE = /^#endif\s*$/

interface OutputLine {
  text: string
  location: SourceLocation
}

interface ParsedModule {
  path: string
  imports: { path: string; line: number }[]
  lines: OutputLine[]
}

/** 条件块状态 */
interface ConditionFrame {
  /** 该块所在的外层是否活动 */
  parentActive: boolean
  /** 当前分支是否活动 */
  active: boolean
  /** 是否已有某个分支被选中（用于 #elif / #else） */
  taken: boolean
  /** 是否已出现 #else */
  sawElse: boolean
  /** #if 所在行号（用于未闭合错误） */
  line: number
}

function toResolver(modules: ComposeOptions["modules"]): ModuleResolver {
  if (typeof modules === "function") {
    return modules
  }
  return (path) => modules[path]
}

/**
 * 去掉 `//` 行注释与 `/* *\/` 块注释（WGSL 无字符串字面量，可直接扫描）。
 * 返回与输入同样行数的数组，块注释跨行时保留空行以维持行号。
 */
export function stripComments(source: string): string[] {
  const lines = source.split(/\r?\n/)
  const output: string[] = []
  let inBlock = false
  for (const line of lines) {
    let result = ""
    let i = 0
    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf("*/", i)
        if (end === -1) {
          i = line.length
        } else {
          inBlock = false
          i = end + 2
        }
        continue
      }
      const ch = line[i]
      const next = line[i + 1]
      if (ch === "/" && next === "/") {
        break
      }
      if (ch === "/" && next === "*") {
        inBlock = true
        i += 2
        continue
      }
      result += ch
      i++
    }
    output.push(result)
  }
  return output
}

/** 统一空白：折叠连续空白为单个空格并去首尾空白 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/** 解析单个模块：去注释、求值条件块、收集 import 与活动行 */
function parseModule(
  path: string,
  source: string,
  defines: Readonly<Record<string, DefineValue>>,
): ParsedModule {
  const lines = stripComments(source)
  const imports: ParsedModule["imports"] = []
  const output: OutputLine[] = []
  const stack: ConditionFrame[] = []

  const isActive = (): boolean => (stack.length === 0 ? true : stack[stack.length - 1]!.active)

  const evaluate = (expression: string, line: number): boolean => {
    try {
      return evaluateCondition(expression, defines)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new ShaderComposeError(path, line, `条件表达式错误：${detail}`)
    }
  }

  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1
    const trimmed = lines[index]!.trim()

    if (!trimmed.startsWith("#")) {
      if (trimmed.length > 0 && isActive()) {
        output.push({
          text: normalizeWhitespace(trimmed),
          location: { file: path, line: lineNumber },
        })
      }
      continue
    }

    let match: RegExpExecArray | null
    if ((match = IF_RE.exec(trimmed))) {
      const parentActive = isActive()
      const value = parentActive && evaluate(match[1]!, lineNumber)
      stack.push({ parentActive, active: value, taken: value, sawElse: false, line: lineNumber })
    } else if ((match = ELIF_RE.exec(trimmed))) {
      const frame = stack[stack.length - 1]
      if (!frame) {
        throw new ShaderComposeError(path, lineNumber, "#elif 没有匹配的 #if")
      }
      if (frame.sawElse) {
        throw new ShaderComposeError(path, lineNumber, "#elif 出现在 #else 之后")
      }
      const value = frame.parentActive && !frame.taken && evaluate(match[1]!, lineNumber)
      frame.active = value
      frame.taken = frame.taken || value
    } else if (ELSE_RE.test(trimmed)) {
      const frame = stack[stack.length - 1]
      if (!frame) {
        throw new ShaderComposeError(path, lineNumber, "#else 没有匹配的 #if")
      }
      if (frame.sawElse) {
        throw new ShaderComposeError(path, lineNumber, "重复的 #else")
      }
      frame.sawElse = true
      frame.active = frame.parentActive && !frame.taken
      frame.taken = true
    } else if (ENDIF_RE.test(trimmed)) {
      if (stack.pop() === undefined) {
        throw new ShaderComposeError(path, lineNumber, "#endif 没有匹配的 #if")
      }
    } else if ((match = IMPORT_RE.exec(trimmed))) {
      if (isActive()) {
        imports.push({ path: match[1]!, line: lineNumber })
      }
    } else {
      throw new ShaderComposeError(path, lineNumber, `无法识别的指令 "${trimmed}"`)
    }
  }

  const unclosed = stack[stack.length - 1]
  if (unclosed) {
    throw new ShaderComposeError(path, unclosed.line, "#if 未闭合（缺少 #endif）")
  }

  return { path, imports, lines: output }
}

/**
 * 组合入口模块及其依赖，输出规范化 WGSL、哈希与行号映射。
 */
export function composeShader(options: ComposeOptions): ComposeResult {
  const resolve = toResolver(options.modules)
  const defines = options.defines ?? {}

  const parsed = new Map<string, ParsedModule>()
  const order: string[] = []
  const visiting = new Set<string>()

  // DFS：后序压入 order，依赖在前
  const visit = (path: string, from?: { file: string; line: number }): void => {
    if (parsed.has(path)) {
      return
    }
    if (visiting.has(path)) {
      const chain = [...visiting, path].join(" -> ")
      throw new ShaderComposeError(from?.file ?? path, from?.line ?? 0, `循环依赖：${chain}`)
    }
    const source = resolve(path)
    if (source === undefined) {
      throw new ShaderComposeError(
        from?.file ?? path,
        from?.line ?? 0,
        from ? `找不到模块 "${path}"` : `找不到入口模块 "${path}"`,
      )
    }
    visiting.add(path)
    const module = parseModule(path, source, defines)
    for (const dependency of module.imports) {
      visit(dependency.path, { file: path, line: dependency.line })
    }
    visiting.delete(path)
    parsed.set(path, module)
    order.push(path)
  }
  visit(options.entry)

  // 拼接输出
  const sourceMap: SourceLocation[] = []
  const codeLines: string[] = []
  for (const path of order) {
    for (const line of parsed.get(path)!.lines) {
      codeLines.push(line.text)
      sourceMap.push(line.location)
    }
  }
  const code = codeLines.join("\n")

  return {
    code,
    hash: hashString(code),
    sourceMap,
    modules: order,
    mapLine(outputLine: number): SourceLocation | undefined {
      return sourceMap[outputLine - 1]
    },
  }
}

/**
 * 把 GPU 编译信息映射回原始文件与行号并格式化为多行文本，便于日志与错误面板显示。
 */
export function formatCompilationMessages(
  messages: readonly CompilationMessageLike[],
  result: ComposeResult,
): string {
  return messages
    .map((message) => {
      const location = result.mapLine(message.lineNum)
      const where = location
        ? `${location.file}:${String(location.line)}:${String(message.linePos)}`
        : `<composed>:${String(message.lineNum)}:${String(message.linePos)}`
      return `${message.type} ${where}: ${message.message}`
    })
    .join("\n")
}
