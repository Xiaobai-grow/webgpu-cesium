/**
 * 3D Tiles 样式。对标 Cesium `Cesium3DTileStyle`（表达式引擎为最小子集）。
 */
import { Color } from "@webgpu-cesium/core"
import { Cesium3DTileColorBlendMode } from "./Cesium3DTileColorBlendMode"
import { ConditionsExpression, Expression, type StyleFeatureLike } from "./Expression"

export interface Cesium3DTileStyleJson {
  color?: string | { conditions?: [string, string][] }
  show?: string | boolean | { conditions?: [string, string][] }
  meta?: Record<string, unknown>
  defines?: Record<string, string>
}

/**
 * 样式对象。
 */
export class Cesium3DTileStyle {
  color: Expression | ConditionsExpression | undefined
  show: Expression | ConditionsExpression | undefined
  readonly meta: Record<string, unknown>
  colorBlendMode = Cesium3DTileColorBlendMode.HIGHLIGHT
  style: Cesium3DTileStyleJson

  /**
   * @param style JSON 或已构造对象
   */
  constructor(style: Cesium3DTileStyleJson | string = {}) {
    this.style = typeof style === "string" ? (JSON.parse(style) as Cesium3DTileStyleJson) : style
    this.meta = this.style.meta ?? {}
    this.color = parseStyleExpr(this.style.color)
    this.show = parseStyleExpr(this.style.show ?? "true")
  }

  /**
   * 评估颜色。
   *
   * @param feature 要素
   */
  evaluateColor(feature?: StyleFeatureLike): Color {
    if (!this.color) {
      return new Color(1, 1, 1, 1)
    }
    return this.color.evaluateColor(feature)
  }

  /**
   * 评估可见性。
   *
   * @param feature 要素
   */
  evaluateShow(feature?: StyleFeatureLike): boolean {
    if (!this.show) {
      return true
    }
    if (this.show instanceof ConditionsExpression) {
      return Boolean(this.show.evaluate(feature) ?? true)
    }
    return this.show.evaluateBoolean(feature)
  }
}

function parseStyleExpr(
  value: string | boolean | { conditions?: [string, string][] } | undefined,
): Expression | ConditionsExpression | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value === "boolean") {
    return new Expression(value ? "true" : "false")
  }
  if (typeof value === "string") {
    return new Expression(value)
  }
  if (value.conditions) {
    return new ConditionsExpression(value)
  }
  return undefined
}
