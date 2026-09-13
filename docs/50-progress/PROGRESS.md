# 进度

更新日期：2026-09-13

## 当前阶段

**M3 完成（分支 `feat/m3-terrain`，未合并 `main`）。** 自定义高度图山体 + 裙边 / 填洞 / `Globe.pick` / `getHeight` / 相机碰地 / Geographic↔Mercator 重投影；量化网格与 `CesiumTerrainProvider` 在 core 可加载（ion 需自备 token）。`hello-terrain?terrain=mars3d` 可测 mars3d 中国地形。M2 已合并 `main`（PR #3）。

## 里程碑状态

| 里程碑 | 状态 | 开始 | 完成 | 备注 |
| --- | --- | --- | --- | --- |
| 设计文档（本目录） | 完成 | 2026-09-13 | 2026-09-13 | 全部文档初版 + 材质系统设计（ADR-0010） |
| Git 仓库初始化与推送 | 完成 | 2026-09-13 | 2026-09-13 | `origin/main` |
| M0 脚手架 + 设备 + 三角形 | 完成 | 2026-09-13 | 2026-09-13 | 已合并 `main`（PR #1） |
| M1 core 移植 | 完成 | 2026-09-13 | 2026-09-13 | 已合并 `main`（PR #2） |
| M2 球出现 | 完成 | 2026-09-13 | 2026-09-13 | 已合并 `main`（PR #3） |
| M3 地形 | 完成 | 2026-09-13 | 2026-09-13 | 分支 `feat/m3-terrain`；未开 PR |
| M4 Render Graph / 光照 / 大气 | 未开始 | — | — | — |
| M5 glTF / 3D Tiles | 未开始 | — | — | — |
| M6 阴影 / 后处理 / TAA / HDR | 未开始 | — | — | — |
| M7 云 / 天气 / 海洋 | 未开始 | — | — | ADR-0009 需先确认 |
| M8 GPU-driven / 虚拟纹理 | 未开始 | — | — | — |
| M9 图元 / Widgets | 未开始 | — | — | — |
| M10 文档站 / 发布 | 未开始 | — | — | — |

## M0 清单（[30-roadmap/03](../30-roadmap/03-first-globe-checklist.md) 0.1–0.11）

| # | 任务 | 状态 | 已验证 | 未验证 / 备注 |
| --- | --- | --- | --- | --- |
| 0.1 | 初始化 pnpm monorepo | 完成 | `pnpm install` / `pnpm lint` / `pnpm format:check` 通过 | — |
| 0.2 | 空包骨架 | 完成 | `pnpm build` 产出 `dist/index.js` + `index.d.ts` | M2 起 `scene` / `widgets` 已实现 |
| 0.3 | Vitest 配置 | 完成 | Node 项目 core / shaders、浏览器项目 rhi / renderer；64 用例全绿（浏览器项目在真实 WebGPU 上执行） | 写法是 `vitest.config.ts` 的 `projects`（非 `vitest.workspace.ts`，见 LOG [变更]） |
| 0.4 | `.wgsl` 导入插件 | 完成 | Vite dev / build 与 tsdown 均可导入；CRLF → LF 归一 | HMR 只手动验证过一次（整页刷新），未写自动化 |
| 0.5 | 组合器最小子集 | 完成 | `#import` / `#if #elif #else #endif` / 规范化 / sourceMap / hash；快照 + 错误行号单测 | `override` 透传与选择性导入未做 |
| 0.6 | `GpuDevice.create()` | 完成 | 浏览器测试：创建 / feature 白名单 / configureCanvas / destroy / 无 `navigator.gpu` 文案 / adapter null 文案；compatibility 适配器抛错 | `onLost` 只有单测桩，未在真实设备丢失下验证 |
| 0.7 | `PipelineCache` 等缓存 | 完成 | 相同描述返回同一对象；`getRenderPipelineAsync`；`stableKey` 成本粗测 6.7 µs / 键 | — |
| 0.8 | 最小 Render Graph | 完成 | 单测：pass 顺序、未读 pass 被裁剪、循环依赖报错、导入 canvas 纹理 | 无瞬态资源别名（按设计留 M4） |
| 0.9 | 示例站骨架 | 完成 | `pnpm dev` 启动，浏览器打开渲染正常；`pnpm build:examples` 通过 | 无 Monaco 编辑器（M9） |
| 0.10 | Hello Triangle 示例 | 完成 | Playwright 基线 `apps/examples/e2e/__screenshots__/…/hello-triangle-win32.png`（冻结 `time = 1s`） | 只有 win32 基线，Linux CI 首次运行需生成 `-linux.png` |
| 0.11 | Husky + lint-staged + CI | 完成（CI 待首跑） | 本地 pre-commit 生效；`.github/workflows/ci.yml` 已写（lint / typecheck / Node 测试 / build 必过，浏览器测试 SwiftShader `continue-on-error`） | GitHub Actions 尚未跑过 |

