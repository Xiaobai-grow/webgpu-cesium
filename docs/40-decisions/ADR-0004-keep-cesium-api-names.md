# ADR-0004：数学 / 地理 / Tiles 保留 Cesium 命名与签名

- 状态：已接受（用户于 2026-09-13 确认）
- 日期：2026-09-13
- 相关文档：[30-roadmap/02-cesium-module-inventory.md](../30-roadmap/02-cesium-module-inventory.md)

## 背景

数据层（数学、地理、时间、Provider、3D Tiles 解析）要从 Cesium 移植。API 风格有三种选择，影响移植方式、测试复用与用户学习成本。

## 候选方案

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| A. 保留 Cesium 类名与方法签名 | `Cartesian3.add(left, right, result)`、`Ellipsoid.WGS84`、`Transforms.eastNorthUpToFixedFrame` 原样 TS 化 | Specs 可直接移植；Cesium 用户零学习成本；`result` 参数模式无 GC 压力；上游修复易同步 | API 风格偏旧（静态方法 + result 参数）；TS 类型下 `result` 可选参数需要重载 |
| B. 全新 API（`Vec3` / `Mat4`、不可变值、无 result） | 现代、简洁 | Specs 全部重写；与 Cesium 生态（ion、CZML 概念、教程）割裂；GC 压力需另行优化 |
| C. 数学 / 地理保留，场景层全新 | 折中 | 场景层本来就重写（ADR-0001），与 A 实际一致 |

## 决策

A（等价于 C 的实际效果）。具体：

- `core` 与 `tiles` 中从 Cesium 移植的模块保留类名、静态方法名、参数顺序、`result` 参数约定、常量名（`Ellipsoid.WGS84`、`Cartesian3.ZERO`）、事件名。
- TS 化允许：增加类型注解与重载、把 `defaultValue` 换为默认参数、把 `Object.freeze` 常量声明为 `readonly`、把 `Check` 在生产构建剥离、拆分过大的文件、删除 WebGL 相关分支与 2D / Columbus 分支。
- 明确重新设计的部分（`Scene`、`Camera` 内部、`Globe` 渲染接口、`Model` 管线、Widgets）**不承诺**与 Cesium API 兼容；但对外属性名尽量沿用（`scene.globe.show`、`tileset.maximumScreenSpaceError`）以降低学习成本。
- 与 Cesium 存在行为差异的同名 API 必须在 TSDoc 中用 `@remarks` 标注差异（例如 `pickPosition` 变为异步）。

## 理由

- Cesium Specs 是数据层数值正确性的最佳保障，保留签名可直接移植。
- 目标用户熟悉 Cesium；数学层的 API 风格不是产品竞争点，渲染效果与性能才是。

## 后果

- 需要在每个移植文件保留 Apache-2.0 版权头。
- 需要维护「与 Cesium 的差异表」（M10 迁移指南）。
- `result` 参数模式要在 TS 中定义清晰：`static add(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3` 且 `result` 必填（Cesium 已在大部分 API 中要求必填）。
