/**
 * @webgpu-cesium/shaders
 *
 * WGSL 模块源码（builtin/*）与组合器（compose/*）。组合器是纯字符串处理，不依赖 GPU。
 * 反射（reflect/*）在 M2 引入。
 */
export * from "./compose"
export {
  ATMOSPHERE_MODULES,
  BUILTIN_MODULES,
  FRAME_UNIFORMS_BYTE_LENGTH,
  GLOBE_MODULES,
  LIGHTING_MODULES,
  MATERIAL_MODULES,
  POST_MODULES,
  SHADER_MODULES,
} from "./builtin"
