# WebGPU Cesium 重写：项目文档中心

本目录是整个项目的「唯一事实来源」：总体框架、架构、技术路线、选型、效果模型选择、里程碑、架构决策（ADR）与进度日志都在这里。代码只实现这里已经写明并被接受的设计；设计变更先改文档，再改代码。

- 源仓库：`d:\code\cesium`（CesiumJS 1.144.0 fork，Apache-2.0）
- 目标仓库：`d:\code\webgpu-cesium`（本仓库）
- 文档语言：中文；代码标识符、文件名、API 名保持英文
- 最近更新：见 [50-progress/LOG.md](50-progress/LOG.md)

## 仓库信息

- 远端：`https://github.com/Xiaobai-grow/webgpu-cesium.git`（`origin`）
- 主分支：`main`；功能分支 `feat/<里程碑>-<主题>`、修复分支 `fix/<主题>`，合并回 `main` 走 PR
- 提交信息：中文，Conventional Commits 前缀（`feat:` `fix:` `docs:` `refactor:` `perf:` `test:` `chore:`），例如 `docs: 补充材质系统设计`
- 每个里程碑完成时打 tag `m<N>`（如 `m2-first-globe`）并在 `LOG.md` 记录

## 一句话定位

以 CesiumJS 的地理、数学、时间、3D Tiles、地形/影像数据层为基础，用 TypeScript + WebGPU + WGSL 从零重建渲染引擎与场景层，不兼容 WebGL；在保持强 GIS 能力的同时，把视觉效果升级到现代实时渲染水平（物理大气、真实日月星、基于真实云图的体积云、天气系统、延迟光照、后处理、GPU-driven 与虚拟化）。

## 目录导航

### 00 愿景

| 文档 | 内容 |
| --- | --- |
| [00-vision/01-goals-and-scope.md](00-vision/01-goals-and-scope.md) | 目标 / 非目标、保留与弃用清单、与 Cesium 的关系与许可 |
| [00-vision/02-glossary.md](00-vision/02-glossary.md) | 术语表 |

### 10 架构

| 文档 | 内容 |
| --- | --- |
| [10-architecture/01-overview.md](10-architecture/01-overview.md) | 分层架构总图、一帧数据流 |
| [10-architecture/02-packages.md](10-architecture/02-packages.md) | monorepo 包划分、依赖方向、公开 API 边界 |
| [10-architecture/03-rhi-and-render-graph.md](10-architecture/03-rhi-and-render-graph.md) | WebGPU 薄封装（RHI）、Render Graph、资源生命周期、管线缓存 |
| [10-architecture/04-shader-system.md](10-architecture/04-shader-system.md) | WGSL 模块化、组合器、绑定布局约定、反射、命名规范 |
| [10-architecture/05-scene-camera-precision.md](10-architecture/05-scene-camera-precision.md) | 坐标系、相机、Reverse-Z、相机相对渲染（RTE） |
| [10-architecture/06-globe-terrain-imagery.md](10-architecture/06-globe-terrain-imagery.md) | 四叉树 / SSE、地形、影像图层、Worker 管线、虚拟纹理接口 |
| [10-architecture/07-3dtiles-and-model.md](10-architecture/07-3dtiles-and-model.md) | glTF 2.0、Model 管线阶段、3D Tiles 1.1、隐式瓦片、元数据、样式 |
| [10-architecture/08-atmosphere-sky-celestial.md](10-architecture/08-atmosphere-sky-celestial.md) | 大气模型、太阳 / 月亮 / 星空、时间驱动 |
| [10-architecture/09-clouds-and-weather.md](10-architecture/09-clouds-and-weather.md) | 体积云（真实云图）、天气系统、海洋 |
| [10-architecture/10-lighting-shadow-postfx.md](10-architecture/10-lighting-shadow-postfx.md) | 延迟光照、PBR / IBL、阴影、AO / SSR / SSGI、TAA、Bloom、HDR 输出 |
| [10-architecture/11-virtualization.md](10-architecture/11-virtualization.md) | UE5 概念（Nanite / 虚拟纹理 / 虚拟阴影 / GPU-driven）在 WebGPU 上的可行性与路线 |
| [10-architecture/12-material-system.md](10-architecture/12-material-system.md) | 材质系统：参考 three.js 经典材质类层级、`Texture`、GIS 扩展材质、glTF 映射、节点式材质 R&D |

### 20 技术栈

| 文档 | 内容 |
| --- | --- |
| [20-tech-stack/01-tech-selection.md](20-tech-stack/01-tech-selection.md) | 语言、包管理、构建、测试、文档、示例站的选型与备选 |
| [20-tech-stack/02-webgpu-capability-matrix.md](20-tech-stack/02-webgpu-capability-matrix.md) | WebGPU 核心 / 可选 feature 使用策略、未落地能力跟踪与回退 |
| [20-tech-stack/03-browser-support.md](20-tech-stack/03-browser-support.md) | 目标浏览器与降级策略 |

### 30 路线图

