import { defineConfig } from "tsdown"
import { wgsl } from "@webgpu-cesium/wgsl-plugin"

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  dts: true,
  fixedExtension: false,
  clean: true,
  sourcemap: true,
  plugins: [wgsl()],
})
