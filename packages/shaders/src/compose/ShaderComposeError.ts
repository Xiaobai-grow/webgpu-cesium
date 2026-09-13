import { RuntimeError } from "@webgpu-cesium/core"

/**
 * 组合器错误：携带出错的模块路径与行号，`message` 格式为 `path:line: 描述`。
 */
export class ShaderComposeError extends RuntimeError {
  override readonly name: string = "ShaderComposeError"

  constructor(
    readonly file: string,
    readonly line: number,
    readonly detail: string,
  ) {
    super(`${file}:${String(line)}: ${detail}`)
  }
}
