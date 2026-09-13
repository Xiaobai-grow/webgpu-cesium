// globe/reproject.wgsl
// 用途：影像瓦片写入 texture_2d_array 一层；同方案时为恒等拷贝，
//       不同方案时按经纬 → 源投影 UV 重采样。
// 依赖 defines：REPROJECT_MERCATOR（1 = WebMercator → 地理）。
// 期望绑定：
//   group 0 / binding 0 = ReprojectUniforms
//   group 0 / binding 1 = 源 texture_2d
//   group 0 / binding 2 = sampler
//   group 0 / binding 3 = 目标 texture_storage_2d_array

struct ReprojectUniforms {
    destWest: f32,
    destSouth: f32,
    destEast: f32,
    destNorth: f32,
    srcWest: f32,
    srcSouth: f32,
    srcEast: f32,
    srcNorth: f32,
    layerIndex: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
}

@group(0) @binding(0) var<uniform> reproject: ReprojectUniforms;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
@group(0) @binding(2) var sourceSampler: sampler;
@group(0) @binding(3) var destTexture: texture_storage_2d_array<rgba8unorm, write>;

override WORKGROUP_SIZE: u32 = 8;

#if REPROJECT_MERCATOR
fn geographicToMercatorV(latitude: f32) -> f32 {
    let s = clamp(latitude, -1.4844222297453324, 1.4844222297453324);
    return 0.5 - log(tan(0.7853981633974483 + s * 0.5)) / 6.283185307179586;
}
#endif

@compute @workgroup_size(8, 8, 1)
fn csReproject(@builtin(global_invocation_id) id: vec3<u32>) {
    let dims = textureDimensions(destTexture);
    if (id.x >= dims.x || id.y >= dims.y) {
        return;
    }
    let uv = (vec2<f32>(id.xy) + vec2<f32>(0.5)) / vec2<f32>(dims);
    var sourceUv = uv;
#if REPROJECT_MERCATOR
    let lon = mix(reproject.destWest, reproject.destEast, uv.x);
    let lat = mix(reproject.destNorth, reproject.destSouth, uv.y);
    let mercU = (lon - reproject.srcWest) / (reproject.srcEast - reproject.srcWest);
    let mercV = (geographicToMercatorV(lat) - geographicToMercatorV(reproject.srcNorth))
        / (geographicToMercatorV(reproject.srcSouth) - geographicToMercatorV(reproject.srcNorth));
    sourceUv = vec2<f32>(mercU, mercV);
#endif
    var color = vec4<f32>(0.0);
    if (sourceUv.x >= 0.0 && sourceUv.x <= 1.0 && sourceUv.y >= 0.0 && sourceUv.y <= 1.0) {
        color = textureSampleLevel(sourceTexture, sourceSampler, sourceUv, 0.0);
    }
    textureStore(destTexture, vec2<i32>(id.xy), i32(reproject.layerIndex), color);
}
