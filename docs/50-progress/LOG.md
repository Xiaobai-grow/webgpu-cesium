# 变更日志

按日期倒序。标签：`[对齐]` `[决策]` `[变更]` `[推翻]` `[完成]` `[阻塞]` `[风险]`。

## 2026-09-14（第八轮：M5）

- [完成] M5 落地于分支 `feat/m5-3dtiles-gltf`（未合并 `main`）：新建 `@webgpu-cesium/tiles`（glTF/GLB、`mapGltfMaterial`、`Model`、`Cesium3DTileset` 遍历 / LRU / b3dm·i3dm·pnts·cmpt、最小样式与隐式坐标）、`Scene.models` / `tilesets` / `pickAsync`、示例 `hello-gltf` / `hello-3dtiles`。M4 已在此前合并 `main`（PR #5）。
- [完成] 验证：`pnpm build` / `lint` / `typecheck` 通过；`pnpm test` 42 文件 227 用例（M0–M4 未破）。本机 Chrome `navigator.gpu` 可用。hello-gltf 可见铜 / 黄 unlit / 绿 Basic 覆写三盒；hello-3dtiles 可见四栋彩色盒子（非黑屏）。
- [决策] 不上 `wgsl_reflect`（沿用 M4）。透明 / transmission 不进 G-buffer，图元跳过，不开前向 pass。
- [决策] 示例与 e2e 用程序生成盒子 + data URI，不提交巨大倾斜摄影，不打外网 tileset。
- [决策] `tiles` 自备 `FrameContext`，不依赖 `scene`；`Scene.frameState` 结构满足。聚合包不 star-export 两边的 `TileBoundingRegion`：tiles 侧导出为 `TilesetTileBoundingRegion`。
- [变更] 无 24 文件 GltfPipeline / 35 个 `*PipelineStage`：一体 `GltfLoader` + `GpuMeshPrimitive` 复用 `materials/mesh.wgsl`。
- [变更] 城市 fixture 包围体改局部系（根 ENU，子平移）。曾把 ECEF 球心再乘 ENU，遍历视锥全剔导致 hello-3dtiles 黑屏。
- [变更] Draco 遇扩展抛错；KTX2 占位 1×1 白 `CompressedTexture`；pnts 只解析；隐式无 subtree 展开；样式无 jsep。
- [风险] 未做 glTF Sample Assets 全量对照 three.js；未测城市级 ion OSM / Google 60fps；无 GPU 要素拾取 / 点云 EDL / 蒙皮播放。外网 tileset 仍需 token。

## 2026-09-13（第七轮：M4）

- [完成] M4 落地于分支 `feat/m4-lighting-atmosphere`（未合并 `main`）：Render Graph 别名与 `toJson`/`toMermaid`、G-buffer / 延迟 PBR、Hillaire 四 LUT、日月星、`EnvironmentState`、ACES/Reinhard、`Material`/`Texture`/`Mesh*`、`atmosphere-earth` 与 `material-spheres`。M3（含 mars3d）已在此前合并 `main`（PR #4）。
- [完成] 验证：`pnpm build` / `lint` / `typecheck` 通过；`pnpm test` 38 文件 209 用例。本机 Chrome `navigator.gpu` 可用。hello-triangle / hello-globe / hello-terrain / atmosphere-earth（正午可见彩色 Grid 地球 + 日盘 + 星；日落/夜晚近景 Grid 偏暗仍可见）/ material-spheres（铜球金属-粗糙度网格 + 清漆行）均非黑屏。
- [决策] 不上 `wgsl_reflect`：FrameUniforms 464 字节与材质 group 2 80 字节继续手写偏移。
- [决策] 地形仍 5-float stride，G-buffer 法线用大地水准法线。绑定仍 group 0/1/2；Mesh 为 group 0 / 占位 group 1 / 2 材质 / 3 对象。
- [决策] IBL 32²×6；多散射 16 方向；星表约 30 + 程序星；月面程序圆盘。`GpuTimer` 默认不接入帧图。
- [决策] 延迟空像素判定：Reverse-Z 下只有 `depth <= 0` 才是天空（曾误用 `1e-5` 把远景地球当天空）。
- [变更] `light.intensity` 乘太阳辐照，不再乘曝光。IBL / 填充系数下调，避免材质球过曝。
- [变更] Mesh 局部 Y-up 经 ENU 转到 ECEF；空 bind group 改为 16 字节占位 uniform。`skyAtmosphere.show === false` 仍跑 LUT compute（IBL），只跳过天空 pass。
- [风险] 未与 Cesium `SkyAtmosphere` 对比截图；未实测地表飞到 400 km 能量连续；未对月相与天文年历。贴地 `depthBias`、成千瓦片 RTE 成本仍在。
- [风险] 官方 OSM 使用策略不变；演示 / e2e 继续优先 Grid；无内置 ion token。

