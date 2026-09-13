# 进度

更新日期：2026-09-13

## 当前阶段

**设计阶段完成（含材质系统设计），仓库已初始化并推送到 GitHub，等待 M0 启动。** 本仓库目前只有 `docs/`、根 `README.md` 与 `.gitignore`，无工程代码。

## 里程碑状态

| 里程碑 | 状态 | 开始 | 完成 | 备注 |
| --- | --- | --- | --- | --- |
| 设计文档（本目录） | 完成 | 2026-09-13 | 2026-09-13 | 全部文档初版 + 材质系统设计（ADR-0010） |
| Git 仓库初始化与推送 | 完成 | 2026-09-13 | 2026-09-13 | `origin/main` |
| M0 脚手架 + 设备 + 三角形 | 未开始 | — | — | 下一步 |
| M1 core 移植 | 未开始 | — | — | 可与 M2 并行 |
| M2 球出现 | 未开始 | — | — | 见 [30-roadmap/03](../30-roadmap/03-first-globe-checklist.md) |
| M3 地形 | 未开始 | — | — | — |
| M4 Render Graph / 光照 / 大气 | 未开始 | — | — | — |
| M5 glTF / 3D Tiles | 未开始 | — | — | — |
| M6 阴影 / 后处理 / TAA / HDR | 未开始 | — | — | — |
| M7 云 / 天气 / 海洋 | 未开始 | — | — | ADR-0009 需先确认 |
| M8 GPU-driven / 虚拟纹理 | 未开始 | — | — | — |
| M9 图元 / Widgets | 未开始 | — | — | — |
| M10 文档站 / 发布 | 未开始 | — | — | — |

## 进行中

无。

## 阻塞

无。

## 下一步（M0 首批任务）

按 [30-roadmap/03-first-globe-checklist.md](../30-roadmap/03-first-globe-checklist.md) 的 0.1–0.11 执行。开始前需用户确认：

1. 包作用域是否沿用 `@webgpu-cesium/*`；
2. Node / pnpm 版本基线（建议 Node 22 LTS、pnpm 10）。

（仓库已初始化并推送：`https://github.com/Xiaobai-grow/webgpu-cesium.git`，主分支 `main`。）

## 待验证项汇总（跨文档）

M0：

- 最小 Render Graph 的 CPU 开销与代码量（[01](../10-architecture/01-overview.md)）
- tsdown 多包 + Worker + `.wgsl` 打包（[02](../10-architecture/02-packages.md)）
- `PipelineCache` 键哈希成本（[03](../10-architecture/03-rhi-and-render-graph.md)）
- 自研组合器 + `wgsl_reflect` 覆盖度（[04](../10-architecture/04-shader-system.md)）

M2：

- Reverse-Z 极端场景 z-fighting（[05](../10-architecture/05-scene-camera-precision.md)）
- 影像图集 bind group 切换与 256 layer 上限（[06](../10-architecture/06-globe-terrain-imagery.md)）
- 对象数据传递方式（动态偏移 vs storage）（[03](../10-architecture/03-rhi-and-render-graph.md)）

M4：

- 材质 group 2 反射布局与 uniform 重写策略成本（[12](../10-architecture/12-material-system.md)）

其余见各架构文档「待验证」节。
