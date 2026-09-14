/**
 * 样式表达式的最小求值（不引入 jsep）。支持 color() / true / false / ${prop} 比较。
 */
import { Color } from "@webgpu-cesium/core"

export interface StyleFeatureLike {
  getProperty(name: string): unknown
}

/**
 * 一条表达式。
 */
export class Expression {
  readonly expression: string

  /**
   * @param expression 源
   */
  constructor(expression: string) {
    this.expression = expression.trim()
  }

  /**
   * 求值为颜色；失败则白。
   *
   * @param feature 要素
   */
  evaluateColor(feature?: StyleFeatureLike): Color {
    const text = this.expression
    const colorCall = /^color\(\s*['"]([^'"]+)['"]\s*(?:,\s*([0-9.]+)\s*)?\)$/i.exec(text)
    if (colorCall) {
      const parsed = Color.fromCssColorString(colorCall[1] ?? "#ffffff")
      if (parsed) {
        parsed.alpha = colorCall[2] !== undefined ? Number(colorCall[2]) : parsed.alpha
        return parsed
      }
    }
    const vec4 = /^vec4\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/.exec(
      text,
    )
    if (vec4) {
      return new Color(Number(vec4[1]), Number(vec4[2]), Number(vec4[3]), Number(vec4[4]))
    }
    const fromProp = this.evaluate(feature)
    if (fromProp instanceof Color) {
      return fromProp
    }
    return new Color(1, 1, 1, 1)
  }

  /**
   * 求值为布尔。
   *
   * @param feature 要素
   */
  evaluateBoolean(feature?: StyleFeatureLike): boolean {
    const value = this.evaluate(feature)
    if (typeof value === "boolean") {
      return value
    }
    if (typeof value === "number") {
      return value !== 0
    }
    return Boolean(value)
  }

  /**
   * 通用求值。
   *
   * @param feature 要素
   */
  evaluate(feature?: StyleFeatureLike): unknown {
    const text = this.expression
    if (text === "true") {
      return true
    }
    if (text === "false") {
      return false
    }
    if (text.startsWith("color(") || text.startsWith("vec4(")) {
      return this.evaluateColor(feature)
    }
    const compare = /^\$\{([^}]+)\}\s*(===|==|!==|!=|>=|<=|>|<)\s*(-?[0-9.]+)$/.exec(text)
    if (compare) {
      const left = Number(feature?.getProperty(compare[1] ?? "") ?? NaN)
      const right = Number(compare[3])
      const op = compare[2]
      switch (op) {
        case "===":
        case "==":
          return left === right
        case "!==":
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
        default:
          return false
      }
    }
    const prop = /^\$\{([^}]+)\}$/.exec(text)
    if (prop) {
      return feature?.getProperty(prop[1] ?? "")
    }
    if (/^-?[0-9.]+$/.test(text)) {
      return Number(text)
    }
    return text
  }
}

/**
 * 条件表达式：conditions: [[expr, result], ...]
 */
export class ConditionsExpression {
  readonly conditions: { when: Expression; result: Expression }[]

  /**
   * @param json Cesium 样式 conditions
   */
  constructor(json: { conditions?: [string, string][] }) {
    this.conditions = (json.conditions ?? []).map(([when, result]) => ({
      when: new Expression(when),
      result: new Expression(result),
    }))
  }

  /**
   * 第一项为真的结果。
   *
   * @param feature 要素
   */
  evaluate(feature?: StyleFeatureLike): unknown {
    for (const item of this.conditions) {
      if (item.when.evaluateBoolean(feature)) {
        return item.result.evaluate(feature)
      }
    }
    return undefined
  }

  evaluateColor(feature?: StyleFeatureLike): Color {
    const value = this.evaluate(feature)
    if (value instanceof Color) {
      return value
    }
    if (typeof value === "string") {
      return new Expression(value).evaluateColor(feature)
    }
    return new Color(1, 1, 1, 1)
  }
}
