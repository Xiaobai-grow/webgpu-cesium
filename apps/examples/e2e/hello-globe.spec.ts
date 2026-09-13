/**
 * Hello Globe 三视角截图基线。无 WebGPU 则 skip。
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

test.describe("hello-globe", () => {
  test("示例列表可见并高亮当前示例", async ({ page }) => {
    await page.goto("/#/examples/hello-globe")
    const link = page.locator('[data-example-id="hello-globe"]')
    await expect(link).toBeVisible()
    await expect(link).toHaveClass(/example-list__item--active/)
    await expect(page.locator('[data-testid="example-canvas"]')).toBeVisible()
  })

  test("太空 / 国家 / 城市三视角与基线一致", async ({ page }) => {
    await page.goto("/#/examples/hello-globe?imagery=grid")
    const unavailable = await probeWebGpu(page)
    test.skip(unavailable !== null, `当前 Chromium 无 WebGPU：${unavailable ?? ""}`)

    const view = page.locator(".example-view")
    await expect(view).toHaveAttribute("data-status", "running")
    await expect(page.locator('[data-testid="error-panel"]')).toHaveCount(0)
    const canvas = page.locator('[data-testid="example-canvas"]')
    await expect(canvas).toHaveAttribute("data-globe-ready", "1", { timeout: 20_000 })
    await expect(canvas).toHaveAttribute("data-globe-textured", "1", { timeout: 20_000 })
    await expect(page.locator('[data-testid="globe-credits"]')).toContainText("Grid")

    // 不用 2d drawImage 采样 WebGPU canvas（持续 rAF 下会读到空缓冲）
    await expect(canvas).toHaveScreenshot("hello-globe-space.png")

    await page.evaluate(() => {
      window.helloGlobeSetView?.("country")
    })
    await page.waitForTimeout(800)
    await expect(canvas).toHaveScreenshot("hello-globe-country.png")

    await page.evaluate(() => {
      window.helloGlobeSetView?.("city")
    })
    await page.waitForTimeout(800)
    await expect(canvas).toHaveScreenshot("hello-globe-city.png")
  })
})
