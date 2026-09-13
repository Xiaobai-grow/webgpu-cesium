# 目标与范围

状态：已接受（2026-09-13 与用户对齐）

## 1. 项目定位

用 TypeScript + WebGPU + WGSL 完全重写 CesiumJS 的渲染引擎与场景层，只从 CesiumJS 继承「数据与数学」这一层（地理坐标、椭球、投影、时间系统、瓦片方案、地形 / 影像 Provider、3D Tiles 解析、glTF 解析、元数据）。渲染管线、着色器、绘制调用、资源管理全部按 WebGPU 的模型重新设计，不做 WebGL 兼容层。

项目同时是一次视觉升级：在保留 Cesium 级别 GIS 精度与数据能力的前提下，达到现代实时渲染的画面水准。

## 2. 目标

### 2.1 GIS 能力（必须与 Cesium 对齐）

- WGS84 椭球与任意椭球、Cartographic / Cartesian 互转、ENU / ECEF / ICRF 参考系变换。
- 双精度地理坐标下的稠密场景无抖动（相机相对渲染）。
- 地理 / Web Mercator 瓦片方案、四叉树 LOD、屏幕空间误差（SSE）驱动的加载与卸载。
- 地形：quantized-mesh、heightmap、Cesium ion 世界地形、ArcGIS 地形、自定义高度图；垂直夸张；地形拾取与采样。
- 影像：UrlTemplate、TMS、WMS、WMTS、ArcGIS、Bing、Google 2D、OSM、单张影像、ion 影像；多图层叠加、透明度、亮度 / 对比度 / 色相 / 饱和度 / Gamma、切分与裁剪矩形。
- 3D Tiles 1.0 / 1.1：显式与隐式瓦片、`3DTILES_metadata` / `EXT_structural_metadata`、样式语言、要素拾取、b3dm / i3dm / pnts / cmpt（通过 glTF 转换路径）、Google Photorealistic 3D Tiles。
- glTF 2.0 全量：PBR 材质扩展、Draco、KTX2 / Basis、meshopt、`EXT_mesh_features`、`EXT_instance_features`、`KHR_texture_transform`、骨骼与变形动画、`KHR_materials_*`。
- 时间系统：JulianDate、闰秒、TAI / UTC、Clock；日月位置由时间驱动。
- 相机：与 Cesium 一致的屏幕空间控制手感（旋转 / 平移 / 缩放 / 倾斜、地形碰撞、惯性）、flyTo、lookAt、视锥剔除。
- 拾取：屏幕坐标 → 地形 / 瓦片 / 要素 / 图元；元数据拾取。

### 2.2 渲染能力（超越 Cesium）

- 纯 WebGPU 渲染后端，Render Graph 组织帧，pipeline 缓存，compute 通道是一等公民。
- Reverse-Z 深度，单视锥覆盖从 1 cm 到十万公里量级，不再需要 log depth 与多视锥切分。
- 延迟渲染（G-buffer）+ clustered 光照 + PBR + IBL；HDR 管线与 HDR 输出。
- 材质系统参考 three.js：`MeshPhysicalMaterial` 级别的 PBR 扩展（清漆、透射、虹彩、各向异性、光泽），图元与 glTF 模型共用，用户可覆写模型材质。
- 物理大气（Hillaire 2020），太阳、月亮（月相）、星空由真实历表驱动。
- 体积云：ray-march 体积云 + 以真实卫星云图生成的全球 weather map。
- 天气系统：雨、雪、雾、闪电、地表湿润；海洋（FFT 波谱）。
- 阴影：级联阴影（CSM）起步，虚拟阴影贴图（VSM）作为后续路线。
- 后处理：TAA、GTAO、SSR、Bloom、色调映射（ACES / AgX）、镜头效果。
- GPU-driven：compute 剔除 + indirect draw；虚拟纹理；meshlet 数据结构与剔除（Nanite-like 软光栅作为 R&D 轨道）。

### 2.3 工程能力

- TypeScript strict、ESM only、tree-shakable。
- pnpm monorepo，分包发布。
- Vitest 单元测试（数学 / 地理 / 解析），浏览器模式 + Playwright 做渲染截图回归。
- Vite + Vue 3 示例站（对标 Sandcastle）；VitePress 文档站；TypeDoc API 文档。

## 3. 非目标

