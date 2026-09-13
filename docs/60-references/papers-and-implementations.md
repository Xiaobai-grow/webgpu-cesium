# 参考资料

按主题分组。标注「fork 内有实现」的条目指 `d:\code\cesium\packages\engine\Source` 中可对照的 GLSL / JS 代码。

## WebGPU 规范与提案

- WebGPU 规范：https://www.w3.org/TR/webgpu/
- WGSL 规范：https://www.w3.org/TR/WGSL/
- gpuweb 仓库与提案目录：https://github.com/gpuweb/gpuweb/tree/main/proposals
- Bindless 提案（`GPUResourceTable`，草案）：https://github.com/gpuweb/gpuweb/blob/main/proposals/bindless.md
- Bindless 实现与体验评估议题：https://github.com/gpuweb/gpuweb/issues/5517
- 64 位原子 min / max 议题（`vec2<u32>` 方案，规范 PR 已获批准）：https://github.com/gpuweb/gpuweb/issues/5071
- WebGPU 状态与浏览器实现：https://github.com/gpuweb/gpuweb/wiki/Implementation-Status
- WebGPU 最佳实践（Toji）：https://toji.dev/webgpu-best-practices/
- WebGPU Fundamentals：https://webgpufundamentals.org/
- `@webgpu/types`：https://github.com/gpuweb/types
- `wgsl_reflect`：https://github.com/brendan-duncan/wgsl_reflect
- `wesl`（WGSL 扩展与组合标准化）：https://github.com/wgsl-tooling-wg/wesl-spec
- `naga_oil`（Bevy 的 WGSL 组合器，设计参考）：https://github.com/bevyengine/naga_oil
- `wgsl-analyzer`：https://github.com/wgsl-analyzer/wgsl-analyzer

## CesiumJS

- 仓库：https://github.com/CesiumGS/cesium
- 3D Tiles 规范：https://github.com/CesiumGS/3d-tiles
- quantized-mesh 格式：https://github.com/CesiumGS/quantized-mesh
- glTF 2.0 规范与扩展：https://github.com/KhronosGroup/glTF
- glTF Sample Assets：https://github.com/KhronosGroup/glTF-Sample-Assets
- Cesium 的精度处理（RTE、log depth）博文：https://cesium.com/blog/2018/05/24/logarithmic-depth/ 与 Ohlarik "Precisions, Precisions" https://help.agi.com/AGIComponents/html/BlogPrecisionsPrecisions.htm

## 材质系统（three.js 参考）

- three.js 仓库：https://github.com/mrdoob/three.js
- `Material` 基类文档：https://threejs.org/docs/#api/en/materials/Material
- `MeshStandardMaterial`：https://threejs.org/docs/#api/en/materials/MeshStandardMaterial
- `MeshPhysicalMaterial`：https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial
- `LineBasicMaterial` / `LineDashedMaterial` / `PointsMaterial` / `SpriteMaterial` / `ShaderMaterial`：https://threejs.org/docs/#api/en/materials/ShaderMaterial
- `Texture` 与常量（wrap / filter / color space / blending）：https://threejs.org/docs/#api/en/textures/Texture 、https://threejs.org/docs/#api/en/constants/Textures 、https://threejs.org/docs/#api/en/constants/Materials
- three.js WebGPURenderer 与节点材质 / TSL（后置 R&D 参考）：https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language
- three.js `GLTFLoader` 材质映射实现（glTF → `MeshPhysicalMaterial`）：https://github.com/mrdoob/three.js/blob/dev/examples/jsm/loaders/GLTFLoader.js
- glTF `KHR_materials_*` 扩展规范：https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos
- Cesium Fabric 材质文档（被替代对象，用于功能对照）：https://github.com/CesiumGS/cesium/wiki/Fabric

## 深度与精度

- Reverse-Z（Reed）：https://developer.nvidia.com/content/depth-precision-visualized
- Outerra 的对数深度与 Reverse-Z 讨论：https://outerra.blogspot.com/2012/11/maximizing-depth-buffer-range-and.html

## Render Graph

- FrameGraph（O'Donnell, GDC 2017）：https://www.gdcvault.com/play/1024612/FrameGraph-Extensible-Rendering-Architecture-in
- Halcyon / Wicked Engine / Granite 的帧图实现博文（Themaister）：https://themaister.net/blog/2017/08/15/render-graphs-and-vulkan-a-deep-dive/

## 大气与天体

- Hillaire 2020《A Scalable and Production Ready Sky and Atmosphere Rendering Technique》：https://sebh.github.io/publications/egsr2020.pdf
- Hillaire 参考实现（Shadertoy 与 GitHub）：https://github.com/sebh/UnrealEngineSkyAtmosphere
- Bruneton 2017 精确大气散射（fork 内有实现 `ThreeGeospatial/Atmosphere`）：https://ebruneton.github.io/precomputed_atmospheric_scattering/
- three-geospatial（takram，fork 中 ThreeGeospatial 的来源）：https://github.com/takram-design-engineering/three-geospatial
- NASA CGI Moon Kit（月面纹理与高程）：https://svs.gsfc.nasa.gov/4720
- Hipparcos / Tycho-2 星表：https://www.cosmos.esa.int/web/hipparcos/catalogues
- Gaia 全天图：https://sci.esa.int/web/gaia
- Simon et al. 1994 行星位置（Cesium `Simon1994PlanetaryPositions` 出处）：Astronomy and Astrophysics 282, 663–683

