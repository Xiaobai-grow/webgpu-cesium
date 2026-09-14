// builtin/depth.wgsl
// 用途：Reverse-Z 深度重建相机相对位置。
// 依赖 defines：无。
// 期望绑定：调用方已 #import builtin/frame.wgsl。

/**
 * 从 framebuffer UV 与 Reverse-Z 深度重建视空间位置（RTE，视图平移为 0）。
 */
fn reconstructEyePosition(uv: vec2<f32>, depth: f32) -> vec3<f32> {
    let clip = vec4<f32>(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, depth, 1.0);
    let viewH = frame.inverseProjectionMatrix * clip;
    return viewH.xyz / viewH.w;
}

fn reconstructWorldApprox(uv: vec2<f32>, depth: f32) -> vec3<f32> {
    let eye = reconstructEyePosition(uv, depth);
    let relative = (frame.inverseViewMatrix * vec4<f32>(eye, 1.0)).xyz;
    return frame.cameraPositionHigh + frame.cameraPositionLow + relative;
}
