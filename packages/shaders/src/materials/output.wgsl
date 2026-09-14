// materials/output.wgsl
// 用途：MaterialOutput 契约（经典材质与未来节点材质共用）。
// 依赖 defines：无。
// 期望绑定：无。

struct MaterialOutput {
    baseColor: vec3<f32>,
    normal: vec3<f32>,
    roughness: f32,
    metalness: f32,
    emissive: vec3<f32>,
    occlusion: f32,
    opacity: f32,
    materialId: u32,
    clearcoat: f32,
    clearcoatRoughness: f32,
}

const MATERIAL_ID_TERRAIN: u32 = 1u;
const MATERIAL_ID_STANDARD: u32 = 2u;
const MATERIAL_ID_UNLIT: u32 = 3u;
const MATERIAL_ID_PHYSICAL: u32 = 4u;
