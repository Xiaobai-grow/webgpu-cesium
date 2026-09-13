/**
 * 可选 feature 白名单与探测策略（见 docs/20-tech-stack/02-webgpu-capability-matrix.md 第 2 节）。
 *
 * `GpuDevice.create()` 把适配器支持且在白名单内的 feature 全部放入 `requiredFeatures`；
 * 上层通过 `device.features.has()` 决定变体与 defines。每个可选 feature 都必须有回退路径。
 */
export const OPTIONAL_FEATURE_WHITELIST: readonly string[] = [
  // 保证 core 能力（compatibility mode 适配器没有该 feature）
  "core-features-and-limits",
  "timestamp-query",
  "indirect-first-instance",
  "shader-f16",
  "subgroups",
  "depth-clip-control",
  "depth32float-stencil8",
  "float32-filterable",
  "texture-compression-bc",
  "texture-compression-etc2",
  "texture-compression-astc",
  "rg11b10ufloat-renderable",
  "bgra8unorm-storage",
  "dual-source-blending",
  "clip-distances",
]

/** 从适配器 feature 集合中挑出白名单内可用的项 */
export function selectSupportedFeatures(
  available: ReadonlySet<string>,
  whitelist: readonly string[] = OPTIONAL_FEATURE_WHITELIST,
): GPUFeatureName[] {
  const selected: GPUFeatureName[] = []
  for (const name of whitelist) {
    if (available.has(name)) {
      selected.push(name as GPUFeatureName)
    }
  }
  return selected
}
