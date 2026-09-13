# ADR-0003：手写 WGSL + 组合器，不做 GLSL 转译

- 状态：已接受
- 日期：2026-09-13
- 相关文档：[10-architecture/04-shader-system.md](../10-architecture/04-shader-system.md)
- 取代：fork 内旧 ADR-0003（GLSL ES 3.00 为源、转译 WGSL）

## 背景

Cesium 有 641 个 GLSL 文件、`ShaderSource` / `ShaderBuilder` 运行期字符串拼装、91 个 `czm_*` 自动 uniform、`CustomShader` 与 Fabric 接受用户 GLSL。旧方案为了保留这些资产选择了转译。新方案（ADR-0001）不再保留 Scene / Renderer 层，着色器策略需重新决定。

## 候选方案

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| A. 手写 WGSL + 自研 / 社区组合器 | 按 WGSL 模块重写需要的着色器；`#import` / `#if` / `override` 组织变体 | 与 WebGPU 绑定模型、Reverse-Z、相机相对、G-buffer 直接匹配；调试直观；无 WASM 转译器 | 工作量：需重写约 100+ 模块；WGSL 缺少宏，需要组合器 |
| B. GLSL 源 + 运行期 / 构建期转译（naga / tint WASM） | 复用 Cesium GLSL | 起步快 | Cesium GLSL 深度依赖 WebGL 模型（`gl_FragDepth` log depth、多视锥、`uniform` 松散布局、纹理数组索引），转译后仍需大改；错误定位差；WASM 体积；`ShaderBuilder` 也要重写 |
| C. TSL 风格节点图生成 WGSL | JS 节点描述着色 | 强变体能力 | 实现成本高；对 GIS 特有着色无额外收益。另见 ADR-0010：节点式材质列为后置 R&D，不改变本 ADR 结论 |

## 决策

A。所有引擎着色器用 WGSL 手写，按 [04-shader-system.md](../10-architecture/04-shader-system.md) 的目录与绑定约定组织。组合器 M0 自研最小子集（`#import`、`#if`、规范化、行号映射），并跟踪 `wesl` 社区标准，若其 JS 实现成熟则迁移（另立 ADR）。用户自定义着色器只接受 WGSL。

Cesium GLSL 中的算法（八面体编码、椭球求交、RTE、SDF 文字、PBR 部分）作为逐函数对照重写的参考，不做机械翻译。

## 理由

- 本项目的渲染模型与 Cesium 差异大（Reverse-Z、延迟、storage 实例数据、group 绑定约定），GLSL 资产的可复用部分主要是数学函数，量不大。
- 手写 WGSL 才能利用 `override`、storage、compute、`subgroups`、`f16` 等能力。

## 后果

- M0 起就需要组合器与反射工具；这是着色器工作流的基础设施。
- 与 Cesium `CustomShader` / Fabric 不兼容，写入非目标；材质层用 three.js 风格类层级替代（ADR-0010），`ShaderMaterial` 与 `onBeforeCompose` 承担自定义着色。
- 需要 WGSL 代码规范与 `wgsl-analyzer` 接入 CI。
