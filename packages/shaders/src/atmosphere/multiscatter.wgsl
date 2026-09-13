// atmosphere/multiscatter.wgsl
// 用途：Hillaire 多次散射 LUT（32×32）。各向同性近似，16 方向积分。
// 依赖 defines：无。
// 期望绑定：group 0 FrameUniforms；group 1 binding 0 transmittance；1 sampler；2 storage 写出。

#import "atmosphere/common.wgsl"

@group(1) @binding(0) var transmittanceLut: texture_2d<f32>;
@group(1) @binding(1) var lutSampler: sampler;
@group(1) @binding(2) var multiScatterOut: texture_storage_2d<rgba16float, write>;

fn fibonacciDir(index: u32, count: u32) -> vec3<f32> {
    let z = 1.0 - 2.0 * (f32(index) + 0.5) / f32(count);
    let r = sqrt(max(1.0 - z * z, 0.0));
    let phi = (sqrt(5.0) - 1.0) * PI * f32(index);
    return vec3<f32>(cos(phi) * r, sin(phi) * r, z);
}

@compute @workgroup_size(8, 8)
fn csMultiScatter(@builtin(global_invocation_id) id: vec3<u32>) {
    let size = textureDimensions(multiScatterOut);
    if (id.x >= size.x || id.y >= size.y) {
        return;
    }
    let uv = (vec2<f32>(id.xy) + vec2<f32>(0.5)) / vec2<f32>(size);
    let rg = planetRadiusKm();
    let rt = atmosphereRadiusKm();
    let r = mix(rg + 0.01, rt - 0.01, uv.y);
    let muS = uv.x * 2.0 - 1.0;
    let origin = vec3<f32>(0.0, 0.0, r);
    let sunDir = normalize(vec3<f32>(sqrt(max(1.0 - muS * muS, 0.0)), 0.0, muS));
    var inscattered = vec3<f32>(0.0);
    let count = 16u;
    for (var i = 0u; i < count; i++) {
        let dir = fibonacciDir(i, count);
        let hit = raySphere(origin, dir, rt);
        if (hit.y < 0.0) {
            continue;
        }
        let tMax = max(hit.y, 0.0);
        let mid = origin + dir * (tMax * 0.5);
        let height = length(mid) - rg;
        let density = atmosphereDensity(height);
        let trans = sampleTransmittanceLut(transmittanceLut, lutSampler, mid, sunDir);
        let sunT = sampleTransmittanceLut(transmittanceLut, lutSampler, origin, sunDir);
        inscattered += (RAYLEIGH_SCATTERING * density.x + vec3<f32>(MIE_SCATTERING) * density.y)
            * trans * sunT;
    }
    inscattered = inscattered * (4.0 * PI / f32(count));
    textureStore(multiScatterOut, vec2<i32>(id.xy), vec4<f32>(inscattered, 1.0));
}