## 2026-09-13（M3 追加：mars3d 中国地形）

- [完成] 探测 `http://data.mars3d.cn/terrain`：`layer.json` 为 quantized-mesh-1.0、EPSG:4326、TMS、`{z}/{x}/{y}.terrain`、`octvertexnormals`、maxzoom 15；名称「Mars3D中国地形12.5米」，attribution `http://mars3d.cn`。0–8 级 `available` 近似全球（含负 `startX`），9–15 级约 67°E–136°E、11°N–57°N（中国及周边）。
- [完成] 抽样瓦片：北京城区 L9 高差约 9–30 m（近平地，201 B 网格）；延庆 L9 464–2058 m；四姑娘山 L9/L11 约 2.8–6.0 km；峨眉 L9 493–3064 m。大瓦片 `Content-Encoding: gzip`，`fetch` 自动解压后为合法 QM；`Content-Type: application/octet-stream`。
- [完成] CORS：GET 响应带 `Access-Control-Allow-Origin: *`（layer.json 与 `.terrain`）。OPTIONS 预检返回 204 且无 ACAO；当前 `Accept` 属 CORS 安全列表，浏览器从 `http://localhost` 拉 HTTP 地形应无需预检。HTTPS 托管页面会因混合内容被拦。
- [变更] `CesiumTerrainProvider`：`layer.json` 的 `attribution` 在未传入 `credit` 时写入 `provider.credit`。`Scene` 每帧把地形 credit 与影像 credit 一并挂到 CreditDisplay。
- [变更] `hello-terrain` 支持 `?terrain=mars3d` 或 `?terrain=http(s)://...`；默认仍是圆锥山 / `?ion=`。列表新增「Terrain / 中国（mars3d）」。相机默认四姑娘山南侧（102.88°E, 30.85°N, 48 km，朝北俯视）；真实地形垂直夸张 3。
- [决策] CI / e2e 不打 mars3d；单测只用 mock layer.json。不设 Vite 代理（本机 HTTP 示例站 CORS 已放行）。
- [完成] 本机 Chrome 打开 `http://localhost:5173/#/examples/hello-terrain-china?terrain=mars3d`：WebGPU 可用，非黑屏，Credit「Mars3D 中国地形 12.5m · © OpenStreetMap contributors」。约 3 s 后 68 瓦片 / 106 请求，四姑娘山南侧可见横断山褶皱起伏（垂直夸张 3）。页面内 `fetch` layer.json 与 9/804/344.terrain（51 KB）成功，无 CORS 报错。部分 OSM 影像格缺失（黑块），与官方 OSM 使用策略有关，不挡地形。
- [风险] 第三方 HTTP 服务稳定性与使用策略未评估；仅供本地测试。高 zoom 仅中国范围，境外会填洞 / 粗 LOD。HTTPS 托管会被混合内容拦住。

## 2026-09-13（第六轮：M3）

