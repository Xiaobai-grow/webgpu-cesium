// atmosphere/transmittance.wgsl
// 用途：Hillaire 透射率 LUT（256×64）。
// 依赖 defines：无。
// 期望绑定：group 0 FrameUniforms；group 1 binding 0 storage 写出。

#import "atmosphere/common.wgsl"

@group(1) @binding(0) var transmittanceOut: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn csTransmittance(@builtin(global_invocation_id) id: vec3<u32>) {
    let size = textureDimensions(transmittanceOut);
    if (id.x >= size.x || id.y >= size.y) {
        return;
    }
    let uv = (vec2<f32>(id.xy) + vec2<f32>(0.5)) / vec2<f32>(size);
    let rMu = uvToRMu(uv);
    let r = rMu.x;
    let mu = rMu.y;
    let origin = vec3<f32>(0.0, 0.0, r);
    let dir = vec3<f32>(sqrt(max(1.0 - mu * mu, 0.0)), 0.0, mu);
    let hit = raySphere(origin, dir, atmosphereRadiusKm());
    var tMax = max(hit.y, 0.0);
    let ground = raySphere(origin, dir, planetRadiusKm());
    if (ground.x > 0.0) {
        tMax = min(tMax, ground.x);
    }
    let od = opticalDepth(origin, dir, tMax, TRANSMITTANCE_STEPS);
    textureStore(transmittanceOut, vec2<i32>(id.xy), vec4<f32>(exp(-od), 1.0));
}