## M1 清单（[30-roadmap/03](../30-roadmap/03-first-globe-checklist.md) 1.1–1.15）

| # | 任务 | 状态 | 已验证 | 未验证 / 备注 |
| --- | --- | --- | --- | --- |
| 1.1 | 移植脚本 | 完成 | `tools/port-cesium` `--list` / `--todo` / `--emit` | 机械草稿不能直接过 tsc，需手修 |
| 1.2 | 基础工具 | 完成 | Event / CesiumMath / Check 等 Node 单测 | `Check.typeOf` 不能当 assertion function（TS2775） |
| 1.3 | 向量与矩阵 | 完成 | `Cartesian3` / `Cartographic` 代表单测 | 未整本搬运 Cesium Specs |
| 1.4 | 椭球与投影 | 完成 | Ellipsoid / Geodesic / Rhumb / TangentPlane / Rectangle / 投影单测 | — |
| 1.5 | 包围体与相交 | 完成 | BoundingSphere / Ray / IntersectionTests 代表单测 | OBB / Occluder 无独立 Spec |
| 1.6 | 视锥 Reverse-Z | 完成 | `bounds.test.ts`：near→NDC 1、far→0；无限远；6 平面裁剪体 | 真机 z-fighting 留 M2 |
| 1.7 | 变换 | 完成 | Transforms ENU、EncodedCartesian3 | ICRF 无 XYS/EOP 数据时返回 `undefined` |
| 1.8 | 瓦片方案 | 完成 | Geographic / WebMercator TilingScheme 单测 | — |
| 1.9 | 时间 | 完成 | JulianDate / Clock / TimeInterval 单测 | — |
| 1.10 | 天体历表 | 部分 | 模块已导出；无数据时 EOP 全 0、XYS `undefined` | 未提交 XYS JSON；无独立历表单测 |
| 1.11 | 网络与调度 | 完成 | Resource / URI 单测；可注入 `fetch` | 不用 urijs / XHR / JSONP |
| 1.12 | Worker 调度 | 完成 | `TaskProcessor` + 可注入 factory；M3 浏览器 typed array 往返 | — |
| 1.13 | 数据结构 | 完成 | `mergeSort` 单测；Heap / Queue / 链表等已移植 | `Packable*` 未移植 |
| 1.14 | 编码与类型 | 完成 | Color / srgbToLinear 单测；`ComponentDatatype` → `GPUVertexFormat` 名 | `createColorRamp` / `DistanceDisplayCondition` 留 M9 |
| 1.15 | 输入 | 部分 | `ScreenSpaceEventHandler` 可注入 EventTarget | 无合成事件浏览器测试 |

## M2 清单（[30-roadmap/03](../30-roadmap/03-first-globe-checklist.md) 2.1–2.14）

