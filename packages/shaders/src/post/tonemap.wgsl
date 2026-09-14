// post/tonemap.wgsl
// 用途：简版自动曝光已在 CPU 写入 frame.exposure；ACES / Reinhard + sRGB 输出。
// 依赖 defines：无。

#import "builtin/frame.wgsl"
#import "builtin/color.wgsl"

@group(1) @binding(0) var hdrColor: texture_2d<f32>;
@group(1) @binding(1) var hdrSampler: sampler;

struct ToneVertexOut {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vsTonemap(@builtin(vertex_index) index: u32) -> ToneVertexOut {
    var out: ToneVertexOut;
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0),
    );
    out.position = vec4<f32>(pos[index], 0.0, 1.0);
    out.uv = pos[index] * vec2<f32>(0.5, -0.5) + 0.5;
    return out;
}

fn acesNarkowicz(x: vec3<f32>) -> vec3<f32> {
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;
    return saturate((x * (a * x + b)) / (x * (c * x + d) + e));
}

fn reinhard(x: vec3<f32>) -> vec3<f32> {
    return x / (vec3<f32>(1.0) + x);
}

@fragment
fn fsTonemap(input: ToneVertexOut) -> @location(0) vec4<f32> {
    var hdr = textureSampleLevel(hdrColor, hdrSampler, input.uv, 0.0).rgb;
    hdr *= max(frame.exposure, 1e-4);
    var ldr: vec3<f32>;
    if (frame.toneMappingMode == 1u) {
        ldr = reinhard(hdr);
    } else {
        ldr = acesNarkowicz(hdr);
    }
    return vec4<f32>(linearToSrgb3(ldr), 1.0);
}