- [完成] M3 落地于分支 `feat/m3-terrain`（未合并 `main`）：高度图裙边 / 量化网格 / `sampleTerrain` / `CesiumTerrainProvider` / `CustomHeightmap` / `TerrainFillMesh` / `Globe.pick` / `getHeight` / 相机碰地 / Geographic↔Mercator 重投影 / `hello-terrain`。M2 已在此前合并 `main`（PR #3）。
- [完成] 验证：`pnpm build` / `lint` / `typecheck` 通过；`pnpm test` 35 文件 198 用例（含 `core-browser` Worker 往返与 `scene-gpu` 高度图地球 `copyTextureToBuffer` 非全黑）。本机有 WebGPU。示例站 hello-terrain 可见带高度的地球。
- [决策] 顶点仍为 NONE 量化 5-float（position + uv），不为法线改 stride；`encodedNormals` / `waterMask` 留 CPU。地形光照升级仍属 M4。
- [决策] `Ion.defaultAccessToken` 为空，不内置 Cesium 评估 token；演示默认 `CustomHeightmapTerrainProvider` 高斯丘，`?ion=` 可选世界地形。
- [决策] 量化网格上采样输出 17×17 `HeightmapTerrainData`，不再回编码 QM。`TerrainPicker` 不做增量 BVH。`ApproximateTerrainHeights` 不捆绑完整 JSON。
- [决策] ArcGIS LERC 不移植解码器（请求几何抛错）。`Cesium3DTilesTerrainProvider` 为可选，本轮不做。WMS/WMTS/Bing/Ion 影像 Provider 超出里程碑正文，只接线重投影。
- [变更] `upsampleQuantizedTerrainMesh`、`TerrainFillMesh`（常数高填洞）、`sampleTerrain` 失败高度用 NaN（`Cartographic.height` 不能 `undefined`）。
- [变更] Worker 默认关闭；`setTerrainTaskProcessors` 注入后 `createMesh` 走 TaskProcessor。Worker 入口在 `core/src/workers/`（文档曾写 `scene/workers`）。
- [变更] 方案不兼容时不再跳过影像：`reproject.wgsl` compute，失败回退 CPU。hello-globe 仍用 WebMercator 对齐 OSM；hello-terrain 用 Geographic + OSM 走重投影。
- [变更] ESLint `globalIgnores` 增加 `packages/core/src/**/*.browser.test.ts`（core tsconfig 无 DOM，projectService 收不到该文件）。
- [风险] ion 世界地形山区截图未在无 token 环境闭环。官方 OSM 仍有使用策略，e2e 继续 `?imagery=grid`。GPU `rgba8unorm` storage 可能不可用，依赖 CPU 回退。贴地 `depthBias` 未标定。

## 2026-09-13（第五轮：M2）

- [完成] M2 2.1–2.13 落地于分支 `feat/m2-first-globe`（未合并 `main`）：`Scene` / `Camera`（Reverse-Z + RTE）/ 四叉树 / 零高度椭球 / OSM 影像 / Credit / `CesiumViewer` / `hello-globe`。本机 Chrome 打开示例站可见带 OSM 纹理的地球（非洲 / 欧洲轮廓清晰），Credit「© OpenStreetMap contributors」，CPU ≈ 1 ms。
- [完成] 验证：`pnpm build` / `lint` / `typecheck` 通过；`pnpm test` 32 文件 175 用例（含 `scene` Node 与 `scene-gpu` `copyTextureToBuffer` 非全黑）。本机有 WebGPU。
- [决策] 默认 OSM 用官方 `tile.openstreetmap.org`：影像经 `Resource.fetch` + `createImageBitmap`，不依赖 canvas CORS。Carto Voyager（`OSM_CORS_URL`）作备选，免费档会打「API KEY REQUIRED」水印。
- [决策] hello-globe 地形用 `WebMercatorTilingScheme` 与 OSM 1:1；`EllipsoidTerrainProvider` 默认仍是 Geographic。0 级瓦片数不同则跳过影像、只画 `baseColor`。`reproject.wgsl` 已写未接线。
- [决策] `FrameUniforms` 继续手写偏移，不引入 `wgsl_reflect`；单测锁定 `frame.wgsl` 成员顺序。
- [变更] 地形网格主线程同步细分（16×16 = 256 顶点 / 1350 索引，无裙边）；`createVerticesFromHeightmap` 可给 Worker，默认不走。
- [变更] 组合器补 `override` 透传与顶层符号重名检查。`RenderItem.pipelineKey` 避免每帧 `stableKey`。
- [变更] 高空默认姿态改为天底（`pitch = -PI/2`）。`-PI/4` 在 3.5R 处看向太空，0 级瓦片被视锥剔除，地球全黑。
- [变更] 四叉树：子瓦片未入选时回退画本级；地平线不用球心 `isPointVisible`（大瓦片球心在地球内会误剔）。
- [变更] 着色器绑定：group 0 FrameUniforms / group 1 `texture_2d_array` / group 2 TileUniforms（文档曾写 group 2/3）。
- [风险] 2.4 无 Cesium 输入录制回放；2.14 无 100 m 录屏抖动。官方 OSM 有使用策略，Playwright 拉不到瓦片时地球只有底色；e2e 用 `?imagery=grid` 生成三视角基线。本机 Chrome 已验证 OSM 纹理。
- [风险] 像素断言必须用 `copyTextureToBuffer`，且须缓存本帧 `getCurrentTexture()`；2d `drawImage` 读持续 rAF 的 WebGPU canvas 会得到空图。

