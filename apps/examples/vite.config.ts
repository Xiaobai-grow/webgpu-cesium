import { fileURLToPath } from "node:url"
import vue from "@vitejs/plugin-vue"
import { wgsl } from "@webgpu-cesium/wgsl-plugin"
import { defineConfig } from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))

/** dev 与 build 都直接引用 workspace 源码，不依赖 dist */
const workspaceAlias = {
  "@webgpu-cesium/core": `${root}packages/core/src/index.ts`,
  "@webgpu-cesium/rhi": `${root}packages/rhi/src/index.ts`,
  "@webgpu-cesium/shaders": `${root}packages/shaders/src/index.ts`,
  "@webgpu-cesium/renderer": `${root}packages/renderer/src/index.ts`,
  "@webgpu-cesium/scene": `${root}packages/scene/src/index.ts`,
  "@webgpu-cesium/widgets": `${root}packages/widgets/src/index.ts`,
}

export default defineConfig({
  plugins: [vue(), wgsl()],
  resolve: { alias: workspaceAlias },
  server: {
    fs: { allow: [root] },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
})