- 不兼容 WebGL / WebGL 2；无 WebGPU 的浏览器直接报错，不降级。
- 不追求与 Cesium 的 Scene / Viewer / Entity API 兼容；只有数学 / 地理 / Tiles 层保留 Cesium 命名（见 ADR-0004）。
- 不做 2D / Columbus View 场景模式；只有 3D。
- 首期不做 Entity / DataSources（CZML、GeoJSON、KML 的实体层）；数据解析层可后续按需移植。
- 不做 Cesium 的 Fabric 材质 DSL 与 Appearance 体系；材质参考 three.js 经典材质类层级（`MeshStandardMaterial` / `MeshPhysicalMaterial` / `LineBasicMaterial` / `ShaderMaterial` 等）重新设计，Fabric 内置材质以子类形式提供等价物（ADR-0010）。
- 不做 Cesium 的 `CustomShader` GLSL 兼容；自定义着色由 `ShaderMaterial` 与 `Material.onBeforeCompose`（WGSL）提供。
- 首期不做节点式材质（TSL 风格）；作为后置 R&D。
- 不重写 Cesium ion 服务端能力，只做客户端访问。
- 不支持 Node.js 渲染（headless 渲染依赖浏览器）。`core` 包可以在 Node 中运行以便测试。

## 4. 保留 / 改写 / 弃用总览

细表见 [30-roadmap/02-cesium-module-inventory.md](../30-roadmap/02-cesium-module-inventory.md)。

| 分类 | 处理 | 代表 |
| --- | --- | --- |
| 数学、地理、时间 | 直接移植为 TS，保留类名与签名 | `Cartesian3` `Matrix4` `Ellipsoid` `Transforms` `JulianDate` |
| 网络与调度 | 直接移植 | `Resource` `Request` `RequestScheduler` `TaskProcessor` |
| 地形 / 影像 Provider 与数据格式 | 直接移植（去掉 WebGL 相关的纹理创建） | `CesiumTerrainProvider` `QuantizedMeshTerrainData` `UrlTemplateImageryProvider` |
| 3D Tiles 解析、遍历、元数据、样式 | 直接移植逻辑，渲染接口重写 | `Cesium3DTileset` `ImplicitSubtree` `MetadataTable` `Cesium3DTileStyle` |
| glTF 解析管线 | 直接移植解析，重写 GPU 资源与管线阶段 | `GltfPipeline/*` `ModelComponents` |
| Scene / Camera / Globe / Quadtree | 改写：保留算法（SSE、遍历、填充网格），替换渲染与状态模型 | `QuadtreePrimitive` `GlobeSurfaceTileProvider` `Camera` |
| Renderer / Shaders / RenderState / DrawCommand | 弃用，重新设计 | `Context` `ShaderProgram` `*.glsl` `AutomaticUniforms` |
| 材质：Fabric `Material`、`Appearance` 家族、`CustomShader` | 弃用，改为 three.js 风格材质类层级（`Material` / `Texture`），见 [12-material-system.md](../10-architecture/12-material-system.md) | `MaterialAppearance` `PerInstanceColorAppearance` `Material.fromType("Grid")` |
| 2D / Columbus View、log depth、多视锥 | 弃用 | `SceneMode` `czm_logDepth` `FrustumCommands` |
| Widgets（Knockout 系） | 弃用，用 Vue 3 重做 | `Viewer` `Timeline` `BaseLayerPicker` |
| ThreeGeospatial / Ocean 扩展（fork 内的 GLSL 效果） | 作为效果算法参考，WGSL 重写 | Bruneton 大气、体积云、FFT 海洋 |

## 5. 与 CesiumJS 的关系与许可

- CesiumJS 采用 Apache-2.0。移植的每个文件顶部保留原版权声明与本项目声明；仓库根目录保留 `LICENSE`（Apache-2.0）与 `NOTICE`，列出 Cesium 及其第三方依赖（`ThirdParty.json` 中的条目按实际使用保留）。
- 移植时允许改写为 TS、拆分文件、删除 WebGL 相关分支；算法与数值行为以 Cesium Specs 为基准回归。
- 不使用 Cesium 商标作为产品名；包作用域暂定 `@webgpu-cesium/*`，正式发布前可改名（见 ADR-0007）。

## 6. 成功标准（项目级）

- 在 Chrome / Edge 稳定版上，加载世界地形 + 全球影像 + 一个城市级 3D Tiles，1080p 稳定 60 fps，帧时间可通过 timestamp-query 分解。
- 大气、日月星、体积云、天气在同一场景中开启，无明显时间闪烁（TAA 稳定），画面达到「截图可直接用于宣传」水准。
- 数学 / 地理层通过从 Cesium Specs 移植的测试集，数值误差在 `CesiumMath.EPSILON` 系列容差内。
- 示例站覆盖每个里程碑的验收场景；每个示例可独立打开。
