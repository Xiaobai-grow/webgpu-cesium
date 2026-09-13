/**
 * `*.wgsl` 模块声明：由 @webgpu-cesium/wgsl-plugin 在构建期转换为默认导出的字符串。
 * 在包的 tsconfig 中通过 `"types": ["@webgpu-cesium/wgsl-plugin/client"]` 引入。
 */
declare module "*.wgsl" {
  const source: string
  export default source
}
