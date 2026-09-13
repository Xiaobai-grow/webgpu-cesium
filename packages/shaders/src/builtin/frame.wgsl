// builtin/frame.wgsl
// 用途：group 0 帧级 uniform 结构体 FrameUniforms 与绑定声明。
// 依赖 defines：无。
// 期望绑定：@group(0) @binding(0) var<uniform> frame。
//
// 布局（std140 兼容，总大小 320 字节，与 renderer/FrameUniformsBuffer.ts 中的 FRAME_UNIFORMS_LAYOUT 对齐；
// M2 起由反射生成偏移表，M0 手写并用单测锁定）：
//   offset   size  成员
//   0        64    viewMatrix
//   64       64    projectionMatrix
//   128      64    viewProjectionMatrix
//   192      64    inverseProjectionMatrix
//   256      12    cameraPositionHigh          (vec3 对齐 16)
//   268      4     time                        (填充 vec3 之后的空位)
//   272      12    cameraPositionLow
//   284      4     deltaTime
//   288      16    viewport                    (x, y, width, height，像素)
//   304      4     frameNumber
//   308      12    _padding                    (结构体大小按 16 对齐)

struct FrameUniforms {
    viewMatrix: mat4x4<f32>,
    projectionMatrix: mat4x4<f32>,
    viewProjectionMatrix: mat4x4<f32>,
    inverseProjectionMatrix: mat4x4<f32>,
    cameraPositionHigh: vec3<f32>,
    time: f32,
    cameraPositionLow: vec3<f32>,
    deltaTime: f32,
    viewport: vec4<f32>,
    frameNumber: u32,
    _padding0: u32,
    _padding1: u32,
    _padding2: u32,
}

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
