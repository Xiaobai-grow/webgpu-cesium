import { BUILTIN_MODULES, FRAME_UNIFORMS_BYTE_LENGTH } from "@webgpu-cesium/shaders"
import { describe, expect, it } from "vitest"
import { FRAME_UNIFORMS_LAYOUT, FrameUniformsData } from "./FrameUniforms"

describe("FrameUniformsData", () => {
  it("大小与 shaders 包常量一致且 16 字节对齐", () => {
    expect(FRAME_UNIFORMS_LAYOUT.byteLength).toBe(FRAME_UNIFORMS_BYTE_LENGTH)
    expect(FRAME_UNIFORMS_LAYOUT.byteLength % 16).toBe(0)
    expect(new FrameUniformsData().buffer.byteLength).toBe(FRAME_UNIFORMS_BYTE_LENGTH)
  })

  it("frame.wgsl 中的成员顺序与布局表一致", () => {
    const source = BUILTIN_MODULES["builtin/frame.wgsl"]!
    const structBody = /struct FrameUniforms \{([\s\S]*?)\}/.exec(source)![1]!
    const members = [...structBody.matchAll(/^\s*(\w+):/gm)].map((m) => m[1])
    expect(members).toEqual([
      "viewMatrix",
      "projectionMatrix",
      "viewProjectionMatrix",
      "inverseProjectionMatrix",
      "cameraPositionHigh",
      "time",
      "cameraPositionLow",
      "deltaTime",
      "viewport",
      "frameNumber",
      "_padding0",
      "_padding1",
      "_padding2",
    ])
  })

  it("默认矩阵为单位矩阵", () => {
    const data = new FrameUniformsData()
    for (const offset of [0, 64, 128, 192]) {
      const diagonal = [0, 5, 10, 15].map((i) => data.readF32(offset + i * 4))
      expect(diagonal).toEqual([1, 1, 1, 1])
      expect(data.readF32(offset + 4)).toBe(0)
    }
  })

  it("update 写入 time / deltaTime / viewport / frameNumber 到正确偏移", () => {
    const data = new FrameUniformsData()
    data.update({ time: 1.5, deltaTime: 0.016, frameNumber: 42, viewport: [0, 0, 800, 600] })
    expect(data.readF32(FRAME_UNIFORMS_LAYOUT.time)).toBeCloseTo(1.5)
    expect(data.readF32(FRAME_UNIFORMS_LAYOUT.deltaTime)).toBeCloseTo(0.016)
    expect(data.readF32(FRAME_UNIFORMS_LAYOUT.viewport + 8)).toBe(800)
    expect(data.readF32(FRAME_UNIFORMS_LAYOUT.viewport + 12)).toBe(600)
    expect(data.readU32(FRAME_UNIFORMS_LAYOUT.frameNumber)).toBe(42)
    // 相机位置仍为 0
    expect(data.readF32(FRAME_UNIFORMS_LAYOUT.cameraPositionHigh)).toBe(0)
  })
})
