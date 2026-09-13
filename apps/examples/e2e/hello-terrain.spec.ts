/**
 * Hello Terrain：带高度的地球就绪标记。无 WebGPU 则 skip。
 */
import { expect, test, type Page } from "@playwright/test"

/** 在页面里探测 WebGPU 可用性 */
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

test.describe("hello-terrain", () => {
  test("示例列表可见并高亮当前示例", async ({ page }) => {
    await page.goto("/#/examples/hello-terrain")
    const link = page.locator('[data-example-id="hello-terrain"]')
    await expect(link).toBeVisible()
    await expect(link).toHaveClass(/example-list__item--active/)
    await expect(page.locator('[data-testid="example-canvas"]')).toBeVisible()
    const china = page.locator('[data-example-id="hello-terrain-china"]')
    await expect(china).toBeVisible()
    await expect(china).toHaveAttribute("href", /terrain=mars3d/)
  })

  test("Grid 高度图地球就绪且非错误面板", async ({ page }) => {
    await page.goto("/#/examples/hello-terrain?imagery=grid")
    const unavailable = await probeWebGpu(page)
    test.skip(unavailable !== null, `当前 Chromium 无 WebGPU：${unavailable ?? ""}`)

    const view = page.locator(".example-view")
    await expect(view).toHaveAttribute("data-status", "running")
    await expect(page.locator('[data-testid="error-panel"]')).toHaveCount(0)
    const canvas = page.locator('[data-testid="example-canvas"]')
    await expect(canvas).toHaveAttribute("data-globe-ready", "1", { timeout: 20_000 })
    await expect(canvas).toHaveAttribute("data-globe-textured", "1", { timeout: 20_000 })
  })
})
