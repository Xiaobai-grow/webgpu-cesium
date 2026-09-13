/**
 * 开发期错误：调用方违反了 API 契约（参数缺失、越界、状态不合法）。
 * 生产构建中相关校验（`Check`）会被剥离，因此该错误只应在开发期出现。
 *
 * TODO(M1): 用 Cesium `Core/DeveloperError.js` 的移植版替换，并补充 `Check`。
 */
export class DeveloperError extends Error {
  override readonly name: string = "DeveloperError"

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    Object.setPrototypeOf(this, new.target.prototype)
  }

  /** 供 Cesium 移植代码使用的静态断言辅助（占位） */
  static throwInstantiationError(): never {
    throw new DeveloperError(
      "This function defines an interface and should not be called directly.",
    )
  }
}
