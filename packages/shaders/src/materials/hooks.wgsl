// materials/hooks.wgsl
// 用途：onBeforeCompose 七个接口点（空实现；由 defines 打开用户片段）。
// 依赖 defines：HOOK_VERTEX_POSITION / HOOK_VERTEX_OUTPUT / HOOK_MATERIAL_BASECOLOR /
//   HOOK_MATERIAL_NORMAL / HOOK_MATERIAL_ROUGHNESS_METALNESS / HOOK_MATERIAL_EMISSIVE /
//   HOOK_MATERIAL_OUTPUT。
// 期望绑定：无。

#if HOOK_VERTEX_POSITION
// @source materials/hooks/vertex_position
#endif

#if HOOK_VERTEX_OUTPUT
// @source materials/hooks/vertex_output
#endif

#if HOOK_MATERIAL_BASECOLOR
// @source materials/hooks/material_baseColor
#endif

#if HOOK_MATERIAL_NORMAL
// @source materials/hooks/material_normal
#endif

#if HOOK_MATERIAL_ROUGHNESS_METALNESS
// @source materials/hooks/material_roughnessMetalness
#endif

#if HOOK_MATERIAL_EMISSIVE
// @source materials/hooks/material_emissive
#endif

#if HOOK_MATERIAL_OUTPUT
// @source materials/hooks/material_output
#endif
