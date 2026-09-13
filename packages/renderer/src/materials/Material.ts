/**
 * Material 基类（three.js 属性名，ADR-0010）。
 */
import type { Color } from "@webgpu-cesium/core"
import {
  DoubleSide,
  FrontSide,
  MATERIAL_UNIFORM_BYTES,
  NormalBlending,
  type Blending,
  type Side,
} from "./constants"

export interface ShaderComposeTarget {
  source: string
  defines: Record<string, boolean | number>
  uniforms: Record<string, unknown>
}

export interface MaterialOptions {
  name?: string
  transparent?: boolean
  opacity?: number
  alphaTest?: number
  side?: Side
  blending?: Blending
  depthTest?: boolean
  depthWrite?: boolean
  vertexColors?: boolean
  visible?: boolean
  toneMapped?: boolean
}

let materialId = 0

/**
 * 属性式材质。数值进 uniform，结构性开关进 defines / 变体键。
 */
export class Material {
  readonly id: number
  readonly uuid: string
  name: string
  type = "Material"
  transparent: boolean
  opacity: number
  alphaTest: number
  side: Side
  blending: Blending
  depthTest: boolean
  depthWrite: boolean
  vertexColors: boolean
  visible: boolean
  toneMapped: boolean
  needsUpdate = true
  version = 0
  readonly defines: Record<string, boolean | number> = {}
  readonly userData: Record<string, unknown> = {}
  onBeforeCompose: ((shader: ShaderComposeTarget) => void) | undefined

  /**
   * @param options 基类属性
   */
  constructor(options: MaterialOptions = {}) {
    this.id = ++materialId
    this.uuid = `mat-${String(this.id)}`
    this.name = options.name ?? ""
    this.transparent = options.transparent ?? false
    this.opacity = options.opacity ?? 1
    this.alphaTest = options.alphaTest ?? 0
    this.side = options.side ?? FrontSide
    this.blending = options.blending ?? NormalBlending
    this.depthTest = options.depthTest ?? true
    this.depthWrite = options.depthWrite ?? true
    this.vertexColors = options.vertexColors ?? false
    this.visible = options.visible ?? true
    this.toneMapped = options.toneMapped ?? true
  }

  /**
   * 变体键（结构性 defines + 用户缓存键）。
   */
  customProgramCacheKey(): string {
    return ""
  }

  /**
   * pipeline 变体键。
   */
  variantKey(): string {
    const keys = Object.keys(this.defines)
      .sort()
      .map((key) => `${key}=${String(this.defines[key])}`)
    return [this.type, ...keys, this.customProgramCacheKey(), this.side, this.blending].join("|")
  }

  /**
   * 是否走前向透明（M4 网格仍写 G-buffer；transmission / 透明留给 M5/M9）。
   */
  get isTransparentPass(): boolean {
    return this.transparent || this.opacity < 1 || this.blending !== NormalBlending
  }

  /**
   * Reverse-Z 下的 GPU 深度比较。
   */
  gpuDepthCompare(): GPUCompareFunction {
    if (!this.depthTest) {
      return "always"
    }
    return "greater"
  }

  gpuCullMode(): GPUCullMode {
    if (this.side === DoubleSide) {
      return "none"
    }
    return this.side === FrontSide ? "back" : "front"
  }

  /**
   * 写入 80 字节 group 2 uniform。子类覆盖 packUniforms。
   *
   * @param out 目标
   */
  packUniforms(out: ArrayBuffer): void {
    const f32 = new Float32Array(out)
    f32[0] = 1
    f32[1] = 1
    f32[2] = 1
    f32[3] = 1
    f32[8] = 1
    f32[10] = this.opacity
    f32[11] = 1
  }

  /**
   * @experimental 七个接口点由 mesh.wgsl 的 HOOK_* defines 打开。
   *
   * @param shader 组合目标
   */
  applyComposeHooks(shader: ShaderComposeTarget): void {
    this.onBeforeCompose?.(shader)
  }

  clone(): Material {
    return this.copy(new Material())
  }

  /**
   * 复制到目标。
   *
   * @param target 目标
   */
  copy(target: Material): Material {
    target.name = this.name
    target.transparent = this.transparent
    target.opacity = this.opacity
    target.alphaTest = this.alphaTest
    target.side = this.side
    target.blending = this.blending
    target.depthTest = this.depthTest
    target.depthWrite = this.depthWrite
    target.vertexColors = this.vertexColors
    target.visible = this.visible
    target.toneMapped = this.toneMapped
    return target
  }

  dispose(): void {
    this.needsUpdate = true
    this.version++
  }
}

/**
 * 把 Color 写成线性 RGB（Cesium Color 按 sRGB 存储）。
 *
 * @param color 颜色
 * @param dest 长度 ≥ 3
 * @param offset 起始
 */
export function writeColorLinear(color: Color, dest: Float32Array, offset: number): void {
  dest[offset] = srgbChannel(color.red)
  dest[offset + 1] = srgbChannel(color.green)
  dest[offset + 2] = srgbChannel(color.blue)
}

function srgbChannel(value: number): number {
  if (value <= 0.04045) {
    return value / 12.92
  }
  return ((value + 0.055) / 1.055) ** 2.4
}

export { MATERIAL_UNIFORM_BYTES }
