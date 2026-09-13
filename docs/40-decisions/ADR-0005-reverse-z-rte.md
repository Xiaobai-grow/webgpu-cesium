# ADR-0005：Reverse-Z + 相机相对渲染取代 log depth 与多视锥

- 状态：已接受
- 日期：2026-09-13
- 相关文档：[10-architecture/05-scene-camera-precision.md](../10-architecture/05-scene-camera-precision.md)

## 背景

Cesium 为解决全球尺度（近 1 m、远 1e7 m 以上）的深度精度，使用两套机制：多视锥切分（`FrustumCommands`，每帧把命令按距离分到多个视锥分别渲染并清深度）和对数深度（`czm_logDepth`，片元写深度，关闭 early-z）。两者渗透到 Scene、DrawCommand、几乎所有 GLSL、拾取、阴影与后处理。大坐标抖动则用 `EncodedCartesian3` 高低位拆分 + `czm_translateRelativeToEye` 处理。

WebGPU 提供 `depth32float` 深度附件（核心格式），NDC 深度范围 0..1，允许 Reverse-Z。

## 候选方案

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| A. Reverse-Z + `depth32float` + 单视锥 | 精度在近远两端都好；early-z 有效；阴影 / 拾取 / 后处理只有一张深度；实现简单 | 需要所有深度比较 `greater`、`depthBias` 反向、清除值 0；相机相对渲染仍必需 |
| B. 沿用 log depth + 多视锥 | 与 Cesium 一致 | 复杂度高；片元写深度关 early-z；多次清深度；WebGPU 下无收益 |
| C. Reverse-Z + 少量视锥（2 个） | 保险 | 没有证据表明单视锥不够；增加复杂度 |

## 决策

A。同时：

- 相机位置 f64 保留在 CPU；GPU 收到的视图矩阵平移为 0；瓦片 / 模型用「相机相对模型矩阵」，无中心点的顶点数据用高低位拆分。
- 投影矩阵由 `PerspectiveFrustum` 系列按 0..1 深度 + Reverse-Z 生成，可选无限远平面。
- 删除 `FrustumCommands`、`czm_logDepth`、`Scene.logarithmicDepthBuffer`、`farToNearRatio`、`frustumSplits`。

## 理由

- Reverse-Z + f32 在 near = 0.1 m 时，1e7 m 处的深度分辩率仍优于 24 位线性深度在 1 km 处的表现（浮点在接近 0 的区间指数密集，正好对应远处）。工业界（UE、Unity HDRP、Godot 4）均采用。
- 单张深度让阴影、GTAO、SSR、云合成、拾取的实现全部简化。

## 后果

- 所有 WGSL 深度相关函数在 `builtin/depth.wgsl` 集中实现；比较函数、清除值由 RHI 常量统一。
- 贴地几何、分类、`depthBias` 需要在 M3 / M9 重新标定（[05](../10-architecture/05-scene-camera-precision.md) 待验证）。
- `pickPosition` 的反投影用 Reverse-Z 公式且加回 f64 相机位置。
- 需要在 M2 用极端场景（相机 100 m 高、地形与建筑贴近）验证无 z-fighting，结果写回文档。
