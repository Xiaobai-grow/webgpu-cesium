// globe/terrain.wgsl
// 用途：地形写 G-buffer（影像图集 + 大地水准法线）。光照改由延迟 pass 完成。
// 依赖 defines：无。
// override：无。
// 期望绑定：
//   group 0 / binding 0 = FrameUniforms
//   group 1 / binding 0 = texture_2d_array
//   group 1 / binding 1 = sampler
//   group 2 / binding 0 = TileUniforms

#import "builtin/constants.wgsl"
#import "builtin/frame.wgsl"
#import "builtin/transforms.wgsl"
#import "builtin/color.wgsl"
#import "materials/gbuffer.wgsl"

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
fn fsTerrain(input: TerrainVertexOutput) -> GBufferFragmentOutput {
    let normal = normalize(input.worldApprox * WGS84_ONE_OVER_RADII_SQUARED);
    var albedo = srgbToLinear3(tile.baseColor.rgb);
    if (tile.layerIndex != 0xffffffffu) {
        let sampled = textureSample(imageryAtlas, imagerySampler, input.texcoord, i32(tile.layerIndex));
        albedo = mix(albedo, srgbToLinear3(sampled.rgb), sampled.a);
    }
    var material: MaterialOutput;
    material.baseColor = albedo;
    material.normal = normal;
    material.roughness = 0.92;
    material.metalness = 0.0;
    material.emissive = vec3<f32>(0.0);
    material.occlusion = 1.0;
    material.opacity = 1.0;
    material.materialId = MATERIAL_ID_TERRAIN;
    material.clearcoat = 0.0;
    material.clearcoatRoughness = 0.0;
    return writeGBuffer(material);
}
