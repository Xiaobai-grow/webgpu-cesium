/**
 * 浏览器：TaskProcessor + new URL() Worker 往返 typed array。
 */
import { describe, expect, it } from "vitest"
import { TaskProcessor } from "./TaskProcessor"

describe("TaskProcessor 浏览器往返", () => {
  it("new URL Worker 把 Float32Array 乘 2 并 transfer 回来", async () => {
    const url = new URL("./workers/echoWorker.ts", import.meta.url)
    const processor = new TaskProcessor(url)
    const values = new Float32Array([1, 2, 3, 4])
    const result = (await processor.scheduleTask({ values }, [values.buffer])) as {
      values: Float32Array
    }
    expect(Array.from(result.values)).toEqual([2, 4, 6, 8])
    processor.destroy()
  })
})
