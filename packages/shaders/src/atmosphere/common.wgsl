// atmosphere/common.wgsl
// 用途：Hillaire 2020 共享参数、求交、密度与相位。
// 单位：千米。frame 中的米制半径在此换算。
// 依赖 defines：无。
// 期望绑定：调用方已 #import builtin/frame.wgsl。

#import "builtin/constants.wgsl"
#import "builtin/frame.wgsl"

const RAYLEIGH_SCATTERING: vec3<f32> = vec3<f32>(5.802e-3, 13.558e-3, 33.1e-3);
const MIE_SCATTERING: f32 = 3.996e-3;
const MIE_ABSORPTION: f32 = 4.4e-3;
const OZONE_ABSORPTION: vec3<f32> = vec3<f32>(0.650e-3, 1.881e-3, 0.085e-3);
const RAYLEIGH_SCALE: f32 = 8.0;
const MIE_SCALE: f32 = 1.2;
const OZONE_CENTER: f32 = 25.0;
const OZONE_WIDTH: f32 = 15.0;
const MIE_G: f32 = 0.8;
const ATMOSPHERE_THICKNESS_KM: f32 = 100.0;
const TRANSMITTANCE_STEPS: u32 = 40u;
const SKY_STEPS: u32 = 16u;

fn planetRadiusKm() -> f32 {
    return max(frame.planetRadius, 6356752.0) / 1000.0;
}

fn atmosphereRadiusKm() -> f32 {
    return planetRadiusKm() + ATMOSPHERE_THICKNESS_KM;
}

fn raySphere(origin: vec3<f32>, dir: vec3<f32>, radius: f32) -> vec2<f32> {
    let b = dot(origin, dir);
    let c = dot(origin, origin) - radius * radius;
    let h = b * b - c;
    if (h < 0.0) {
        return vec2<f32>(-1.0);
    }
    let s = sqrt(h);
    return vec2<f32>(-b - s, -b + s);
}

fn atmosphereDensity(heightKm: f32) -> vec3<f32> {
    let h = max(heightKm, 0.0);
    let rayleigh = exp(-h / RAYLEIGH_SCALE);
    let mie = exp(-h / MIE_SCALE);
    let ozone = max(0.0, 1.0 - abs(h - OZONE_CENTER) / OZONE_WIDTH);
    return vec3<f32>(rayleigh, mie, ozone);
}

fn extinction(density: vec3<f32>) -> vec3<f32> {
    return RAYLEIGH_SCATTERING * density.x
        + vec3<f32>(MIE_SCATTERING + MIE_ABSORPTION) * density.y
        + OZONE_ABSORPTION * density.z;
}

fn rayleighPhase(cosTheta: f32) -> f32 {
    return 3.0 / (16.0 * PI) * (1.0 + cosTheta * cosTheta);
}

fn miePhase(cosTheta: f32) -> f32 {
    let g = MIE_G;
    let g2 = g * g;
    let denom = pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
    return 3.0 / (8.0 * PI) * (1.0 - g2) * (1.0 + cosTheta * cosTheta) / ((2.0 + g2) * denom);
}

fn transmittanceUv(r: f32, mu: f32) -> vec2<f32> {
    let rg = planetRadiusKm();
    let rt = atmosphereRadiusKm();
    let h = sqrt(max(rt * rt - rg * rg, 0.0));
    let rho = sqrt(max(r * r - rg * rg, 0.0));
    let d = max(-r * mu + sqrt(max(r * r * (mu * mu - 1.0) + rt * rt, 0.0)), 0.0);
    let dMin = rt - r;
    let dMax = rho + h;
    let xMu = (d - dMin) / max(dMax - dMin, 1e-4);
    let xR = rho / max(h, 1e-4);
    return vec2<f32>(saturate(xMu), saturate(xR));
}

fn uvToRMu(uv: vec2<f32>) -> vec2<f32> {
    let rg = planetRadiusKm();
    let rt = atmosphereRadiusKm();
    let h = sqrt(max(rt * rt - rg * rg, 0.0));
    let rho = h * uv.y;
    let r = sqrt(rho * rho + rg * rg);
    let dMin = rt - r;
    let dMax = rho + h;
    let d = dMin + uv.x * (dMax - dMin);
    var mu = 1.0;
    if (r * d > 1e-6) {
        mu = (h * h - rho * rho - d * d) / (2.0 * r * d);
        mu = clamp(mu, -1.0, 1.0);
    }
    return vec2<f32>(r, mu);
}

fn opticalDepth(origin: vec3<f32>, dir: vec3<f32>, tMax: f32, steps: u32) -> vec3<f32> {
    let rg = planetRadiusKm();
    var od = vec3<f32>(0.0);
    let dt = tMax / f32(steps);
    for (var i = 0u; i < steps; i++) {
        let t = (f32(i) + 0.5) * dt;
        let p = origin + dir * t;
        let height = length(p) - rg;
        od += extinction(atmosphereDensity(height)) * dt;
    }
    return od;
}

fn sampleTransmittanceLut(lut: texture_2d<f32>, lutSampler: sampler, origin: vec3<f32>, dir: vec3<f32>) -> vec3<f32> {
    let r = length(origin);
    let mu = dot(origin, dir) / max(r, 1e-4);
    let uv = transmittanceUv(r, mu);
    return textureSampleLevel(lut, lutSampler, uv, 0.0).rgb;
}
