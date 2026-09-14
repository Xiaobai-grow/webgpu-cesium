/**
 * Vitest 根配置。
 *
 * Vitest 4 起 `vitest.workspace.*` 被移除，改为 `test.projects`（见 LOG 2026-09-13 [变更]）。
 * - Node 项目：core / shaders / scene / tiles / environment（纯逻辑，CI 必须全绿）
 * - 浏览器项目：rhi / renderer / scene-gpu（Playwright Chromium；无 GPU 时用例自行 skip）
 */
import { fileURLToPath } from "node:url"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"
import { wgsl } from "@webgpu-cesium/wgsl-plugin"

const root = fileURLToPath(new URL("./", import.meta.url))

/** workspace 包在测试时直接解析到源码，不依赖 dist */
const workspaceAlias = {
  "@webgpu-cesium/core": `${root}packages/core/src/index.ts`,
  "@webgpu-cesium/rhi": `${root}packages/rhi/src/index.ts`,
  "@webgpu-cesium/shaders": `${root}packages/shaders/src/index.ts`,
  "@webgpu-cesium/renderer": `${root}packages/renderer/src/index.ts`,
  "@webgpu-cesium/environment": `${root}packages/environment/src/index.ts`,
  "@webgpu-cesium/scene": `${root}packages/scene/src/index.ts`,
  "@webgpu-cesium/tiles": `${root}packages/tiles/src/index.ts`,
  "@webgpu-cesium/widgets": `${root}packages/widgets/src/index.ts`,
}

/** Chromium WebGPU 启动参数；CI 无 GPU 时通过 WEBGPU_SWIFTSHADER=1 切到软件适配器 */
function chromiumArgs(): string[] {
  const args = ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"]
  if (process.platform === "linux") {
    args.push("--enable-features=Vulkan")
  }
  if (process.env.WEBGPU_SWIFTSHADER === "1") {
    args.push("--use-angle=swiftshader", "--use-webgpu-adapter=swiftshader")
  }
  return args
}

/**
 * 用完整 Chrome for Testing 的「新 headless」模式（channel: "chromium"），
 * 默认的 chrome-headless-shell 不带 GPU 进程，拿不到 WebGPU 适配器。
 */
const browserProvider = playwright({
  launchOptions: { channel: "chromium", args: chromiumArgs() },
})

export default defineConfig({
  plugins: [wgsl()],
  resolve: { alias: workspaceAlias },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "core",
          environment: "node",
          include: ["packages/core/src/**/*.test.ts"],
          exclude: ["packages/core/src/**/*.browser.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "shaders",
          environment: "node",
          include: ["packages/shaders/src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "scene",
          environment: "node",
          include: ["packages/scene/src/**/*.test.ts"],
          exclude: ["packages/scene/src/**/*.render.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "environment",
          environment: "node",
          include: ["packages/environment/src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "tiles",
          environment: "node",
          include: ["packages/tiles/src/**/*.test.ts"],
          exclude: ["packages/tiles/src/**/*.render.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "core-browser",
          include: ["packages/core/src/**/*.browser.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: browserProvider,
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "rhi",
          include: ["packages/rhi/src/**/*.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: browserProvider,
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "renderer",
          include: ["packages/renderer/src/**/*.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: browserProvider,
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "scene-gpu",
          include: ["packages/scene/src/**/*.render.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: browserProvider,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
})
