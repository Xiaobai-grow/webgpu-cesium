# ADR-0008：大气模型选择：Hillaire 2020 为主，Bruneton 2017 为备选

- 状态：已接受
- 日期：2026-09-13
- 相关文档：[10-architecture/08-atmosphere-sky-celestial.md](../10-architecture/08-atmosphere-sky-celestial.md)

## 背景

Cesium 的 `SkyAtmosphere` 与 `GroundAtmosphere` 是简化的单次散射解析近似，加 `Fog` 做距离雾，视觉上限低。fork 中 `ThreeGeospatial/Atmosphere` 已有 Bruneton 2017 预计算实现（GLSL + 预计算 LUT 资源）。本项目要求物理大气、太阳月亮、并与体积云耦合。

## 候选方案

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| A. Hillaire 2020 | 透射率 LUT + 多次散射 LUT + 天空视图 LUT + 空气透视体纹理，全部 compute 实时 | 参数可实时改（行星、艺术化）；LUT 小；空气透视体纹理天然服务延迟光照与云；UE 生产验证 | 多次散射是近似（各向同性假设）；地平线附近参数化需注意 |
| B. Bruneton 2017 | 预计算 4D 散射 LUT | 多次散射精确；fork 有实现可对照 | 预计算慢，参数不可实时改；LUT 大（3D 256×128×32）；相机高度范围受参数化限制；与云耦合需额外工作 |
| C. 逐像素 ray-march 单次散射（Cesium 现状升级版） | 简单 | 无多次散射；成本随分辩率线性；质量不达标 |

## 决策

A 为默认实现（`HillaireAtmosphere`）。定义 `Atmosphere` 接口（参数、LUT 资源句柄、`getTransmittance()` / `getSkyRadiance()` / `getAerialPerspective()` 的 WGSL 模块契约），B 作为同接口的备选实现，仅在 A 出现不可接受的质量问题时启用，初期不实现。

## 理由

- 体积云、延迟光照、云阴影都需要「任意点透射率」与「视锥内散射」的低成本查询，Hillaire 的 LUT 组合正好提供。
- 实时参数（时间推进、行星切换、艺术化调色）是 GIS 可视化的常见需求。

## 后果

- M4 实现四张 LUT 的 compute 与天空 pass；LUT 尺寸列入待验证。
- 太阳颜色、IBL 环境图都从这套 LUT 派生，需要保持一致的单位（辐亮度）与曝光。
- 大气参数 API 保留 Cesium `Atmosphere` 的属性名（`lightIntensity`、`rayleighCoefficient`、`mieCoefficient`、`mieAnisotropy`、`rayleighScaleHeight`、`mieScaleHeight`、`hueShift` 等）并扩展臭氧与地面反照率。
