// globe/terrain.wgsl
// 用途：零高度地形前向 Lambert + 单层影像图集。
// 依赖 defines：无。
// override：无（M2 单层；层数用 #if 会增加变体，单层走固定绑定）。
// 期望绑定：
//   group 0 / binding 0 = FrameUniforms
//   group 1 / binding 0 = texture_2d_array
//   group 1 / binding 1 = sampler
//   group 2 / binding 0 = TileUniforms

#import "builtin/constants.wgsl"
#import "builtin/frame.wgsl"
#import "builtin/transforms.wgsl"

struct TileUniforms {
    centerHigh: vec3<f32>,
    layerIndex: u32,
    centerLow: vec3<f32>,
    _pad0: u32,
    baseColor: vec4<f32>,
}

@group(1) @binding(0) var imageryAtlas: texture_2d_array<f32>;
@group(1) @binding(1) var imagerySampler: sampler;
@group(2) @binding(0) var<uniform> tile: TileUniforms;

struct TerrainVertexInput {
    @location(0) position: vec3<f32>,
    @location(1) texcoord: vec2<f32>,
}

struct TerrainVertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) texcoord: vec2<f32>,
    @location(1) worldApprox: vec3<f32>,
}

@vertex
fn vsTerrain(input: TerrainVertexInput) -> TerrainVertexOutput {
    var out: TerrainVertexOutput;
    out.position = rteToClip(tile.centerHigh, tile.centerLow, input.position);
    out.texcoord = input.texcoord;
    out.worldApprox = tile.centerHigh + tile.centerLow + input.position;
    return out;
}

@fragment
fn fsTerrain(input: TerrainVertexOutput) -> @location(0) vec4<f32> {
    let normal = normalize(input.worldApprox * WGS84_ONE_OVER_RADII_SQUARED);
    let camera = frame.cameraPositionHigh + frame.cameraPositionLow;
    let lightDir = normalize(camera);
    let lambert = max(dot(normal, lightDir), 0.4);
    var albedo = tile.baseColor.rgb;
    if (tile.layerIndex != 0xffffffffu) {
        let sampled = textureSample(imageryAtlas, imagerySampler, input.texcoord, i32(tile.layerIndex));
        albedo = mix(albedo, sampled.rgb, sampled.a);
    }
    return vec4<f32>(albedo * lambert, 1.0);
}
