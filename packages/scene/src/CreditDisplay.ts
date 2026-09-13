/**
 * 收集本帧 Credit，交给 widgets / 示例站渲染。
 * DOM 不在 scene 包创建（见架构：展示层在 widgets）。
 */
import { type Credit } from "@webgpu-cesium/core"

/**
 * 帧内归属收集器。
 */
export class CreditDisplay {
  private readonly _current = new Map<number, Credit>()
  private _onScreen: Credit[] = []

  /**
   * 记录一条归属。
   *
   * @param credit 归属
   */
  addCredit(credit: Credit): void {
    this._current.set(credit.id, credit)
  }

  /**
   * 帧末固化列表。
   */
  endFrame(): void {
    this._onScreen = [...this._current.values()]
    this._current.clear()
  }

  /** 当前帧应显示的归属 */
  get credits(): readonly Credit[] {
    return this._onScreen
  }

  /**
   * 渲染到容器（纯文本，避免未消毒 HTML）。
   *
   * @param container 目标节点
   */
  updateContainer(container: HTMLElement): void {
    const text = this._onScreen.map((credit) => credit.text).join(" · ")
    container.textContent = text
  }
}
