// atmosphere/sky.wgsl
// 用途：天空 pass（星空 → 月亮 → 散射 → 日盘），仅填充 Reverse-Z 深度仍为 0 的像素。
// 依赖 defines：无。
// 期望绑定：
//   group 0 FrameUniforms
//   group 1 skyView / transmittance / sampler / depth / 亮星星表

#import "atmosphere/common.wgsl"
#import "builtin/color.wgsl"

@group(1) @binding(0) var skyViewLut: texture_2d<f32>;
@group(1) @binding(1) var transmittanceLut: texture_2d<f32>;
@group(1) @binding(2) var lutSampler: sampler;
@group(1) @binding(3) var sceneDepth: texture_depth_2d;
@group(1) @binding(4) var<storage, read> stars: array<vec4<f32>>;

struct SkyVertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vsSky(@builtin(vertex_index) index: u32) -> SkyVertexOutput {
    var out: SkyVertexOutput;
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0),
    );
    out.position = vec4<f32>(pos[index], 0.0, 1.0);
    out.uv = pos[index] * vec2<f32>(0.5, -0.5) + 0.5;
    return out;
}

fn viewDirectionFromUv(uv: vec2<f32>) -> vec3<f32> {
    let clip = vec4<f32>(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, 0.0, 1.0);
    let viewH = frame.inverseProjectionMatrix * clip;
    let view = normalize(viewH.xyz / viewH.w);
    return normalize((frame.inverseViewMatrix * vec4<f32>(view, 0.0)).xyz);
}

fn skyViewUv(dir: vec3<f32>) -> vec2<f32> {
    let camera = frame.cameraPositionHigh + frame.cameraPositionLow;
    let up = normalize(camera);
    let sun = normalize(frame.sunDirectionECEF);
    var tangent = cross(up, sun);
    if (length(tangent) < 1e-4) {
        tangent = cross(up, vec3<f32>(0.0, 0.0, 1.0));
    }
    tangent = normalize(tangent);
    let bitangent = cross(up, tangent);
    let zenith = acos(clamp(dot(dir, up), -1.0, 1.0));
    let projected = dir - up * dot(dir, up);
    var azimuth = 0.0;
    if (length(projected) > 1e-5) {
        let p = normalize(projected);
        azimuth = atan2(dot(p, tangent), dot(p, bitangent));
    }
    var v: f32;
    if (zenith > HALF_PI) {
        let t = (zenith - HALF_PI) / HALF_PI;
        v = 0.5 * (1.0 - sqrt(t));
    } else {
        let t = zenith / HALF_PI;
        v = 0.5 + 0.5 * (1.0 - sqrt(max(1.0 - t, 0.0)));
    }
    let u = azimuth / TWO_PI + 0.5;
    return vec2<f32>(fract(u), saturate(v));
}

fn hash3(p: vec3<f32>) -> f32 {
    return fract(sin(dot(p, vec3<f32>(127.1, 311.7, 74.7))) * 43758.5453);
}

fn proceduralStars(dir: vec3<f32>) -> f32 {
    let cell = floor(dir * 220.0);
    let h = hash3(cell);
    if (h < 0.996) {
        return 0.0;
    }
    let local = normalize(cell + 0.5);
    let d = saturate(dot(dir, local));
    return pow(d, 240.0) * (h - 0.996) * 80.0;
}

fn catalogStars(dir: vec3<f32>) -> vec3<f32> {
    let count = min(arrayLength(&stars), 64u);
    var color = vec3<f32>(0.0);
    for (var i = 0u; i < count; i++) {
        let star = stars[i];
        let d = dot(dir, normalize(star.xyz));
        let mag = star.w;
        let sharp = 400.0 + mag * 40.0;
        color += vec3<f32>(pow(max(d, 0.0), sharp) * exp(-mag * 0.55));
    }
    return color;
}

@fragment
fn fsSky(input: SkyVertexOutput) -> @location(0) vec4<f32> {
    let dims = vec2<u32>(textureDimensions(sceneDepth));
    let pix = vec2<i32>(clamp(input.uv * vec2<f32>(dims), vec2<f32>(0.0), vec2<f32>(dims) - vec2<f32>(1.0)));
    let depth = textureLoad(sceneDepth, pix, 0);
    if (depth > 0.0) {
        discard;
    }
    let dir = viewDirectionFromUv(input.uv);
    var color = textureSampleLevel(skyViewLut, lutSampler, skyViewUv(dir), 0.0).rgb;

    let camera = (frame.cameraPositionHigh + frame.cameraPositionLow) / 1000.0;
    let sunT = sampleTransmittanceLut(transmittanceLut, lutSampler, camera, normalize(frame.sunDirectionECEF));
    let skyLum = luminance(color);
    let starFade = saturate(1.0 - skyLum * 8.0);
    color += (vec3<f32>(proceduralStars(dir)) + catalogStars(dir)) * starFade * 2.2;

    let moonDir = normalize(frame.moonDirectionECEF);
    let moonCos = 0.99996;
    let moonDot = dot(dir, moonDir);
    if (moonDot > moonCos) {
        let n = normalize(dir);
        let shade = max(dot(n, normalize(frame.sunDirectionECEF - moonDir * 0.15)), 0.04);
        let disk = saturate((moonDot - moonCos) / max(1.0 - moonCos, 1e-6));
        color += vec3<f32>(0.86, 0.83, 0.76) * shade * disk * frame.moonIntensity * 6.0;
    }

    let sunDir = normalize(frame.sunDirectionECEF);
    let sunCos = 0.99996;
    let sunDot = dot(dir, sunDir);
    if (sunDot > sunCos) {
        let limb = pow(saturate((sunDot - sunCos) / max(1.0 - sunCos, 1e-6)), 0.45);
        color += frame.sunIrradiance * sunT * limb * 10.0;
    }

    return vec4<f32>(color, 1.0);
}
