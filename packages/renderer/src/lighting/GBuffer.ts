/**
 * G-buffer 附件格式（见 10-lighting-shadow-postfx.md）。
 */

export const GBUFFER_FORMATS = Object.freeze({
  gb0: "rgba8unorm",
  gb1: "rgba8unorm",
  gb2: "rgba8unorm",
  gb3: "rgba8unorm",
  depth: "depth32float",
  hdr: "rgba16float",
}) satisfies Readonly<Record<string, GPUTextureFormat>>

export const GBUFFER_COLOR_TARGETS: GPUColorTargetState[] = [
  { format: GBUFFER_FORMATS.gb0 },
  { format: GBUFFER_FORMATS.gb1 },
  { format: GBUFFER_FORMATS.gb2 },
  { format: GBUFFER_FORMATS.gb3 },
]

/** GPUTextureUsage 数值：Node 测试加载本模块时没有 WebGPU 全局 */
const USAGE_COPY_SRC = 0x01
const USAGE_TEXTURE_BINDING = 0x04
const USAGE_RENDER_ATTACHMENT = 0x10

/** 瞬态 G-buffer 用途 */
export const GBUFFER_COLOR_USAGE = USAGE_RENDER_ATTACHMENT | USAGE_TEXTURE_BINDING

export const GBUFFER_DEPTH_USAGE = USAGE_RENDER_ATTACHMENT | USAGE_TEXTURE_BINDING

export const HDR_USAGE = USAGE_RENDER_ATTACHMENT | USAGE_TEXTURE_BINDING | USAGE_COPY_SRC
