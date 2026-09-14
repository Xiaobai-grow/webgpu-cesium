// atmosphere/ibl.wgsl
// 用途：从 Sky-View LUT 生成低分辩率辐照度立方图（64²）。
// 依赖 defines：无。

#import "atmosphere/common.wgsl"

@group(1) @binding(0) var skyViewLut: texture_2d<f32>;
@group(1) @binding(1) var lutSampler: sampler;
@group(1) @binding(2) var irradianceOut: texture_storage_2d_array<rgba16float, write>;

fn cubeDirection(face: u32, uv: vec2<f32>) -> vec3<f32> {
    let v = uv * 2.0 - 1.0;
    switch face {
        case 0u: { return normalize(vec3<f32>(1.0, -v.y, -v.x)); }
        case 1u: { return normalize(vec3<f32>(-1.0, -v.y, v.x)); }
        case 2u: { return normalize(vec3<f32>(v.x, 1.0, v.y)); }
        case 3u: { return normalize(vec3<f32>(v.x, -1.0, -v.y)); }
        case 4u: { return normalize(vec3<f32>(v.x, -v.y, 1.0)); }
        default: { return normalize(vec3<f32>(-v.x, -v.y, -1.0)); }
    }
}

fn skyViewUvFromDir(dir: vec3<f32>) -> vec2<f32> {
    let camera = frame.cameraPositionHigh + frame.cameraPositionLow;
    let up = normalize(camera);
    let zenith = acos(clamp(dot(dir, up), -1.0, 1.0));
    var azimuth = atan2(dir.y, dir.x);
    var v: f32;
    if (zenith > HALF_PI) {
        v = 0.5 * (1.0 - sqrt((zenith - HALF_PI) / HALF_PI));
    } else {
        v = 0.5 + 0.5 * (1.0 - sqrt(max(1.0 - zenith / HALF_PI, 0.0)));
    }
    return vec2<f32>(azimuth / TWO_PI + 0.5, saturate(v));
}

@compute @workgroup_size(8, 8, 1)
fn csIrradiance(@builtin(global_invocation_id) id: vec3<u32>) {
    let size = textureDimensions(irradianceOut);
    if (id.x >= size.x || id.y >= size.y || id.z >= 6u) {
        return;
    }
    let uv = (vec2<f32>(id.xy) + vec2<f32>(0.5)) / vec2<f32>(size.xy);
    let n = cubeDirection(id.z, uv);
    var acc = vec3<f32>(0.0);
    var wsum = 0.0;
    for (var i = 0u; i < 16u; i++) {
        let z = 1.0 - 2.0 * (f32(i) + 0.5) / 16.0;
        let r = sqrt(max(1.0 - z * z, 0.0));
        let phi = (sqrt(5.0) - 1.0) * PI * f32(i);
        let l = vec3<f32>(cos(phi) * r, sin(phi) * r, z);
        let w = max(dot(n, l), 0.0);
        if (w > 0.0) {
            acc += textureSampleLevel(skyViewLut, lutSampler, skyViewUvFromDir(l), 0.0).rgb * w;
            wsum += w;
        }
    }
    let irradiance = acc / max(wsum, 1e-4) * PI;
    textureStore(irradianceOut, vec2<i32>(id.xy), i32(id.z), vec4<f32>(irradiance, 1.0));
}
