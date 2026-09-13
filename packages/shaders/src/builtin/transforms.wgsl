// builtin/transforms.wgsl
// 用途：相机相对（RTE）高低位合成与视空间变换。
// 依赖 defines：无。
// 期望绑定：调用方已 #import builtin/frame.wgsl。

/**
 * 高低位相减再相加，避免 ECEF 大坐标在 f32 中丢失。
 */
fn rteToEye(positionHigh: vec3<f32>, positionLow: vec3<f32>) -> vec3<f32> {
    let highDiff = positionHigh - frame.cameraPositionHigh;
    let lowDiff = positionLow - frame.cameraPositionLow;
    return highDiff + lowDiff;
}

/**
 * 相机相对世界坐标 → clip（view 平移为 0）。
 */
fn rteToClip(positionHigh: vec3<f32>, positionLow: vec3<f32>, localPosition: vec3<f32>) -> vec4<f32> {
    let eye = rteToEye(positionHigh, positionLow) + localPosition;
    return frame.projectionMatrix * frame.viewMatrix * vec4<f32>(eye, 1.0);
}
