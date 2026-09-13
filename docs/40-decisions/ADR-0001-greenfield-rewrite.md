# ADR-0001：新仓库重写而非原地迁移

- 状态：已接受
- 日期：2026-09-13
- 相关文档：[00-vision/01-goals-and-scope.md](../00-vision/01-goals-and-scope.md)、[10-architecture/01-overview.md](../10-architecture/01-overview.md)
- 取代：`d:\code\cesium\Documentation\WebGPU-Migration\`（2026-08-23 的原地迁移方案，含其 ADR-0001 至 ADR-0006）

## 背景

2026-08-23 曾在 CesiumJS fork 内规划「原地迁移」：保留 `Context` / `DrawCommand` / `Texture` 等类型与调用点，在 `Context` 后面增加 WebGPU 后端，分 7 阶段替换实现，最终删除 WebGL。已完成阶段 0（文档）与阶段 1（`FeatureDetection.supportsWebGPU`、`Renderer/GpuDevice.js` 与 spec）。

用户于 2026-09-13 明确新方向：在新仓库用 TypeScript + WebGPU **完全重写**，只保留 Cesium 的地理、数学、3D Tiles 等数据层；不兼容 WebGL；引入 Render Graph、GPU-driven、虚拟化、物理大气、体积云等现代渲染概念；示例站与打包工具也全部换新。

## 候选方案

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| A. 原地迁移（旧方案） | 在 fork 内替换 `Context` 后端，保持 Scene / 图元不动 | 迁移期主分支可用；测试与 Sandcastle 复用 | 被 WebGL 状态模型、多视锥、log depth、GLSL uber-shader 绑住；无法引入 Render Graph / Reverse-Z / 延迟渲染而不重写 Scene；JS + JSDoc；Knockout widgets；gulp 构建 |
| B. 新仓库重写，移植数据层 | 新 monorepo，TS，从 Cesium 拷贝并 TS 化数学 / 地理 / Tiles 模块，渲染与场景层重新设计 | 架构自由；技术栈现代；包边界清晰；可裁剪 | 出球前有一段「无产品可用」期；移植量大（约 300 文件）；两套代码并存期间上游同步需手工 |
| C. Fork 内大重构 | 在 fork 内新建 `packages/engine-webgpu`，逐步替换 | 共享仓库与 CI | 与旧代码互相牵扯，删除 WebGL 需要漫长的废弃流程；构建工具受 gulp 束缚 |

## 决策

采用 B。新仓库 `d:\code\webgpu-cesium`；`d:\code\cesium` 只作为源码与 Specs 的移植来源与效果算法参考（`ThreeGeospatial`、`Extension/Ocean`、`GBuffer`），不再在其中推进 WebGPU 工作。

## 理由

- 用户目标包含 Render Graph、Reverse-Z、延迟渲染、GPU-driven、虚拟化，这些都要求场景层与渲染层同时重设计，原地迁移的「保留调用点」前提不成立。
- TS strict、pnpm、Vite、Vitest、Vue 3 与 Cesium 现有 gulp / Karma / Knockout 栈不可能渐进共存。
- 数据层（数学、地理、Tiles）与渲染无关，直接移植的成本可控且有 Specs 保障。

## 后果

- 旧文档 `Documentation/WebGPU-Migration/*` 保留作历史，标记为已取代；fork 内 `Renderer/GpuDevice.js` 的设计经验（异步初始化、保守描述符、无 GPU 时 skip 测试）沿用到新仓库 `rhi`。
- 需要建立移植脚本与移植清单（[30-roadmap/02](../30-roadmap/02-cesium-module-inventory.md)），并在每个移植文件保留 Apache-2.0 头。
- 出球（M2）之前没有可演示的地理产品；用 M0 三角形与 M1 测试通过作为阶段性验收。
- 上游 Cesium 的数据层修复需要手工同步，按 `CHANGES.md` 对照。
