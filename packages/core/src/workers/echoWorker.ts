/**
 * TaskProcessor 浏览器往返测试：把 typed array 每个元素乘 2。
 */
import { createTaskProcessorWorker } from "../createTaskProcessorWorker"

createTaskProcessorWorker((parameters, transferableObjects) => {
  const input = parameters as { values: Float32Array }
  const out = new Float32Array(input.values.length)
  for (let i = 0; i < out.length; i++) {
    out[i] = (input.values[i] ?? 0) * 2
  }
  transferableObjects.push(out.buffer)
  return { values: out }
})
