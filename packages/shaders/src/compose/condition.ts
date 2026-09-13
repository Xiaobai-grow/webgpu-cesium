/**
 * `#if` / `#elif` 条件表达式求值。
 *
 * 语法（最小子集，见 docs/10-architecture/04-shader-system.md）：
 *   expr   := term (("&&" | "||") term)*
 *   term   := "!"? atom | atom op value
 *   atom   := NAME | INTEGER | "true" | "false" | "(" expr ")"
 *   op     := "==" | "!=" | ">" | "<" | ">=" | "<="
 *
 * 未定义的 NAME 视为 0 / false。
 */
import type { DefineValue } from "./types"

type Defines = Readonly<Record<string, DefineValue>>

const TOKEN_RE = /\s*(&&|\|\||==|!=|>=|<=|[!<>()]|[A-Za-z_][A-Za-z0-9_]*|-?\d+)\s*/gy

function tokenize(rawExpression: string): string[] {
  const expression = rawExpression.trim()
  const tokens: string[] = []
  TOKEN_RE.lastIndex = 0
  let position = 0
  while (position < expression.length) {
    TOKEN_RE.lastIndex = position
    const match = TOKEN_RE.exec(expression)
    if (match?.index !== position) {
      throw new SyntaxError(`无法识别的字符 "${expression.slice(position)}"`)
    }
    if (match[1] !== undefined) {
      tokens.push(match[1])
    }
    position = TOKEN_RE.lastIndex
  }
  return tokens
}

/** define 值转数字：true → 1，false → 0，未定义 → 0 */
function toNumber(value: DefineValue | undefined): number {
  if (value === undefined) {
    return 0
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0
  }
  return value
}

class Parser {
  private index = 0

  constructor(
    private readonly tokens: string[],
    private readonly defines: Defines,
  ) {}

  parse(): boolean {
    if (this.tokens.length === 0) {
      throw new SyntaxError("条件为空")
    }
    const value = this.parseExpression()
    if (this.index !== this.tokens.length) {
      throw new SyntaxError(`多余的 token "${this.tokens[this.index] ?? ""}"`)
    }
    return value
  }

  private peek(): string | undefined {
    return this.tokens[this.index]
  }

  private next(): string {
    const token = this.tokens[this.index]
    if (token === undefined) {
      throw new SyntaxError("表达式不完整")
    }
    this.index++
    return token
  }

  private parseExpression(): boolean {
    let left = this.parseTerm()
    for (;;) {
      const op = this.peek()
      if (op === "&&") {
        this.next()
        const right = this.parseTerm()
        left = left && right
      } else if (op === "||") {
        this.next()
        const right = this.parseTerm()
        left = left || right
      } else {
        return left
      }
    }
  }

  private parseTerm(): boolean {
    if (this.peek() === "!") {
      this.next()
      return !this.parseTerm()
    }
    const left = this.parseAtom()
    const op = this.peek()
    if (op === "==" || op === "!=" || op === ">" || op === "<" || op === ">=" || op === "<=") {
      this.next()
      const right = this.parseAtom()
      switch (op) {
        case "==":
          return left === right
        case "!=":
          return left !== right
        case ">":
          return left > right
        case "<":
          return left < right
        case ">=":
          return left >= right
        case "<=":
          return left <= right
      }
    }
    return left !== 0
  }

  private parseAtom(): number {
    const token = this.next()
    if (token === "(") {
      const value = this.parseExpression() ? 1 : 0
      if (this.next() !== ")") {
        throw new SyntaxError("缺少 )")
      }
      return value
    }
    if (token === "true") {
      return 1
    }
    if (token === "false") {
      return 0
    }
    if (/^-?\d+$/.test(token)) {
      return Number.parseInt(token, 10)
    }
    if (/^[A-Za-z_]/.test(token)) {
      return toNumber(this.defines[token])
    }
    throw new SyntaxError(`意外的 token "${token}"`)
  }
}

/** 求值条件表达式；语法错误抛 SyntaxError（由调用方补上文件与行号） */
export function evaluateCondition(expression: string, defines: Defines): boolean {
  return new Parser(tokenize(expression), defines).parse()
}
