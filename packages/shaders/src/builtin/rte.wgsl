// builtin/rte.wgsl
// 用途：高低位 RTE 模块（M4 定型，供 M9 图元复用）。
// 依赖 defines：无。
// 期望绑定：调用方已 #import builtin/frame.wgsl。

#import "builtin/frame.wgsl"
#import "builtin/transforms.wgsl"

/**
 * 相机相对世界坐标（中心高低位 + 局部偏移）。
 */
fn rteWorldApprox(positionHigh: vec3<f32>, positionLow: vec3<f32>, localPosition: vec3<f32>) -> vec3<f32> {
    return positionHigh + positionLow + localPosition;
}

/**
 * 视空间位置（RTE）。
 */
fn rteEyePosition(positionHigh: vec3<f32>, positionLow: vec3<f32>, localPosition: vec3<f32>) -> vec3<f32> {
    return rteToEye(positionHigh, positionLow) + localPosition;
}
