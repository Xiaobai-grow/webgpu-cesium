# 先把球加载出来：M0–M2 最小闭环清单

目标画面：Chrome 中打开示例站「Globe / OSM」，看到贴着 OpenStreetMap 影像的地球，可用鼠标旋转、缩放、倾斜，从太空缩放到 100 m 高度过程中瓦片连续细化、无抖动、无缝、无黑块。

每项任务给出：产出、验收方式、依赖。任务粒度按「一次 PR 可完成」拆分。

## M0 脚手架与三角形

| # | 任务 | 产出 | 验收 | 依赖 |
| --- | --- | --- | --- | --- |
| 0.1 | 初始化 pnpm monorepo | `package.json` `pnpm-workspace.yaml` `tsconfig.base.json` `.editorconfig` `.prettierrc` `eslint.config.js` `.gitignore` `LICENSE` `NOTICE` | `pnpm install` 成功；`pnpm lint` 通过 | — |
| 0.2 | 空包骨架 | `packages/{core,rhi,shaders,renderer,scene,widgets,webgpu-cesium}` 各含 `package.json` `src/index.ts` `tsconfig.json` | `pnpm -r build` 产出 `dist/*.js` + `.d.ts` | 0.1 |
| 0.3 | Vitest 配置 | 根 `vitest.workspace.ts`：Node 项目（core / shaders）+ 浏览器项目（rhi / renderer，Playwright Chromium） | 一个空测试各跑通 | 0.2 |
| 0.4 | `?wgsl` 导入插件 | `tools/wgsl-plugin`：Vite 与 tsdown 共用，返回字符串，dev 下 HMR | 修改 `.wgsl` 浏览器自动刷新 | 0.2 |
| 0.5 | 组合器最小子集 | `shaders/src/compose`：`#import`、`#if/#else/#endif`、规范化、错误行号映射；单测 | 快照测试 | 0.2 |
| 0.6 | `GpuDevice.create()` | `rhi/src/GpuDevice.ts`：adapter / device / feature 探测 / canvas 配置 / `onLost` / `destroy`；`RuntimeError` 文案 | 浏览器测试通过；无 `navigator.gpu` 时测试 skip | 0.3 |
| 0.7 | `PipelineCache` + `BindGroupLayoutCache` + `SamplerCache` | 键哈希 + `Map`；`createRenderPipelineAsync` 预热 API | 单测：相同描述返回同一对象 | 0.6 |
| 0.8 | 最小 Render Graph | `renderer/src/graph`：`addPass`、资源句柄、外部导入 canvas、顺序执行；无别名 | 单测：pass 顺序、未读 pass 被裁剪 | 0.7 |
| 0.9 | 示例站骨架 | `apps/examples`：Vue 3 + Vue Router，左侧示例列表，右侧 canvas，每个示例是一个 `.ts` 文件导出 `run(canvas)` | `pnpm dev` 打开 | 0.1 |
| 0.10 | Hello Triangle 示例 | `FrameUniforms` 占位（时间）、一个 `RenderItem`、一个 pass；三角形随时间旋转 | Playwright 截图基线 | 0.5–0.9 |
| 0.11 | Husky + lint-staged + CI | GitHub Actions：install / lint / typecheck / test（Node）/ build；浏览器测试用 SwiftShader | CI 绿 | 0.3 |

## M1 core 移植（与 M2 并行推进，M2 只依赖其中标 * 的模块）

| # | 任务 | 模块 | 验收 | 状态 |
| --- | --- | --- | --- | --- |
| 1.1 | 移植脚本 | `tools/port-cesium`：从 `d:\code\cesium` 拷贝指定文件到目标包，加版权头，改扩展名，生成 TODO 列表 | 脚本可复跑 | 完成 |
| 1.2 * | 基础工具 | `defined` `Check` `DeveloperError` `RuntimeError` `destroyObject` `Frozen` `clone` `combine` `Event` `EventHelper` `Math` | Specs 通过 | 完成 |
| 1.3 * | 向量与矩阵 | `Cartesian2/3/4` `Cartographic` `Matrix2/3/4` `Quaternion` `HeadingPitchRoll` | Specs 通过 | 完成 |
| 1.4 * | 椭球与投影 | `Ellipsoid` `EllipsoidGeodesic` `EllipsoidTangentPlane` `scaleToGeodeticSurface` `GeographicProjection` `WebMercatorProjection` `Rectangle` | Specs 通过 | 完成 |
| 1.5 * | 包围体与相交 | `BoundingSphere` `OrientedBoundingBox` `AxisAlignedBoundingBox` `BoundingRectangle` `Plane` `Ray` `IntersectionTests` `CullingVolume` `Occluder` `EllipsoidalOccluder` | Specs 通过 | 完成 |
| 1.6 * | 视锥（改写） | `PerspectiveFrustum` `PerspectiveOffCenterFrustum` `OrthographicFrustum` `OrthographicOffCenterFrustum`：0..1 深度、Reverse-Z、无限远可选 | 新增 Spec：投影矩阵将 near 映射到 1、far 到 0；`computeCullingVolume` 与 Cesium 一致 | 完成 |
| 1.7 * | 变换 | `Transforms`（ENU、HPR、ICRF ↔ Fixed）`EncodedCartesian3` `TranslationRotationScale` | Specs 通过（ICRF 依赖 XYS 数据的用例可用本地数据） | 完成 |
| 1.8 * | 瓦片方案 | `TilingScheme` `GeographicTilingScheme` `WebMercatorTilingScheme` | Specs 通过 | 完成 |
| 1.9 | 时间 | `JulianDate` `GregorianDate` `LeapSecond` `TimeStandard` `TimeConstants` `Iso8601` `TimeInterval(Collection)` `Clock` 系列 | Specs 通过 | 完成 |
| 1.10 | 天体历表 | `Simon1994PlanetaryPositions` `Iau2006XysData` `EarthOrientationParameters` 系列 | Specs 通过 | 部分（无 XYS JSON / 无独立单测） |
| 1.11 * | 网络与调度 | `Resource` `Request` `RequestScheduler` `RequestType` `RequestState` `RequestErrorEvent` `TrustedServers` `Proxy` 及 URI 工具 | Specs 通过（`fetchImage` 改 `ImageBitmap`，用 mock） | 完成 |
| 1.12 * | Worker 调度 | `TaskProcessor`（`new URL` 约定）`createTaskProcessorWorker` | 浏览器测试：往返一个 typed array | 部分（可注入 factory，无浏览器往返） |
| 1.13 | 数据结构 | `Heap` `DoublyLinkedList` `Queue` `AssociativeArray` `ManagedArray` `binarySearch` `mergeSort` 等 | Specs 通过 | 完成 |
| 1.14 * | 编码与类型 | `AttributeCompression` `ComponentDatatype`（→ `GPUVertexFormat`）`IndexDatatype` `PrimitiveType` `Color` | Specs 通过 | 完成 |
| 1.15 * | 输入 | `ScreenSpaceEventHandler` `ScreenSpaceEventType` `KeyboardEventModifier` | 浏览器测试：合成事件 | 部分（模块已移植，无浏览器合成事件测试） |

