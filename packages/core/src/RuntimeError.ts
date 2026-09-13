/**
 * 运行期错误：由环境或数据导致、开发者无法在编码期避免的错误
 * （例如 WebGPU 不可用、设备创建失败、资源解析失败）。
 *
 * TODO(M1): 用 Cesium `Core/RuntimeError.js` 的移植版替换（保留 `name` / `message` / `stack` 语义）。
 */
export class RuntimeError extends Error {
  override readonly name: string = "RuntimeError"

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    // 保持原型链，便于 instanceof 判断（ES2022 class 已默认正确，此处显式声明防止被转译破坏）
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
