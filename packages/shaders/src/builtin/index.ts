/**
 * 内置 WGSL 模块表：模块路径 → 源码。
 * 路径与 `#import "builtin/xxx.wgsl"` 中写法一致，供组合器解析。
 */
import constantsWgsl from "./constants.wgsl"
import frameWgsl from "./frame.wgsl"
import transformsWgsl from "./transforms.wgsl"
import encodingWgsl from "./encoding.wgsl"
import colorWgsl from "./color.wgsl"
import depthWgsl from "./depth.wgsl"
import rteWgsl from "./rte.wgsl"
import pbrWgsl from "./pbr.wgsl"
import terrainWgsl from "../globe/terrain.wgsl"
import reprojectWgsl from "../globe/reproject.wgsl"
import outputWgsl from "../materials/output.wgsl"
import gbufferWgsl from "../materials/gbuffer.wgsl"
import hooksWgsl from "../materials/hooks.wgsl"
import meshWgsl from "../materials/mesh.wgsl"
import atmosphereCommonWgsl from "../atmosphere/common.wgsl"
import transmittanceWgsl from "../atmosphere/transmittance.wgsl"
import multiScatterWgsl from "../atmosphere/multiscatter.wgsl"
import skyViewWgsl from "../atmosphere/skyview.wgsl"
import aerialWgsl from "../atmosphere/aerial.wgsl"
import skyWgsl from "../atmosphere/sky.wgsl"
import iblWgsl from "../atmosphere/ibl.wgsl"
import deferredWgsl from "../lighting/deferred.wgsl"
import tonemapWgsl from "../post/tonemap.wgsl"

export const BUILTIN_MODULES: Readonly<Record<string, string>> = Object.freeze({
  "builtin/constants.wgsl": constantsWgsl,
  "builtin/frame.wgsl": frameWgsl,
  "builtin/transforms.wgsl": transformsWgsl,
  "builtin/encoding.wgsl": encodingWgsl,
  "builtin/color.wgsl": colorWgsl,
  "builtin/depth.wgsl": depthWgsl,
  "builtin/rte.wgsl": rteWgsl,
  "builtin/pbr.wgsl": pbrWgsl,
})

export const GLOBE_MODULES: Readonly<Record<string, string>> = Object.freeze({
  "globe/terrain.wgsl": terrainWgsl,
  "globe/reproject.wgsl": reprojectWgsl,
})

export const MATERIAL_MODULES: Readonly<Record<string, string>> = Object.freeze({
  "materials/output.wgsl": outputWgsl,
  "materials/gbuffer.wgsl": gbufferWgsl,
  "materials/hooks.wgsl": hooksWgsl,
  "materials/mesh.wgsl": meshWgsl,
})

export const ATMOSPHERE_MODULES: Readonly<Record<string, string>> = Object.freeze({
  "atmosphere/common.wgsl": atmosphereCommonWgsl,
  "atmosphere/transmittance.wgsl": transmittanceWgsl,
  "atmosphere/multiscatter.wgsl": multiScatterWgsl,
  "atmosphere/skyview.wgsl": skyViewWgsl,
  "atmosphere/aerial.wgsl": aerialWgsl,
  "atmosphere/sky.wgsl": skyWgsl,
  "atmosphere/ibl.wgsl": iblWgsl,
})

export const LIGHTING_MODULES: Readonly<Record<string, string>> = Object.freeze({
  "lighting/deferred.wgsl": deferredWgsl,
})

export const POST_MODULES: Readonly<Record<string, string>> = Object.freeze({
  "post/tonemap.wgsl": tonemapWgsl,
})

export const SHADER_MODULES: Readonly<Record<string, string>> = Object.freeze({
  ...BUILTIN_MODULES,
  ...GLOBE_MODULES,
  ...MATERIAL_MODULES,
  ...ATMOSPHERE_MODULES,
  ...LIGHTING_MODULES,
  ...POST_MODULES,
})

/** FrameUniforms 结构体字节大小（与 frame.wgsl 注释中的布局一致） */
export const FRAME_UNIFORMS_BYTE_LENGTH = 464
