// builtin/pbr.wgsl
// 用途：Cook-Torrance GGX + Smith + Schlick + Fdez-Agüera 能量补偿。
// 依赖 defines：无。
// 期望绑定：无。

#import "builtin/constants.wgsl"

const DIELECTRIC_F0: vec3<f32> = vec3<f32>(0.04);

fn dGgx(nDotH: f32, roughness: f32) -> f32 {
    let a = roughness * roughness;
    let a2 = a * a;
    let d = (nDotH * nDotH) * (a2 - 1.0) + 1.0;
    return a2 / max(PI * d * d, 1e-7);
}

fn gSmithCorrelated(nDotV: f32, nDotL: f32, roughness: f32) -> f32 {
    let a = roughness * roughness;
    let a2 = a * a;
    let gv = nDotL * sqrt(nDotV * nDotV * (1.0 - a2) + a2);
    let gl = nDotV * sqrt(nDotL * nDotL * (1.0 - a2) + a2);
    return 0.5 / max(gv + gl, 1e-7);
}

fn fSchlick(f0: vec3<f32>, vDotH: f32) -> vec3<f32> {
    let t = pow(1.0 - vDotH, 5.0);
    return f0 + (vec3<f32>(1.0) - f0) * t;
}

fn energyCompensation(f0: vec3<f32>, roughness: f32) -> vec3<f32> {
    // Fdez-Agüera：多次散射能量补偿（简版）
    return vec3<f32>(1.0) + f0 * min(1.0 / max(roughness, 0.04) - 1.0, 4.0);
}

fn fresnelF0(baseColor: vec3<f32>, metalness: f32) -> vec3<f32> {
    return mix(DIELECTRIC_F0, baseColor, metalness);
}

fn diffuseLambert(baseColor: vec3<f32>, metalness: f32) -> vec3<f32> {
    return baseColor * (1.0 - metalness) / PI;
}

fn evaluateBrdf(
    normal: vec3<f32>,
    viewDir: vec3<f32>,
    lightDir: vec3<f32>,
    baseColor: vec3<f32>,
    roughness: f32,
    metalness: f32,
) -> vec3<f32> {
    let nDotL = max(dot(normal, lightDir), 0.0);
    if (nDotL <= 0.0) {
        return vec3<f32>(0.0);
    }
    let h = normalize(viewDir + lightDir);
    let nDotV = max(dot(normal, viewDir), 1e-4);
    let nDotH = max(dot(normal, h), 0.0);
    let vDotH = max(dot(viewDir, h), 0.0);
    let a = max(roughness, 0.04);
    let f0 = fresnelF0(baseColor, metalness);
    let f = fSchlick(f0, vDotH);
    let spec = dGgx(nDotH, a) * gSmithCorrelated(nDotV, nDotL, a) * f;
    let kd = (vec3<f32>(1.0) - f) * (1.0 - metalness);
    let diffuse = kd * baseColor / PI;
    return (diffuse + spec * energyCompensation(f0, a)) * nDotL;
}

fn evaluateClearcoat(
    normal: vec3<f32>,
    viewDir: vec3<f32>,
    lightDir: vec3<f32>,
    clearcoat: f32,
    clearcoatRoughness: f32,
) -> f32 {
    if (clearcoat <= 0.0) {
        return 0.0;
    }
    let nDotL = max(dot(normal, lightDir), 0.0);
    let h = normalize(viewDir + lightDir);
    let nDotV = max(dot(normal, viewDir), 1e-4);
    let nDotH = max(dot(normal, h), 0.0);
    let vDotH = max(dot(viewDir, h), 0.0);
    let a = max(clearcoatRoughness, 0.04);
    let f = 0.04 + 0.96 * pow(1.0 - vDotH, 5.0);
    return clearcoat * dGgx(nDotH, a) * gSmithCorrelated(nDotV, nDotL, a) * f * nDotL;
}