| # | 任务 | 状态 | 已验证 | 未验证 / 备注 |
| --- | --- | --- | --- | --- |
| 2.1 | FrameState + Scene | 完成 | 清屏 + `globe` pass；`requestRenderMode` | — |
| 2.2 | Camera Reverse-Z / RTE | 完成 | 视图平移 0；near→1 / far→0；`flyTo(0)`；`pickEllipsoid` | 高空须天底 |
| 2.3 | FrameUniforms | 完成 | 矩阵 + `cameraPositionHigh/Low`；成员顺序单测 | 未引入 `wgsl_reflect` |
| 2.4 | SSCC 3D | 部分 | 左旋 / 右倾 / 滚轮 / 惯性 | 无 Cesium 输入录制对比 |
| 2.5 | 四叉树 | 完成 | 0 级坐标、太空 / 近地 LOD | 非 1:1 移植 |
| 2.6 | 零高度地形 | 完成 | 256 顶点 / 1350 索引 | M3 起可选裙边；默认同步 |
| 2.7 | GlobeSurfaceTile | 完成 | GPU 上传 + RenderItem `pipelineKey` | — |
| 2.8 | 影像层 | 完成 | URL 模板、OSM Credit、Grid | `SingleTile` 未做 |
| 2.9 | 图集 | 完成 | `texture_2d_array` 上传；M3 接 `reproject.wgsl` | GPU 失败回退 CPU |
| 2.10 | 地形着色器 | 完成 | 组合器快照；RTE + Lambert | 单层，无 `override` 层数 |
| 2.11 | Globe + 示例 | 完成 | `hello-globe` 看见 OSM 地球 | 地形用 WebMercator 对齐 OSM |
| 2.12 | 性能面板 | 完成 | CPU / 瓦片 / items / pipelines | — |
| 2.13 | Playwright + 回读 | 完成 | GPU `copyTextureToBuffer` 非全黑；三视角 e2e | 无 WebGPU 则 skip |
| 2.14 | 精度 100 m | 部分 | RTE 编码单测 | 无 100 m 录屏抖动 |

## M3 清单（自列；first-globe checklist 无 M3 表）

| # | 任务 | 状态 | 已验证 | 未验证 / 备注 |
| --- | --- | --- | --- | --- |
| 3.1 | 高度图裙边 / interpolate / upsample | 完成 | `HeightmapTessellator` + `m3-terrain.test.ts` | 无裙边时仍 256 / 1350 |
| 3.2 | quantized-mesh 解析与网格 | 完成 | 编解码夹具 + `createVerticesFromQuantizedTerrainMesh` | 顶点仍 5-float，法线只留 CPU |
| 3.3 | QM upsample | 完成 | 上采样为 17×17 `HeightmapTerrainData` | **偏离** Cesium 再编码 QM |
| 3.4 | `sampleTerrain` / `MostDetailed` | 完成 | 与 `positionToTileXY` 瓦片矩形对照 | 失败高度为 NaN |
| 3.5 | `TileAvailability` / `VerticalExaggeration` / ATH | 完成 | 可用性四叉树；ATH 可注入表 | 不捆绑 Cesium 大 JSON |
| 3.6 | `TerrainPicker` | 完成 | 射线–三角形 | 无增量 BVH |
| 3.7 | `CustomHeightmapTerrainProvider` | 完成 | hello-terrain 高斯丘 | — |
| 3.8 | `CesiumTerrainProvider` / World Terrain / Bathymetry | 完成 | mock layer.json + 合成 QM；mars3d 形态 mock | 示例连 ion 需 token；mars3d 见 `?terrain=mars3d` |
| 3.9 | `Ion` / `IonResource` | 完成 | endpoint / credits 单测 | 无默认 token |
| 3.10 | ArcGIS 高程 | 部分 | `fromUrl` 元数据 | **无 LERC 解码** |
| 3.11 | `Cesium3DTilesTerrainProvider` | 未做 | — | 可选，未启动 |
| 3.12 | 地形 Worker | 完成 | 注入后 `createMesh` 走 TaskProcessor；`core-browser` 往返 | 默认同步 |
| 3.13 | `TerrainFillMesh` | 完成 | 9×9 常数高 + 裙边 | 非邻边缝合 |
| 3.14 | `Globe.pick` / `getHeight` | 完成 | Node 插值 / 射线单测 | — |
| 3.15 | 相机碰地 | 完成 | `clampCameraToTerrain` | 无 Cesium 输入录制对比 |
| 3.16 | Geographic↔Mercator 重投影 | 完成 | UV 单测；hello-terrain Geographic + OSM | GPU `rgba8unorm` storage 失败则 CPU |
| 3.17 | `hello-terrain` 示例 | 完成 | 示例站山体可见；`?terrain=mars3d` 中国地形 | e2e 用 `?imagery=grid`，不打外网地形 |
| 3.18 | inventory 中 WMS/WMTS/Bing/Ion 影像 | 未做 | — | 超出里程碑正文 |

