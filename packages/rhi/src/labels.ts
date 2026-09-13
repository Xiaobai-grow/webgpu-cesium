/**
 * GPU 对象标签：格式 `包名/类名/标识`，便于浏览器 GPU 调试器定位（见 03-rhi-and-render-graph.md）。
 */
export const PACKAGE_LABEL = "rhi"

export function makeLabel(
  className: string,
  id: string | number,
  packageName = PACKAGE_LABEL,
): string {
  return `${packageName}/${className}/${String(id)}`
}
