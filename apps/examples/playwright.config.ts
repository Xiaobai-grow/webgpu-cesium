import { defineConfig, devices } from "@playwright/test"

/** Chromium WebGPU 启动参数；CI 无 GPU 时 WEBGPU_SWIFTSHADER=1 切软件适配器 */
const chromiumArgs = ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"]
if (process.platform === "linux") {
  chromiumArgs.push("--enable-features=Vulkan")
}
if (process.env.WEBGPU_SWIFTSHADER === "1") {
  chromiumArgs.push("--use-angle=swiftshader", "--use-webgpu-adapter=swiftshader")
}

const PORT = 4174

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}-{platform}{ext}",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      // 不同 GPU / 驱动的光栅化差异；三角形边缘抗锯齿不同
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  use: {
    baseURL: `http://127.0.0.1:${String(PORT)}`,
    viewport: { width: 1024, height: 640 },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 640 },
        deviceScaleFactor: 1,
        // 完整 Chrome for Testing 的新 headless 模式；默认 headless shell 无 GPU 进程，拿不到 WebGPU
        launchOptions: { channel: "chromium", args: chromiumArgs },
      },
    },
  ],
  webServer: {
    // 显式绑定 127.0.0.1：Vite 默认只监听 localhost（部分机器解析为 ::1），Playwright 轮询 127.0.0.1 会等不到
    command: `pnpm exec vite --host 127.0.0.1 --port ${String(PORT)} --strictPort`,
    url: `http://127.0.0.1:${String(PORT)}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
