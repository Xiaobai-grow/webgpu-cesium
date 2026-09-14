/**
 * hello-gltf / hello-3dtiles：本地 fixture 就绪。无 WebGPU 则 skip。
 */
import { expect, test, type Page } from "@playwright/test"

async function probeWebGpu(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const gpu = (navigator as Navigator & { gpu?: GPU }).gpu
    if (!gpu) {
      return "navigator.gpu 不存在"
    }
    const adapter = await gpu.requestAdapter()
    if (!adapter) {
      return "requestAdapter() 返回 null"
    }
    return null
  })
}

test.describe("hello-gltf", () => {
  test("PBR / unlit 模型就绪", async ({ page }) => {
    await page.goto("/#/examples/hello-gltf")
    const unavailable = await probeWebGpu(page)
    test.skip(unavailable !== null, `当前 Chromium 无 WebGPU：${unavailable ?? ""}`)
    const canvas = page.locator('[data-testid="example-canvas"]')
    await expect(page.locator('[data-testid="error-panel"]')).toHaveCount(0)
    await expect(canvas).toHaveAttribute("data-gltf-ready", "1", { timeout: 20_000 })
  })
})

test.describe("hello-3dtiles", () => {
  test("本地 tileset 就绪", async ({ page }) => {
    await page.goto("/#/examples/hello-3dtiles")
    const unavailable = await probeWebGpu(page)
    test.skip(unavailable !== null, `当前 Chromium 无 WebGPU：${unavailable ?? ""}`)
    const canvas = page.locator('[data-testid="example-canvas"]')
    await expect(page.locator('[data-testid="error-panel"]')).toHaveCount(0)
    await expect(canvas).toHaveAttribute("data-tileset-ready", "1", { timeout: 20_000 })
  })
})
