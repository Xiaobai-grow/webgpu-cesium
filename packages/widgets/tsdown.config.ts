import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "browser",
  dts: true,
  fixedExtension: false,
  clean: true,
  sourcemap: true,
  // Vue 由使用方提供（peerDependency），不打进包
  deps: { neverBundle: ["vue"] },
})
