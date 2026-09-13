# 架构决策记录（ADR）

一个 ADR 回答一个架构级问题。状态：`提议` / `已接受` / `已否决` / `已取代（见 ADR-xxxx）`。旧 ADR 不删除。

## 索引

| 编号 | 标题 | 状态 | 日期 |
| --- | --- | --- | --- |
| [ADR-0001](ADR-0001-greenfield-rewrite.md) | 新仓库重写而非原地迁移 | 已接受 | 2026-09-13 |
| [ADR-0002](ADR-0002-webgpu-only.md) | 仅 WebGPU，不兼容 WebGL | 已接受 | 2026-09-13 |
| [ADR-0003](ADR-0003-handwritten-wgsl.md) | 手写 WGSL + 组合器，不做 GLSL 转译 | 已接受 | 2026-09-13 |
| [ADR-0004](ADR-0004-keep-cesium-api-names.md) | 数学 / 地理 / Tiles 保留 Cesium 命名与签名 | 已接受 | 2026-09-13 |
| [ADR-0005](ADR-0005-reverse-z-rte.md) | Reverse-Z + 相机相对渲染取代 log depth 与多视锥 | 已接受 | 2026-09-13 |
| [ADR-0006](ADR-0006-render-graph.md) | 采用 Render Graph 组织帧 | 已接受 | 2026-09-13 |
| [ADR-0007](ADR-0007-monorepo-tooling.md) | pnpm workspaces + tsdown + Vite + Vitest | 已接受 | 2026-09-13 |
| [ADR-0008](ADR-0008-atmosphere-model.md) | 大气模型选择：Hillaire 2020 为主 | 已接受 | 2026-09-13 |
| [ADR-0009](ADR-0009-cloud-weather-data.md) | 云图数据源与 weather map 生成方式 | 提议 | 2026-09-13 |
| [ADR-0010](ADR-0010-material-system.md) | 材质系统参考 three.js 经典材质层级，节点式材质后置 | 已接受 | 2026-09-13 |

## 待立项的决策（预计在对应里程碑前补 ADR）

- 组合器实现：自研最小子集 vs 采用 `wesl`（M0 末）。
- 对象数据传递：动态偏移 uniform vs storage 实例数组（M2）。
- 透明渲染：排序前向 vs WBOIT 默认（M6）。
- 贴地几何实现方式（M9）。
- 节点式材质（TSL 风格）是否立项（M9 后）。
- 包作用域正式命名（M10 前）。

## 模板

```markdown
# ADR-XXXX：标题

- 状态：提议 | 已接受 | 已否决 | 已取代（见 ADR-YYYY）
- 日期：YYYY-MM-DD
- 相关文档：链接

## 背景

为什么需要这个决策；约束条件。

## 候选方案

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |

## 决策

选了什么，边界是什么。

## 理由

## 后果

正面与负面；需要跟进的工作；影响的文档与模块。
```
