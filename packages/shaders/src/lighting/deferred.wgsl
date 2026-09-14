// lighting/deferred.wgsl
// 用途：全屏延迟光照（太阳 + 月亮 + IBL + 空气透视）。
// 依赖 defines：无。
// 期望绑定：group 0 FrameUniforms；group 1 G-buffer / 深度 / LUT / IBL。

#import "builtin/constants.wgsl"
#import "builtin/frame.wgsl"
#import "builtin/depth.wgsl"
#import "builtin/encoding.wgsl"
#import "builtin/pbr.wgsl"
#import "atmosphere/common.wgsl"
#import "materials/output.wgsl"

@group(1) @binding(0) var gb0: texture_2d<f32>;
@group(1) @binding(1) var gb1: texture_2d<f32>;
@group(1) @binding(2) var gb2: texture_2d<f32>;
@group(1) @binding(3) var gb3: texture_2d<f32>;
@group(1) @binding(4) var sceneDepth: texture_depth_2d;
@group(1) @binding(5) var transmittanceLut: texture_2d<f32>;
@group(1) @binding(6) var aerialLut: texture_3d<f32>;
@group(1) @binding(7) var irradianceCube: texture_2d_array<f32>;
@group(1) @binding(8) var lutSampler: sampler;

struct LightingVertexOut {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vsLighting(@builtin(vertex_index) index: u32) -> LightingVertexOut {
    var out: LightingVertexOut;
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0),
    );
    out.position = vec4<f32>(pos[index], 0.0, 1.0);
    out.uv = pos[index] * vec2<f32>(0.5, -0.5) + 0.5;
    return out;
}

fn sampleIrradiance(normal: vec3<f32>) -> vec3<f32> {
    let a = abs(normal);
    var face = 0u;
    var uv = vec2<f32>(0.0);
    if (a.x >= a.y && a.x >= a.z) {
        face = select(1u, 0u, normal.x >= 0.0);
        uv = select(vec2<f32>(-normal.z, -normal.y), vec2<f32>(normal.z, -normal.y), normal.x >= 0.0);
        uv = uv / max(a.x, 1e-5);
    } else if (a.y >= a.z) {
        face = select(3u, 2u, normal.y >= 0.0);
        uv = select(vec2<f32>(normal.x, normal.z), vec2<f32>(normal.x, -normal.z), normal.y >= 0.0);
        uv = uv / max(a.y, 1e-5);
    } else {
        face = select(5u, 4u, normal.z >= 0.0);
        uv = select(vec2<f32>(normal.x, -normal.y), vec2<f32>(-normal.x, -normal.y), normal.z >= 0.0);
        uv = uv / max(a.z, 1e-5);
    }
    uv = uv * 0.5 + 0.5;
    return textureSampleLevel(irradianceCube, lutSampler, uv, i32(face), 0.0).rgb;
}

@fragment
fn fsLighting(input: LightingVertexOut) -> @location(0) vec4<f32> {
    let dims = vec2<u32>(textureDimensions(sceneDepth));
    let pix = vec2<i32>(clamp(input.uv * vec2<f32>(dims), vec2<f32>(0.0), vec2<f32>(dims) - vec2<f32>(1.0)));
    let depth = textureLoad(sceneDepth, pix, 0);
    // Reverse-Z：远景深度可低至 1e-8；只有 clear 的 0 才是空像素
    if (depth <= 0.0) {
        return vec4<f32>(0.0);
    }

    let albedoId = textureLoad(gb0, pix, 0);
    let encodedN = textureLoad(gb1, pix, 0);
    let rma = textureLoad(gb2, pix, 0);
    let emi = textureLoad(gb3, pix, 0);
    let materialId = u32(round(albedoId.a * 255.0));
    let albedo = albedoId.rgb;
    let normal = octDecode(encodedN.rg);
    let roughness = rma.r;
    let metalness = rma.g;
    let occlusion = rma.b;
    let emissive = emi.rgb;

    let world = reconstructWorldApprox(input.uv, depth);
    let camera = frame.cameraPositionHigh + frame.cameraPositionLow;
    let viewDir = normalize(camera - world);
    var color = emissive;

    if (materialId == MATERIAL_ID_UNLIT) {
        color += albedo;
    } else {
        let sunDir = normalize(frame.sunDirectionECEF);
        let originKm = world / 1000.0;
        let sunT = sampleTransmittanceLut(transmittanceLut, lutSampler, originKm, sunDir);
        let sunRadiance = frame.sunIrradiance * sunT;
        color += evaluateBrdf(normal, viewDir, sunDir, albedo, roughness, metalness) * sunRadiance;

        if (frame.moonIntensity > 0.0) {
            let moonDir = normalize(frame.moonDirectionECEF);
            let moonRadiance = vec3<f32>(0.15, 0.17, 0.22) * frame.moonIntensity;
            color += evaluateBrdf(normal, viewDir, moonDir, albedo, roughness, metalness) * moonRadiance;
        }

        let clearcoat = saturate((emi.a - 0.5) * 2.0);
        let clearcoatRough = saturate(emi.a * 2.0);
        if (materialId == MATERIAL_ID_PHYSICAL && clearcoat > 0.0) {
            color += vec3<f32>(evaluateClearcoat(normal, viewDir, sunDir, clearcoat, clearcoatRough)) * sunRadiance;
        }

        let f0 = fresnelF0(albedo, metalness);
        let nDotV = max(dot(normal, viewDir), 0.0);
        let iblDiffuse = sampleIrradiance(normal) * albedo * (1.0 - metalness) * occlusion;
        let iblSpec = sampleIrradiance(reflect(-viewDir, normal)) * fSchlick(f0, nDotV) * (1.0 - roughness);
        let up = normalize(world);
        let fill = albedo * (0.03 + 0.05 * max(dot(normal, up), 0.0)) * occlusion;
        color += (iblDiffuse + iblSpec * 0.35) * 0.06 + fill;
    }

    if (frame.aerialPerspectiveEnabled > 0.5) {
        let distKm = length(world - camera) / 1000.0;
        let slice = saturate(sqrt(distKm / 80.0));
        let ap = textureSampleLevel(aerialLut, lutSampler, vec3<f32>(input.uv, slice), 0.0);
        // 未写出的 LUT 为 0，避免把地表乘成黑
        if (ap.a > 1e-4 || max(ap.r, max(ap.g, ap.b)) > 1e-4) {
            color = color * ap.a + ap.rgb;
        }
    }

    return vec4<f32>(color, 1.0);
}
