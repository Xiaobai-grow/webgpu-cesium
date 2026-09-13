/**
 * Hello Triangle 截图基线。
 * 若当前 Chromium 拿不到 WebGPU 适配器则 skip 并说明（不算失败）。
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

test.describe("hello-triangle", () => {
  test("示例列表可见并高亮当前示例", async ({ page }) => {
    await page.goto("/#/examples/hello-triangle")
    const link = page.locator('[data-example-id="hello-triangle"]')
    await expect(link).toBeVisible()
    await expect(link).toHaveClass(/example-list__item--active/)
    await expect(page.locator('[data-testid="example-canvas"]')).toBeVisible()
  })

  test("渲染旋转三角形并与基线截图一致", async ({ page }) => {
    // 冻结时间：示例用 performance.now() 取起点、用 rAF 的 now 算 time，
    // 这里让起点恒为 0、rAF 的 now 恒为 1000ms → time = 1s → 角度固定为 90°，截图可复现
    await page.addInitScript(() => {
      performance.now = () => 0
      const originalRaf = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
        originalRaf(() => callback(1000))
    })
    await page.goto("/#/examples/hello-triangle")
    const unavailable = await probeWebGpu(page)
    test.skip(unavailable !== null, `当前 Chromium 无 WebGPU：${unavailable ?? ""}`)

    const view = page.locator(".example-view")
    await expect(view).toHaveAttribute("data-status", "running")
    await expect(page.locator('[data-testid="error-panel"]')).toHaveCount(0)
    // 等两帧让首帧渲染完成
    await page.waitForTimeout(100)

    // 基线截图（e2e/__screenshots__/…/hello-triangle-win32.png）本身就是像素级验证：
    // 三角形消失 / 颜色错误都会超出 maxDiffPixelRatio。
    // 注：不用 2d drawImage 采样 WebGPU canvas —— rAF 循环下 getCurrentTexture 会替换绘制缓冲，读到的是空图。
    const canvas = page.locator('[data-testid="example-canvas"]')
    await expect(canvas).toHaveScreenshot("hello-triangle.png")
  })
})