## 2026-09-13（第四轮：M1）

- [完成] M1 1.1–1.15 落地于分支 `feat/m1-core-math`（未合并 `main`）：`tools/port-cesium`；`@webgpu-cesium/core` 数学 / 地理 / 包围体 / Reverse-Z 视锥 / Transforms / 瓦片方案 / 时间 / 历表 / Resource / TaskProcessor / 输入与数据结构。公开 API 保留 Cesium 原名（ADR-0004）。
- [完成] 本机验证：`pnpm build` / `pnpm lint` / `pnpm typecheck` 通过；`pnpm test:node` 23 文件 122 用例；`pnpm test` 27 文件 146 用例（含 M0 rhi/renderer 浏览器项目）。`core` gzip 约 130 KB（小于 150 KB）。
- [决策] `core` tsconfig 无 DOM：`fetch` / `URL` / `Worker` / `console` 用自建类型或注入；`Resource.fetchImpl`、`TaskProcessor` Worker 工厂、`ScreenSpaceEventHandler` EventTarget 可注入。
- [决策] URI 不用 urijs，用 `globalThis.URL`；`buildModuleUrl` 用 `setBaseUrl` 或 `CESIUM_BASE_URL`，不用 document / AMD。
- [决策] 视锥改 0..1 深度 + Reverse-Z（near→1，far→0）；`computeCullingVolume` 保持 Cesium。
- [决策] `FeatureDetection`：core 只留 endian / typed array / BigInt / WASM / Worker；WebGPU 仍在 `GpuDevice.probe()`。
- [变更] `Check.typeOf.*` 不能当 TS assertion function（TS2775）。`RuntimeError` 保留 `ErrorOptions`，`name` 为 `string`，兼容 rhi/renderer。
- [变更] `Iau2006XysData` 无 JSON 时 `computeXysRadians` 返回 `undefined`；EOP 无数据返回全 0。`DoubleEndedPriorityQueue` 用有序数组实现，API 对齐。多项式 / Simon1994 / IntersectionTests 顶部 `@ts-nocheck`。
- [变更] Matrix2/3/4 增加 `toFloat32Array`。`Iau2000Orientation.ComputeMoon` 保留 Cesium 原名。`loadAndExecuteScript`、`Credit`、`Packable*`、`createColorRamp`、`DistanceDisplayCondition` 未移植。
- [风险] 未整本搬运 Cesium Specs，覆盖为代表性单测。TaskProcessor / 输入无浏览器测试。ICRF 无本地 XYS 数据。

## 2026-09-13（第三轮：M0）