| 文档 | 内容 |
| --- | --- |
| [30-roadmap/01-milestones.md](30-roadmap/01-milestones.md) | M0–M10 里程碑：目标 / 范围 / 不做 / 验收 / 风险 / 依赖 |
| [30-roadmap/02-cesium-module-inventory.md](30-roadmap/02-cesium-module-inventory.md) | 从 Cesium 移植的模块清单与状态 |
| [30-roadmap/03-first-globe-checklist.md](30-roadmap/03-first-globe-checklist.md) | 「先把球加载出来」的最小闭环任务拆解（M0–M2） |

### 40 架构决策记录（ADR）

索引与模板见 [40-decisions/README.md](40-decisions/README.md)。

| 编号 | 标题 | 状态 |
| --- | --- | --- |
| [ADR-0001](40-decisions/ADR-0001-greenfield-rewrite.md) | 新仓库重写而非原地迁移 | 已接受 |
| [ADR-0002](40-decisions/ADR-0002-webgpu-only.md) | 仅 WebGPU，不兼容 WebGL | 已接受 |
| [ADR-0003](40-decisions/ADR-0003-handwritten-wgsl.md) | 手写 WGSL + 组合器，不做 GLSL 转译 | 已接受 |
| [ADR-0004](40-decisions/ADR-0004-keep-cesium-api-names.md) | 数学 / 地理 / Tiles 保留 Cesium 命名与签名 | 已接受 |
| [ADR-0005](40-decisions/ADR-0005-reverse-z-rte.md) | Reverse-Z + 相机相对渲染取代 log depth 与多视锥 | 已接受 |
| [ADR-0006](40-decisions/ADR-0006-render-graph.md) | 采用 Render Graph 组织帧 | 已接受 |
| [ADR-0007](40-decisions/ADR-0007-monorepo-tooling.md) | pnpm workspaces + tsdown + Vite + Vitest | 已接受 |
| [ADR-0008](40-decisions/ADR-0008-atmosphere-model.md) | 大气模型选择：Hillaire 2020 为主 | 已接受 |
| [ADR-0009](40-decisions/ADR-0009-cloud-weather-data.md) | 云图数据源与 weather map 生成方式 | 提议 |
| [ADR-0010](40-decisions/ADR-0010-material-system.md) | 材质系统参考 three.js 经典材质层级，节点式材质后置 | 已接受 |

### 50 进度

| 文档 | 内容 |
| --- | --- |
| [50-progress/PROGRESS.md](50-progress/PROGRESS.md) | 当前阶段、进行中 / 已完成 / 阻塞 |
| [50-progress/LOG.md](50-progress/LOG.md) | 按日期倒序的变更、对齐结论、需求变更、被推翻的决策 |

### 60 参考

| 文档 | 内容 |
| --- | --- |
| [60-references/papers-and-implementations.md](60-references/papers-and-implementations.md) | 论文、参考实现、规范提案链接 |

## 维护约定

### 何时更新哪份文档

| 事件 | 必须更新 |
| --- | --- |
| 需求或范围发生变化 | `00-vision/01-goals-and-scope.md`、`50-progress/LOG.md` |
| 做出或推翻一个架构级选择 | 新增或修改 `40-decisions/ADR-xxxx`，在 `40-decisions/README.md` 与本文件的 ADR 表登记，`LOG.md` 记一条 |
| 某个模块设计细化或被实现所修正 | 对应 `10-architecture/*`，把「待验证」项改为「已验证 / 已修正」 |
| 新增、完成、阻塞一个里程碑任务 | `50-progress/PROGRESS.md`；里程碑范围变化同时改 `30-roadmap/01-milestones.md` |
| 移植或弃用一个 Cesium 模块 | `30-roadmap/02-cesium-module-inventory.md` 状态列 |
| 引入或替换一个依赖 / 工具 | `20-tech-stack/01-tech-selection.md`，必要时 ADR |
| 发现 WebGPU 能力变化（新 feature 落地、浏览器支持变化） | `20-tech-stack/02-webgpu-capability-matrix.md`、`03-browser-support.md` |

### ADR 流程

1. 复制 `40-decisions/README.md` 中的模板，编号递增。
2. 状态取值：`提议` → `已接受` / `已否决`；被后续 ADR 取代时改为 `已取代（见 ADR-xxxx）`，不删除旧文件。
3. 一个 ADR 只回答一个问题；写清背景、候选、决策、理由、后果。
4. 影响公开 API 的 ADR 必须在里程碑验收时对照检查。

### 日志格式（`LOG.md`）

```
## 2026-09-13

- [对齐] 本轮只产出文档，不写代码。
- [决策] ADR-0003 手写 WGSL。
- [变更] 里程碑 M4 拆出大气部分。
- [推翻] 原地迁移方案（cesium fork 的 Documentation/WebGPU-Migration）被 ADR-0001 取代。
```

标签集合：`[对齐]` `[决策]` `[变更]` `[推翻]` `[完成]` `[阻塞]` `[风险]`。

### 架构文档的固定结构

`10-architecture/*` 每份文档都包含四节：**决策**（当前采用的方案）、**备选**（曾考虑但未采用的方案与原因）、**风险**、**待验证**（需要在某个里程碑前用代码或实验确认的假设）。实现阶段以「待验证」为实验清单。
