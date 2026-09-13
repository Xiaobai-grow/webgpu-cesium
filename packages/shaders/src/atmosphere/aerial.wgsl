// atmosphere/aerial.wgsl
// 用途：空气透视体纹理 32×32×32（视锥切片）。
// 依赖 defines：无。
// 期望绑定：group 0 FrameUniforms；group 1 transmittance / multi / sampler / storage 3d。

#import "atmosphere/common.wgsl"
#import "builtin/depth.wgsl"

@group(1) @binding(0) var transmittanceLut: texture_2d<f32>;
@group(1) @binding(1) var multiScatterLut: texture_2d<f32>;
@group(1) @binding(2) var lutSampler: sampler;
@group(1) @binding(3) var aerialOut: texture_storage_3d<rgba16float, write>;

@compute @workgroup_size(4, 4, 4)
fn csAerial(@builtin(global_invocation_id) id: vec3<u32>) {
    let size = textureDimensions(aerialOut);
    if (id.x >= size.x || id.y >= size.y || id.z >= size.z) {
        return;
    }
    let uvw = (vec3<f32>(id) + vec3<f32>(0.5)) / vec3<f32>(size);
    let clip = vec4<f32>(uvw.x * 2.0 - 1.0, 1.0 - uvw.y * 2.0, 1.0, 1.0);
    let viewH = frame.inverseProjectionMatrix * clip;
    let viewDir = normalize(viewH.xyz / viewH.w);
    let worldDir = normalize((frame.inverseViewMatrix * vec4<f32>(viewDir, 0.0)).xyz);

    let cameraM = frame.cameraPositionHigh + frame.cameraPositionLow;
    let origin = cameraM / 1000.0;
    let maxKm = 80.0;
    let sliceKm = pow(uvw.z, 2.0) * maxKm;
    let rg = planetRadiusKm();
    let rt = atmosphereRadiusKm();
    let hit = raySphere(origin, worldDir, rt);
    var tMax = sliceKm;
    if (hit.y > 0.0) {
        tMax = min(tMax, max(hit.y, 0.0));
    }
    let ground = raySphere(origin, worldDir, rg);
    if (ground.x > 0.0) {
        tMax = min(tMax, ground.x);
    }

    let steps = 8u;
    let dt = max(tMax, 0.0) / f32(steps);
    var inscattered = vec3<f32>(0.0);
    var throughput = vec3<f32>(1.0);
    let sun = normalize(frame.sunDirectionECEF);
    let cosTheta = dot(worldDir, sun);
    let pr = rayleighPhase(cosTheta);
    let pm = miePhase(cosTheta);
    for (var i = 0u; i < steps; i++) {
        let t = (f32(i) + 0.5) * dt;
        let p = origin + worldDir * t;
        let height = length(p) - rg;
        let density = atmosphereDensity(height);
        let ext = extinction(density);
        let transSun = sampleTransmittanceLut(transmittanceLut, lutSampler, p, sun);
        let scatter = RAYLEIGH_SCATTERING * density.x * pr + vec3<f32>(MIE_SCATTERING) * density.y * pm;
        inscattered += throughput * scatter * transSun * dt * frame.sunIrradiance;
        throughput *= exp(-ext * dt);
    }
    textureStore(aerialOut, vec3<i32>(id), vec4<f32>(inscattered, luminance(throughput)));
}

fn luminance(color: vec3<f32>) -> f32 {
    return dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
}
