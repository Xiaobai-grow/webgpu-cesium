// materials/gbuffer.wgsl
// 用途：MaterialOutput → G-buffer 附件。
// 依赖 defines：无。
// 期望绑定：无。

#import "builtin/encoding.wgsl"
#import "materials/output.wgsl"

struct GBufferFragmentOutput {
    @location(0) gb0: vec4<f32>,
    @location(1) gb1: vec4<f32>,
    @location(2) gb2: vec4<f32>,
    @location(3) gb3: vec4<f32>,
}

fn writeGBuffer(material: MaterialOutput) -> GBufferFragmentOutput {
    var out: GBufferFragmentOutput;
    out.gb0 = vec4<f32>(material.baseColor, f32(material.materialId) / 255.0);
    let oct = octEncode(normalize(material.normal));
    out.gb1 = vec4<f32>(oct, 0.0, 1.0);
    out.gb2 = vec4<f32>(material.roughness, material.metalness, material.occlusion, 0.0);
    out.gb3 = vec4<f32>(material.emissive, material.clearcoat * 0.5 + material.clearcoatRoughness * 0.5);
    return out;
}

fn unpackMaterialId(gb0: vec4<f32>) -> u32 {
    return u32(round(gb0.a * 255.0));
}
