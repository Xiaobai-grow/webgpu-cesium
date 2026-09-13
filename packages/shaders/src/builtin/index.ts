/**
 * 内置 WGSL 模块表：模块路径 → 源码。
 * 路径与 `#import "builtin/xxx.wgsl"` 中写法一致，供组合器解析。
 */
import constantsWgsl from "./constants.wgsl"
import frameWgsl from "./frame.wgsl"

export const BUILTIN_MODULES: Readonly<Record<string, string>> = Object.freeze({
  "builtin/constants.wgsl": constantsWgsl,
  "builtin/frame.wgsl": frameWgsl,
})

/** FrameUniforms 结构体字节大小（与 frame.wgsl 注释中的布局一致） */
export const FRAME_UNIFORMS_BYTE_LENGTH = 320
