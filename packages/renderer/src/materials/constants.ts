/**
 * three.js 风格材质 / 纹理常量（ADR-0010）。
 */

export const FrontSide = 0
export const BackSide = 1
export const DoubleSide = 2
export type Side = typeof FrontSide | typeof BackSide | typeof DoubleSide

export const NoBlending = 0
export const NormalBlending = 1
export const AdditiveBlending = 2
export const SubtractiveBlending = 3
export const MultiplyBlending = 4
export const CustomBlending = 5
export type Blending =
  | typeof NoBlending
  | typeof NormalBlending
  | typeof AdditiveBlending
  | typeof SubtractiveBlending
  | typeof MultiplyBlending
  | typeof CustomBlending

export const NeverDepth = 0
export const AlwaysDepth = 1
export const LessDepth = 2
export const LessEqualDepth = 3
export const EqualDepth = 4
export const GreaterEqualDepth = 5
export const GreaterDepth = 6
export const NotEqualDepth = 7

export const RepeatWrapping = 1000
export const ClampToEdgeWrapping = 1001
export const MirroredRepeatWrapping = 1002

export const NearestFilter = 1003
export const LinearFilter = 1006
export const LinearMipmapLinearFilter = 1008

export const SRGBColorSpace = "srgb"
export const LinearSRGBColorSpace = "srgb-linear"
export const NoColorSpace = ""

export const MATERIAL_UNIFORM_BYTES = 80

/** 手写 group 2 uniform 布局（不引入 wgsl_reflect） */
export const MATERIAL_UNIFORMS_LAYOUT = Object.freeze({
  byteLength: MATERIAL_UNIFORM_BYTES,
  color: 0,
  emissive: 16,
  params0: 32,
  params1: 48,
  params2: 64,
})
