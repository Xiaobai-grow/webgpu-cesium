import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "browser",
  dts: true,
  fixedExtension: false,
  clean: true,
  sourcemap: true,
  // 聚合包把各子包打进同一产物（CDN 单文件），vue 保持外部
  deps: { alwaysBundle: [/^@webgpu-cesium\//], neverBundle: ["vue"] },
})
