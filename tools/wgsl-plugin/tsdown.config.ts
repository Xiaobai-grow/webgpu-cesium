import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  dts: true,
  fixedExtension: false,
  clean: true,
  sourcemap: true,
  // 类型只从 vite / rolldown 引用，运行时不依赖它们；不打进产物
  deps: { neverBundle: ["vite", "rolldown"] },
})