## 体积云与天气

- Schneider & Vos 2015《The Real-time Volumetric Cloudscapes of Horizon: Zero Dawn》：https://www.guerrilla-games.com/read/the-real-time-volumetric-cloudscapes-of-horizon-zero-dawn
- Schneider 2017《Nubis: Authoring Real-Time Volumetric Cloudscapes with the Decima Engine》
- Schneider 2022/2023《Nubis, Evolved / Nubis Cubed》（SIGGRAPH Advances in Real-Time Rendering）：https://advances.realtimerendering.com/
- Hillaire 2016《Physically Based Sky, Atmosphere and Cloud Rendering in Frostbite》：https://www.ea.com/frostbite/news/physically-based-sky-atmosphere-and-cloud-rendering
- Wrenninge 多次散射近似；Beer-Powder 近似（上述文献）
- STBN 蓝噪声（NVIDIA）：https://developer.nvidia.com/blog/rendering-in-real-time-with-spatiotemporal-blue-noise-textures-part-1/
- fork 内有实现：`ThreeGeospatial/Clouds`（形状 / 细节噪声、weather map、级联云阴影、重投影、质量预设）
- NASA GIBS（云量 / 云顶高等产品）：https://nasa-gibs.github.io/gibs-api-docs/ ；图层列表 https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/
- NOAA GOES / Himawari 公开数据（AWS Open Data）：https://registry.opendata.aws/noaa-goes/ 、https://registry.opendata.aws/noaa-himawari/
- Open-Meteo（天气 API，可选 `WeatherProvider`）：https://open-meteo.com/

## 海洋

- Tessendorf 2001《Simulating Ocean Water》：https://people.computing.clemson.edu/~jtessen/reports/papers_files/coursenotes2004.pdf
- Horvath 2015《Empirical directional wave spectra for computer graphics》（JONSWAP / TMA 频谱）
- GPU FFT 海洋参考实现（Unity / three.js 社区）：https://github.com/gasgiant/FFT-Ocean
- fork 内有实现：`Extension/Ocean/Simulation`、`Extension/Ocean/Rendering`

## 光照、阴影与后处理

- Karis 2013《Real Shading in Unreal Engine 4》（GGX / IBL 分裂求和）：https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
- Fdez-Agüera 2019《A Multiple-Scattering Microfacet Model for Real-Time Image-based Lighting》
- Jimenez 2016 GTAO《Practical Realtime Strategies for Accurate Indirect Occlusion》：https://www.activision.com/cdn/research/Practical_Real_Time_Strategies_for_Accurate_Indirect_Occlusion_NEW%20VERSION_COLOR.pdf
- Valient 2007 稳定级联阴影《Stable Rendering of Cascaded Shadow Maps》
- Karis 2014 TAA《High Quality Temporal Supersampling》：https://de45xmedrsdbp.cloudfront.net/Resources/files/TemporalAA_small-59732822.pdf
- McGuire & Bavoil 2013 WBOIT《Weighted Blended Order-Independent Transparency》：https://jcgt.org/published/0002/02/09/
- Stachowiak 2015 SSR《Stochastic Screen-Space Reflections》
- ACES 拟合（Narkowicz / Hill）：https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
- AgX（Troy Sobotka）：https://github.com/sobotka/AgX
- HDR canvas（`toneMapping` extended）：https://developer.chrome.com/blog/hdr-canvas 与 WebGPU `GPUCanvasToneMapping`
- fork 内有实现：`GBuffer/*`、`ThreeGeospatial/Lighting/DeferredLightingStage.js`、`ThreeGeospatial/Effects/*`（Dithering、LightShafts、SSGI 实验、Hald LUT、镜头光斑）

## 虚拟化与 GPU-driven

- Karis 2021《Nanite: A Deep Dive》：https://advances.realtimerendering.com/s2021/Karis_Nanite_SIGGRAPH_Advances_2021_final.pdf
- Haar & Aaltonen 2015《GPU-Driven Rendering Pipelines》（Assassin's Creed Unity）：https://advances.realtimerendering.com/s2015/aaltonenhaar_siggraph2015_combined_final_footer_220dpi.pdf
- Virtual Shadow Maps（UE5 文档与 SIGGRAPH 2022 讲稿）：https://dev.epicgames.com/documentation/en-us/unreal-engine/virtual-shadow-maps-in-unreal-engine
- Sparse Virtual Texturing（Barrett 2008；id Software MegaTexture；Mittring 2008《Advanced Virtual Texture Topics》）
- meshoptimizer（meshlet 生成、简化、`EXT_meshopt_compression`）：https://github.com/zeux/meshoptimizer
- Hi-Z 遮挡剔除（Hill & Collin 2011《Practical, Dynamic Visibility for Games》）
- Bevy 的 WebGPU meshlet / 可见性缓冲实验（无 64 位原子时的两遍方案参考）：https://github.com/bevyengine/bevy/tree/main/crates/bevy_pbr/src/meshlet

## 工具链

- pnpm workspaces：https://pnpm.io/workspaces
- tsdown：https://tsdown.dev/
- Vite：https://vite.dev/
- Vitest 浏览器模式：https://vitest.dev/guide/browser/
- Playwright：https://playwright.dev/
- TypeDoc：https://typedoc.org/
- VitePress：https://vitepress.dev/
- Changesets：https://github.com/changesets/changesets
