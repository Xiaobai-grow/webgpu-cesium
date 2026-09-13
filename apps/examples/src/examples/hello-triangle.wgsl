// examples/hello-triangle.wgsl
// 用途：随时间旋转的彩色三角形。
// 依赖 defines：无。
// 期望绑定：group 0 = FrameUniforms（来自 builtin/frame.wgsl）。
// 顶点属性：@location(0) position vec2<f32>，@location(1) color vec3<f32>。

#import "builtin/constants.wgsl"
#import "builtin/frame.wgsl"

struct VertexInput {
    @location(0) position: vec2<f32>,
    @location(1) color: vec3<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec3<f32>,
}

@vertex
fn vsMain(input: VertexInput) -> VertexOutput {
    // 每 4 秒转一圈
    let angle = frame.time * HALF_PI;
    let c = cos(angle);
    let s = sin(angle);
    let rotated = vec2<f32>(
        input.position.x * c - input.position.y * s,
        input.position.x * s + input.position.y * c,
    );
    // 按视口宽高比校正，保证三角形不被拉伸
    let aspect = frame.viewport.z / max(frame.viewport.w, 1.0);
    var out: VertexOutput;
    out.position = vec4<f32>(rotated.x / aspect, rotated.y, 0.0, 1.0);
    out.color = input.color;
    return out;
}

@fragment
fn fsMain(input: VertexOutput) -> @location(0) vec4<f32> {
    return vec4<f32>(input.color, 1.0);
}
