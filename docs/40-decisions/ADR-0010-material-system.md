# ADR-0010：材质系统参考 three.js 经典材质层级，节点式材质后置

- 状态：已接受（用户于 2026-09-13 确认）
- 日期：2026-09-13
- 相关文档：[10-architecture/12-material-system.md](../10-architecture/12-material-system.md)、[ADR-0003](ADR-0003-handwritten-wgsl.md)

## 背景

Cesium 的材质由 Fabric（JSON 描述 + GLSL 片段拼接）与 Appearance（`MaterialAppearance`、`PerInstanceColorAppearance` 等）组成；glTF 模型材质则在 `Model` 管线内部解析，不对外暴露材质对象。用户评价 Cesium 材质「不好看」，要求参考 three.js 的材质系统。three.js 有两套体系：经典属性式材质类（`MeshStandardMaterial` 等）与 WebGPU 渲染器上的节点式材质（`NodeMaterial` / TSL）。

## 候选方案

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| A. 移植 Fabric + Appearance | 保持 Cesium 材质 API | 老用户熟悉 | 视觉上限低（无 PBR 扩展）；JSON 拼 GLSL 难类型化与反射；用户明确否定 |
| B. three.js 经典属性式材质类层级 | `Material` 基类 + `MeshBasic / Standard / Physical / Line / Points / Sprite / Shader` 等，用 WGSL 模块 + 条件编译实现 | 被广泛接受的心智模型；与 glTF PBR 扩展一一对应；实现成本可控；与 ADR-0003 一致 | 变体数需要控制；部分属性语义需为 GIS 调整 |
| C. TSL 节点式材质 | JS 节点图生成 WGSL | 表达力最强；可做材质编辑器 | 节点编译器成本高；推翻 ADR-0003 中的结论；首期不需要 |
| D. B 为主，C 后置 R&D | 经典材质 M9 落地；预留节点材质接口 | 兼顾落地速度与演进空间（three.js 自身也是这条路径） | 需要保证两者共享同一输出契约 |

## 决策

D。具体：

- 以 three.js 经典材质的类名、属性名、常量名（`FrontSide`、`NormalBlending`、`RepeatWrapping`、`SRGBColorSpace`…）为参考设计 `Material` 与 `Texture` 体系，细节见 [12-material-system.md](../10-architecture/12-material-system.md)。
- 覆盖范围：图元与 glTF Model / 3D Tiles 统一使用；glTF PBR 映射到 `MeshPhysicalMaterial`，用户可覆写；Globe 地表保持专用着色器，高程色带等作为地表覆盖层复用材质的 WGSL 模块。
- Cesium Fabric 内置材质以子类形式提供等价物（`GridMaterial`、`PolylineGlowMaterial`、`TerrainRampMaterial` 等），不做 DSL。
- 有意偏离 three.js 的点：`Texture.flipY` 默认 `false`（WebGPU 语义）；`LineBasicMaterial.linewidthUnits` 支持米；`PointsMaterial` / `SpriteMaterial` 加入 Cesium Billboard / PointPrimitive 的距离缩放与深度测试距离选项；深度比较常量在 Reverse-Z 下由 RHI 转换。
- 节点式材质：不在 M0–M10 承诺范围；经典材质与未来节点材质共享 `MaterialOutput` 契约与 group 2 布局；待经典材质稳定后另立 ADR。

## 理由

- three.js 材质是前端 3D 开发者最熟悉的材质 API，降低学习成本；其 `MeshPhysicalMaterial` 与 glTF `KHR_materials_*` 对齐，直接服务 3D Tiles 的视觉升级。
- 属性式材质用「结构性开关 → defines，数值 → uniform」即可实现，与 ADR-0003 的组合器方案自然契合。
- 节点式材质的主要价值在编辑器与高度自定义，不是首期目标。

## 后果

- ADR-0003 补充：节点式材质作为后置 R&D，不改变「手写 WGSL、首期不做节点图」的结论。
- `renderer` 包新增 `materials/` 与 `textures/` 目录；`shaders` 包新增 `materials/*.wgsl` 模块与七个 `onBeforeCompose` 接口点。
- 里程碑调整：M4 落地 `Material` / `Texture` 基类与 `MeshStandard / PhysicalMaterial`；M5 完成 glTF 映射与覆写钩子；M9 完成线 / 点 / 精灵 / Shader 材质与 GIS 扩展材质。
- Cesium `CustomShader` 的能力改由 `ShaderMaterial` 与 `onBeforeCompose` 提供。
- 移植清单中 `Appearance*`、`Material`（Fabric）行改为「改写为 three.js 风格材质」。
