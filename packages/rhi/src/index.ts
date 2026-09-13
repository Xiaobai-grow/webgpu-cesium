/**
 * @webgpu-cesium/rhi
 *
 * 对 WebGPU 的薄封装：唯一直接调用 `navigator.gpu` / `GPUDevice` 的包。
 * M0：GpuDevice、PipelineCache、BindGroupLayoutCache、SamplerCache、ShaderModuleCache。
 * 后续：GpuBuffer / GpuTexture 封装、BindGroupCache、ReadbackQueue、GpuTimer。
 */
export {
  GpuDevice,
  describeAdapterInfo,
  type CanvasConfiguration,
  type GpuDeviceOptions,
  type GpuProbeResult,
} from "./GpuDevice"
export { OPTIONAL_FEATURE_WHITELIST, selectSupportedFeatures } from "./features"
export { makeLabel } from "./labels"
export { PipelineCache } from "./caches/PipelineCache"
export { BindGroupLayoutCache } from "./caches/BindGroupLayoutCache"
export { SamplerCache } from "./caches/SamplerCache"
export { ShaderModuleCache } from "./caches/ShaderModuleCache"
export { stableKey, getObjectId } from "./caches/stableKey"
