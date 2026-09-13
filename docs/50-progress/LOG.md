# 变更日志

按日期倒序。标签：`[对齐]` `[决策]` `[变更]` `[推翻]` `[完成]` `[阻塞]` `[风险]`。

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