## 进行中

无。

## 阻塞

无。

## 下一步

1. 审阅 `feat/m3-terrain`，**不要合并 main**，按需开 PR。
2. M4：Render Graph 完整化、G-buffer、延迟光照、大气；不要为反射上 `wgsl_reflect` 除非 M4 明确要求。
3. 补 ion 世界地形山区截图（需 token）；LERC；贴地 `depthBias`（M9）。本地可用 `http://localhost:5173/#/examples/hello-terrain-china?terrain=mars3d` 看四姑娘山一带山地。

## 待验证项汇总（跨文档）

M0（已关闭，结论见各文档「待验证」节）：

- [x] 最小 Render Graph 的 CPU 开销与代码量（[01](../10-architecture/01-overview.md)）
- [x] tsdown 多包 + `.wgsl` 打包（[02](../10-architecture/02-packages.md)）
- [x] `PipelineCache` 键哈希成本（[03](../10-architecture/03-rhi-and-render-graph.md)）；几百个 RenderItem 排序提交顺延 M2
- [x] 自研组合器覆盖三角形与清屏（[04](../10-architecture/04-shader-system.md)）；`wgsl_reflect` 顺延 M2

M1（已关闭）：

- [x] `core` 在 Vitest Node 零 DOM 跑通代表单测（[02](../10-architecture/02-packages.md)）
- [x] Reverse-Z 投影矩阵 near→1 / far→0（[05](../10-architecture/05-scene-camera-precision.md) 数值部分）
- [x] Worker `new URL()` 浏览器打包与 typed array 往返（M3 `core-browser` 已关闭）

M2（已关闭，结论见各文档「待验证」节）：

- [x] 稳定 pass + 动态 RenderItem（[01](../10-architecture/01-overview.md)）
- [x] `RenderItem.pipelineKey` + 每瓦片 uniform（[03](../10-architecture/03-rhi-and-render-graph.md)）
- [x] 组合器 `override` / 重名；地形单层 pipeline（[04](../10-architecture/04-shader-system.md)）
- [x] Reverse-Z + RTE；高空须天底（[05](../10-architecture/05-scene-camera-precision.md)）
- [x] 图集上传 + `copyTextureToBuffer`（[06](../10-architecture/06-globe-terrain-imagery.md)）

M3（已关闭，结论见各文档「待验证」节）：

- [x] Reverse-Z 真地形沿用 M2 深度与 RTE；成千瓦片成本未测（[05](../10-architecture/05-scene-camera-precision.md)）
- [x] 仍用每瓦片 uniform，未上动态偏移 / storage（[03](../10-architecture/03-rhi-and-render-graph.md)）
- [x] Geographic↔Mercator 重投影接线；Worker 默认同步、可注入（[06](../10-architecture/06-globe-terrain-imagery.md)）

M4：

- 材质 group 2 反射布局与 uniform 重写策略成本（[12](../10-architecture/12-material-system.md)）

其余见各架构文档「待验证」节。
