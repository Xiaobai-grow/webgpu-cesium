# ADR-0006：采用 Render Graph 组织帧

- 状态：已接受
- 日期：2026-09-13
- 相关文档：[10-architecture/03-rhi-and-render-graph.md](../10-architecture/03-rhi-and-render-graph.md)、[10-architecture/01-overview.md](../10-architecture/01-overview.md)

## 背景

Cesium 的 `Scene.render` 硬编码 pass 顺序（环境 → 全球 → 地形分类 → 不透明 → 半透明 → 覆盖层 → 后处理），每加一个效果（阴影、OIT、地表透明、拾取深度）都要在 `Scene` / `View` 中插入分支与专用 framebuffer 管理类（`GlobeDepth`、`OIT`、`PickDepth`、`SceneFramebuffer`、`GlobeTranslucencyFramebuffer` 等）。本项目计划的 pass 数量更多（G-buffer、AO、阴影、大气 LUT、云、TAA、Bloom、拾取、反馈、Hi-Z），需要系统化方式管理顺序与瞬态资源。

## 候选方案

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| A. Render Graph（声明 pass 与资源，编译后执行） | 顺序由依赖决定；瞬态资源自动别名；效果可插拔；可导出可视化与计时 | 每帧声明有 CPU 开销；实现约 1–2k 行 |
| B. 固定 pass 列表 + 手动 framebuffer 管理（Cesium 现状） | 简单直接 | 扩展困难；资源生命周期手工管理易错 |
| C. 完整 Vulkan 风格帧图（含屏障、队列、异步 compute） | 通用 | WebGPU 无显式屏障与多队列，功能用不上 |

## 决策

A，但只保留三项功能：pass 裁剪与拓扑排序、瞬态资源生命期与别名、统一的 encoder / 描述符创建与计时。不做显式屏障、不做多队列。帧图结构做哈希缓存，结构不变时跳过重新编译。

## 理由

- 效果模块（`environment` 包）需要作为插件 pass 组注入，不能让每个效果都改 `Scene`。
- 瞬态资源（G-buffer、HDR、AO、云缓冲、阴影级联）数量多且尺寸随分辩率变化，手工管理不可靠。
- 调试与性能面板需要 pass 级结构信息。

## 后果

- M0 即实现最小帧图，M4 补全编译与别名。
- `Scene` 的职责缩小为「更新 + 收集 RenderItem + 声明帧图」。
- Pass 的执行函数只依赖 `PassContext`（encoder、已解析的资源、RenderItem 列表、帧 uniform），不直接接触 `GpuDevice`，便于测试。
