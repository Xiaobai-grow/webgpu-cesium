// atmosphere/skyview.wgsl
// 用途：Hillaire Sky-View LUT（192×108）。非线性地平线参数化。
// 依赖 defines：无。
// 期望绑定：group 0 FrameUniforms；group 1 transmittance / multi / sampler / storage。

#import "atmosphere/common.wgsl"

@group(1) @binding(0) var transmittanceLut: texture_2d<f32>;
@group(1) @binding(1) var multiScatterLut: texture_2d<f32>;
@group(1) @binding(2) var lutSampler: sampler;
@group(1) @binding(3) var skyViewOut: texture_storage_2d<rgba16float, write>;

fn marchSky(origin: vec3<f32>, dir: vec3<f32>, sunDir: vec3<f32>) -> vec3<f32> {
    let rg = planetRadiusKm();
    let rt = atmosphereRadiusKm();
    let atm = raySphere(origin, dir, rt);
    if (atm.y < 0.0) {
        return vec3<f32>(0.0);
    }
    var t0 = max(atm.x, 0.0);
    var t1 = atm.y;
    let ground = raySphere(origin, dir, rg);
    if (ground.x > 0.0) {
        t1 = min(t1, ground.x);
    }
    let steps = SKY_STEPS;
    let dt = max(t1 - t0, 0.0) / f32(steps);
    var luminance = vec3<f32>(0.0);
    var throughput = vec3<f32>(1.0);
    let cosTheta = dot(dir, sunDir);
    let pr = rayleighPhase(cosTheta);
    let pm = miePhase(cosTheta);
    for (var i = 0u; i < steps; i++) {
        let t = t0 + (f32(i) + 0.5) * dt;
        let p = origin + dir * t;
        let height = length(p) - rg;
        let density = atmosphereDensity(height);
        let ext = extinction(density);
        let transSun = sampleTransmittanceLut(transmittanceLut, lutSampler, p, sunDir);
        let scatter = RAYLEIGH_SCATTERING * density.x * pr + vec3<f32>(MIE_SCATTERING) * density.y * pm;
        let multiUv = vec2<f32>(
            saturate(dot(normalize(p), sunDir) * 0.5 + 0.5),
            saturate(height / ATMOSPHERE_THICKNESS_KM),
        );
        let multi = textureSampleLevel(multiScatterLut, lutSampler, multiUv, 0.0).rgb;
        luminance += throughput * (scatter * transSun + multi * density.x) * dt;
        throughput *= exp(-ext * dt);
    }
    return luminance;
}

@compute @workgroup_size(8, 8)
fn csSkyView(@builtin(global_invocation_id) id: vec3<u32>) {
    let size = textureDimensions(skyViewOut);
    if (id.x >= size.x || id.y >= size.y) {
        return;
    }
    let uv = (vec2<f32>(id.xy) + vec2<f32>(0.5)) / vec2<f32>(size);
    let rg = planetRadiusKm();
    let camera = (frame.cameraPositionHigh + frame.cameraPositionLow) / 1000.0;
    var r = length(camera);
    if (r < rg + 0.01) {
        r = rg + 0.01;
    }
    let up = camera / r;
    let sun = normalize(frame.sunDirectionECEF);
    var tangent = cross(up, sun);
    if (length(tangent) < 1e-4) {
        tangent = cross(up, vec3<f32>(0.0, 0.0, 1.0));
    }
    tangent = normalize(tangent);
    let bitangent = cross(up, tangent);

    // v：非线性天顶角（地平线加密）；u：相对太阳方位
    let v = uv.y;
    let horizon = 0.5;
    var zenith: f32;
    if (v < horizon) {
        zenith = PI - pow(1.0 - v / horizon, 2.0) * HALF_PI;
    } else {
        zenith = (1.0 - pow((v - horizon) / (1.0 - horizon), 2.0)) * HALF_PI;
    }
    let azimuth = (uv.x * 2.0 - 1.0) * PI;
    let dir = normalize(
        up * cos(zenith) + (tangent * sin(azimuth) + bitangent * cos(azimuth)) * sin(zenith),
    );
    let origin = up * r;
    var color = marchSky(origin, dir, sun);
    color *= frame.sunIrradiance;
    textureStore(skyViewOut, vec2<i32>(id.xy), vec4<f32>(color, 1.0));
}
