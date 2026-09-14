// builtin/frame.wgsl
// 用途：group 0 帧级 uniform 结构体 FrameUniforms 与绑定声明。
// 依赖 defines：无。
// 期望绑定：@group(0) @binding(0) var<uniform> frame。
//
// 布局（std140 兼容，总大小 464 字节，与 renderer/FrameUniformsBuffer.ts 中的 FRAME_UNIFORMS_LAYOUT 对齐；
// 前 304 字节与 M2 相同，其后为 M4 EnvironmentState；不引入 wgsl_reflect，偏移手写并由单测锁定）：
//   offset   size  成员
//   0        64    viewMatrix
//   64       64    projectionMatrix
//   128      64    viewProjectionMatrix
//   192      64    inverseProjectionMatrix
//   256      12    cameraPositionHigh
//   268      4     time
//   272      12    cameraPositionLow
//   284      4     deltaTime
//   288      16    viewport
//   304      4     frameNumber
//   308      4     toneMappingMode         (0=ACES, 1=Reinhard)
//   312      4     exposure
//   316      4     moonPhase               (0..1 照明比例)
//   320      12    sunDirectionECEF
//   332      4     cameraHeight            (相对椭球表面，米)
//   336      12    sunDirectionView
//   348      4     atmosphereRadius        (米，行星半径 + 大气顶)
//   352      12    sunIrradiance
//   364      4     aerialPerspectiveEnabled
//   368      12    moonDirectionECEF
//   380      4     moonIntensity
//   384      64    inverseViewMatrix
//   448      4     planetRadius
//   452      12    _padding

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
    toneMappingMode: u32,
    exposure: f32,
    moonPhase: f32,
    sunDirectionECEF: vec3<f32>,
    cameraHeight: f32,
    sunDirectionView: vec3<f32>,
    atmosphereRadius: f32,
    sunIrradiance: vec3<f32>,
    aerialPerspectiveEnabled: f32,
    moonDirectionECEF: vec3<f32>,
    moonIntensity: f32,
    inverseViewMatrix: mat4x4<f32>,
    planetRadius: f32,
    _padding0: f32,
    _padding1: f32,
    _padding2: f32,
}

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