- [完成] M0 0.1–0.11 全部落地于分支 `feat/m0-scaffold`（未合并 `main`）：pnpm monorepo（`packages/{core,rhi,shaders,renderer,scene,widgets,webgpu-cesium}`、`apps/examples`、`tools/wgsl-plugin`）、工具链（TypeScript 6 strict、tsdown、Vite 8、Vitest 5 Node + 浏览器、Playwright、ESLint 10 flat + typescript-eslint、Prettier、Husky + lint-staged、Changesets、Apache-2.0 `LICENSE` / `NOTICE`、GitHub Actions）、`.wgsl` 导入插件、WGSL 组合器最小子集、`GpuDevice` + 四个缓存、最小 Render Graph + `RenderItem` + `FrameUniformsBuffer`、Vue 3 示例站与 `hello-triangle`、Playwright 截图基线。锁定版本见 [20-tech-stack/01](../20-tech-stack/01-tech-selection.md)「锁定版本」。
- [完成] 本机验证（Windows 11，有独显，Chrome for Testing）：`pnpm install` / `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm format:check` 通过；`pnpm test` 6 个文件 64 用例全绿，其中 rhi / renderer 浏览器项目在真实 WebGPU 适配器上执行（13 个可选 feature 全部命中白名单）；`pnpm e2e` 2 用例通过并生成 `hello-triangle-win32.png` 基线。
- [变更] Vitest 项目配置从文档所写的 `vitest.workspace.ts` 改为根 `vitest.config.ts` 的 `test.projects`：Vitest 4 起已移除 workspace 文件。回写 [20-tech-stack/01](../20-tech-stack/01-tech-selection.md)。
- [变更] `.wgsl` 插件按文件后缀匹配（`import x from "./foo.wgsl"`），不用文档原写的 `?wgsl` 查询串；TS 声明 `@webgpu-cesium/wgsl-plugin/client` 在根 `tsconfig.base.json` 全局引入。回写 [20-tech-stack/01](../20-tech-stack/01-tech-selection.md)。
- [变更] `FeatureDetection` 不再作为独立模块改写，M0 落地为 `GpuDevice.probe()` + `features.ts` 白名单。回写 [30-roadmap/02](../30-roadmap/02-cesium-module-inventory.md)。
- [决策] WGSL 内置函数命名：整文件 `#import`、不改名、靶向名 camelCase、按目录归属，不引入 `as` 前缀。写入 [10-architecture/04](../10-architecture/04-shader-system.md) 第 5 节。
- [决策] 浏览器测试与 E2E 用 Playwright `channel: "chromium"`（完整 Chrome for Testing 新 headless）：默认 `chrome-headless-shell` 没有 GPU 进程，`requestAdapter()` 返回 null。
- [决策] `docs/` 与 `.wgsl` 不经 Prettier（中文表格宽度计算失真；WGSL 由 wgsl-analyzer 格式化）；仓库统一 LF（`.gitattributes` + Prettier `endOfLine: lf`），`.wgsl` 插件与组合器都把 CRLF 归一为 LF，保证哈希与快照跨平台一致。
- [决策] `core` 的 `RuntimeError` / `DeveloperError` / `defined` / `Event` 为 M0 占位实现（带 TODO），M1 1.2 从 Cesium 移植替换。
- [风险] GitHub Actions 尚未首跑：Linux SwiftShader 能否拿到 WebGPU 适配器未知，浏览器测试与 E2E 在 CI 中设为 `continue-on-error`；E2E 基线只有 `-win32.png`，Linux 首跑需 `--update-snapshots` 生成 `-linux.png`。
- [风险] `PipelineCache` 键每次约 6.7 µs，几百个 RenderItem 每帧重算会到 ms 级；M2 起 RenderItem 需缓存已解析的 pipeline 键。
- [风险] 2d `drawImage` 无法从持续 rAF 渲染的 WebGPU canvas 读到像素（`getCurrentTexture` 替换绘制缓冲），E2E 像素断言改为只依赖 Playwright 截图对比；M2 的「缩放序列无黑瓦片」断言（2.13）需改用 `copyTextureToBuffer` 回读或暂停渲染后采样。

## 2026-09-13（第二轮）

