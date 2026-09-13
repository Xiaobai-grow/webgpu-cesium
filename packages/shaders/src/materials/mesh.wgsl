// materials/mesh.wgsl
// 用途：测试球体 / 立方体写 G-buffer。
// 依赖 defines：HAS_MAP / HAS_NORMAL_MAP / HAS_EMISSIVE_MAP / VERTEX_COLORS /
//   MATERIAL_UNLIT / MATERIAL_PHYSICAL / 以及 hooks/*。
// 期望绑定：
//   group 0 / 0 = FrameUniforms
//   group 1 / 0 = 占位 uniform（对齐地形 group 槽位，避免空 bind group）
//   group 2 / 0 = MaterialUniforms
//   group 2 / 1 = 基础色纹理
//   group 2 / 2 = 法线纹理
//   group 2 / 3 = 采样器
//   group 3 / 0 = ObjectUniforms（RTE 中心 + ENU）

#import "builtin/constants.wgsl"
#import "builtin/frame.wgsl"
#import "builtin/transforms.wgsl"
#import "builtin/color.wgsl"
#import "materials/gbuffer.wgsl"
#import "materials/hooks.wgsl"

struct MaterialUniforms {
    color: vec4<f32>,
    emissive: vec4<f32>,
    params0: vec4<f32>,
    params1: vec4<f32>,
    params2: vec4<f32>,
}

struct ObjectUniforms {
    centerHigh: vec3<f32>,
    _pad0: u32,
    centerLow: vec3<f32>,
    _pad1: u32,
    east: vec3<f32>,
    _pad2: u32,
    north: vec3<f32>,
    _pad3: u32,
    up: vec3<f32>,
    _pad4: u32,
}

struct MeshGroup1 {
    _pad: vec4<f32>,
}

@group(1) @binding(0) var<uniform> meshGroup1: MeshGroup1;
@group(2) @binding(0) var<uniform> material: MaterialUniforms;
@group(2) @binding(1) var materialMap: texture_2d<f32>;
@group(2) @binding(2) var materialNormalMap: texture_2d<f32>;
@group(2) @binding(3) var materialSampler: sampler;
@group(3) @binding(0) var<uniform> object: ObjectUniforms;

struct MeshVertexInput {
    @location(0) position: vec3<f32>,
    @location(2) normal: vec3<f32>,
    @location(4) texcoord0: vec2<f32>,
}

struct MeshVertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) texcoord: vec2<f32>,
    @location(1) worldNormal: vec3<f32>,
    @location(2) worldApprox: vec3<f32>,
}

@vertex
fn vsMesh(input: MeshVertexInput) -> MeshVertexOutput {
    var local = input.position;
#if HOOK_VERTEX_POSITION
    local = local;
#endif
    // Y-up 模型 → ENU：X=东、Y=天顶、Z=北
    let worldLocal = object.east * local.x + object.up * local.y + object.north * local.z;
    let worldNormal = object.east * input.normal.x + object.up * input.normal.y + object.north * input.normal.z;
    var out: MeshVertexOutput;
    out.position = rteToClip(object.centerHigh, object.centerLow, worldLocal);
    out.texcoord = input.texcoord0;
    out.worldNormal = normalize(worldNormal);
    out.worldApprox = object.centerHigh + object.centerLow + worldLocal;
    // 占位读取，保证 group 1 不被工具链当作未使用
    out.texcoord = out.texcoord + meshGroup1._pad.xy * 0.0;
#if HOOK_VERTEX_OUTPUT
    out.texcoord = out.texcoord;
#endif
    return out;
}

@fragment
fn fsMesh(input: MeshVertexOutput) -> GBufferFragmentOutput {
    var baseColor = srgbToLinear3(material.color.rgb);
#if HAS_MAP
    let sampled = textureSample(materialMap, materialSampler, input.texcoord);
    baseColor *= srgbToLinear3(sampled.rgb);
#endif
#if HOOK_MATERIAL_BASECOLOR
    baseColor = baseColor;
#endif

    var normal = normalize(input.worldNormal);
#if HAS_NORMAL_MAP
    let nt = textureSample(materialNormalMap, materialSampler, input.texcoord).xyz * 2.0 - 1.0;
    normal = normalize(normal + nt * 0.35);
#endif
#if HOOK_MATERIAL_NORMAL
    normal = normal;
#endif

    var roughness = material.params0.x;
    var metalness = material.params0.y;
#if HOOK_MATERIAL_ROUGHNESS_METALNESS
    roughness = roughness;
    metalness = metalness;
#endif

    var emissive = srgbToLinear3(material.emissive.rgb) * material.emissive.a;
#if HOOK_MATERIAL_EMISSIVE
    emissive = emissive;
#endif

    var output: MaterialOutput;
    output.baseColor = baseColor;
    output.normal = normal;
    output.roughness = roughness;
    output.metalness = metalness;
    output.emissive = emissive;
    output.occlusion = material.params0.w;
    output.opacity = material.params0.z;
    output.materialId = u32(material.params2.w + 0.5);
    output.clearcoat = material.params1.y;
    output.clearcoatRoughness = material.params1.z;
#if HOOK_MATERIAL_OUTPUT
    output.baseColor = output.baseColor;
#endif
    return writeGBuffer(output);
}