## M2 球出现

| # | 任务 | 产出 | 验收 | 依赖 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 2.1 | `FrameState` + `Scene` 骨架 | `Scene({ canvas, device })`、`render(time)`、`preUpdate / postUpdate / preRender / postRender` 事件、`requestRenderMode`；稳定 `globe` pass + 动态 RenderItem | 空场景清屏；有 Globe 时出球 | 0.8, 1.2 | 完成 |
| 2.2 | `Camera`（改写） | 相机相对视图矩阵、Reverse-Z 投影、`setView` `lookAt` `flyTo`（`EasingFunction` + `TweenCollection`）`pickEllipsoid` | 单测：视图平移为 0；near→NDC 1 / far→0；`flyTo(duration=0)` | 1.3–1.7 | 完成 |
| 2.3 | `FrameUniforms` 填充器 | 视图 / 投影 / 逆矩阵、相机高低位、视口、时间；偏移表手写，单测锁定 `frame.wgsl` 成员顺序 | 未引入 `wgsl_reflect`（见 LOG） | 2.2, 0.5 | 完成（手写偏移） |
| 2.4 | `ScreenSpaceCameraController`（3D） | 左旋 / 右倾 / 滚轮缩放 / 惯性 / `minimumZoomDistance` / 椭球拾取旋转中心 | 示例站可操作；无 Cesium 输入录制回放 | 2.2, 1.15 | 部分 |
| 2.5 | 四叉树 | `QuadtreePrimitive` 等精简移植：SSE + 视锥 + 地平线；子瓦片未就绪回退本级 | 单测：0 级坐标、太空粗 LOD、近地细化 | 1.4, 1.5, 1.8 | 完成 |
| 2.6 | 无高程地形路径 | `EllipsoidTerrainProvider` 16×16 全零；`HeightmapTessellator` 主线程同步；`createVerticesFromHeightmap` 可给 Worker | 顶点数 256、索引 1350；默认不走 Worker | 1.12, 1.14 | 完成（同步细分） |
| 2.7 | `GlobeSurfaceTile` + `GlobeSurfaceTileProvider` | 网格上传、TileUniforms、`pipelineKey` 缓存、RenderItem | GPU 回读非全黑 | 2.5, 2.6 | 完成 |
| 2.8 | 影像层 | `UrlTemplate` / OSM / TMS / Grid / TileCoordinates、`ImageryLayer(Collection)`、DiscardPolicy | 非渲染单测：URL 展开、Credit、缓存 | 1.11 | 完成 |
| 2.9 | 影像图集 | `texture_2d_array` 分配 / 释放 / `copyExternalImageToTexture`；`reproject.wgsl` 已写未接线 | 主路径要求地形与影像 0 级瓦片数相同 | 0.6, 2.8 | 部分 |
| 2.10 | 地形着色器 | `globe/terrain.wgsl` RTE + Lambert + 图集；组合器 `override` 透传与顶层重名检查 | 组合器快照 | 0.5, 2.3 | 完成 |
| 2.11 | `Globe` 装配 | `Globe` + `Scene.globe` + `CesiumViewer`；示例 `hello-globe` | 示例站看见 OSM 地球 | 2.7–2.10 | 完成 |
| 2.12 | 性能面板（简版） | CPU 帧时间、瓦片数、RenderItem、pipeline | 画布左下角 | 2.11 | 完成 |
| 2.13 | Playwright 基线 | 太空 / 国家 / 城市三张截图；GPU 测试用 `copyTextureToBuffer` 断言非全黑 | 无 WebGPU 则 skip | 2.11 | 完成 |
| 2.14 | 精度验证 | 高空默认天底；RTE 高低位单测；未做 100 m 录屏抖动对比 | 见 [05](../10-architecture/05-scene-camera-precision.md) | 2.11 | 部分 |

## 完成定义

- 示例站「Globe / OSM」通过 2.13、2.14。
- `PROGRESS.md` 标记 M0–M2 完成；`02-cesium-module-inventory.md` 对应行状态改为「完成」。
- 架构文档 01–06 的「待验证」中标注 M0–M2 的项目已被验证或修正。