- [对齐] 材质系统参考 three.js **经典属性式材质类层级**（`Material` 基类 + `MeshBasic / Standard / Physical / Line / Points / Sprite / Shader`），Cesium Fabric 与 Appearance 不移植；节点式材质（TSL 风格）列为后置 R&D。
- [对齐] 材质覆盖范围：图元与 glTF Model / 3D Tiles 统一使用，glTF PBR 映射到 `MeshPhysicalMaterial`，用户可覆写模型材质；Globe 地表保持专用着色器。
- [决策] ADR-0010 材质系统（已接受）；ADR-0003 补充「节点式材质后置，不改变手写 WGSL 结论」。
- [变更] 新增 [10-architecture/12-material-system.md](../10-architecture/12-material-system.md)；回写 README、00-vision、02-packages、04-shader-system、07-3dtiles、10-lighting、01-milestones（M4 加材质基础，M5 加 glTF 映射与覆写，M9 加线 / 点 / 精灵 / Shader 与 GIS 扩展材质）、02-inventory、60-references。
- [变更] 仓库接入：`git init -b main`，远端 `origin = https://github.com/Xiaobai-grow/webgpu-cesium.git`，首个提交推送到 `main`；新增根目录 `.gitignore` 与 `README.md`。分支与提交约定写入 [README.md](../README.md)「仓库信息」。

## 2026-09-13（第一轮）

- [对齐] 项目定位：在新仓库 `d:\code\webgpu-cesium` 用 TypeScript + WebGPU + WGSL 完全重写 CesiumJS 渲染与场景层，只从 Cesium 移植地理 / 数学 / 时间 / 3D Tiles / 地形 / 影像数据层；不兼容 WebGL；引入 Render Graph、GPU-driven、虚拟化、物理大气、真实云图体积云、天气系统等。
- [对齐] 本轮只产出 `docs/` 设计与进度文档，不写任何工程代码，不 `git init`，不改动 `d:\code\cesium`。
- [对齐] 从 Cesium 移植的数学 / 地理 / Tiles 模块保留类名与方法签名（含 `result` 参数模式），TS 化并保留 Apache-2.0 头。
- [决策] ADR-0001 新仓库重写而非原地迁移（已接受）。
- [决策] ADR-0002 仅 WebGPU，不兼容 WebGL，不支持 Compatibility mode（已接受）。
- [决策] ADR-0003 手写 WGSL + 组合器，不做 GLSL 转译（已接受）。
- [决策] ADR-0004 数学 / 地理 / Tiles 保留 Cesium 命名（已接受）。
- [决策] ADR-0005 Reverse-Z + 相机相对渲染，删除 log depth 与多视锥（已接受）。
- [决策] ADR-0006 Render Graph 组织帧（已接受）。
- [决策] ADR-0007 pnpm + tsdown + Vite + Vitest + Vue 3 示例站 + VitePress（已接受）。
- [决策] ADR-0008 大气用 Hillaire 2020，Bruneton 2017 为备选（已接受）。
- [决策] ADR-0009 云图数据源默认 NASA GIBS，接口 `WeatherMapProvider`（提议，M7 前确认）。
- [推翻] `d:\code\cesium\Documentation\WebGPU-Migration\`（2026-08-23 原地迁移方案，7 阶段、GLSL 转译、薄 Context 后端）被 ADR-0001 / ADR-0003 取代；fork 内 `Renderer/GpuDevice.js` 与 `FeatureDetection.supportsWebGPU` 不再推进。
- [完成] `docs/` 初版：README、00-vision（2）、10-architecture（11）、20-tech-stack（3）、30-roadmap（3）、40-decisions（README + 9 ADR）、50-progress（2）、60-references（1）。
- [风险] WebGPU 尚无 64 位原子、bindless、mesh shader：Nanite 式软光栅列为 R&D 轨道，不进入承诺路线（见 [11-virtualization.md](../10-architecture/11-virtualization.md)）。
- [风险] 真实云图分辩率（5–10 km）远低于渲染需要，需叠加程序噪声；实时静止卫星源需服务端，不做官方实现。

## 2026-08-23（历史，来自 cesium fork）

- [决策] 原地迁移方案阶段 0 / 1：文档 + `GpuDevice.js` + `supportsWebGPU`。已于 2026-09-13 被取代，保留于 fork 仓库作参考。
