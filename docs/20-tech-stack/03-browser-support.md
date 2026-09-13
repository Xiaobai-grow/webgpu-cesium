# 浏览器支持与降级策略

更新日期：2026-09-13。

## 1. 目标平台

| 平台 | 浏览器 | 支持级别 |
| --- | --- | --- |
| Windows 10 / 11（D3D12） | Chrome / Edge 稳定版 | 一级：全部功能，性能基线在此测量 |
| macOS（Metal） | Chrome / Edge 稳定版、Safari 26+ | 一级（Chrome）/ 二级（Safari：功能验证，部分可选 feature 缺失时回退） |
| Linux（Vulkan） | Chrome / Edge 稳定版、Firefox | 二级 |
| Windows | Firefox（141+ 已发布 WebGPU） | 二级 |
| Android（Vulkan） | Chrome | 三级：功能可用，质量预设自动降到 `low`；Compatibility mode 适配器不支持 |
| iOS / iPadOS | Safari 26+ | 三级 |

一级：CI 截图回归 + 性能基线。二级：手工验收 + 冒烟测试。三级：能跑通「出球 + 3D Tiles」示例即可。

## 2. 探测与错误

- 入口 `GpuDevice.create()`：
  1. `navigator.gpu` 不存在 → 抛 `RuntimeError("WebGPU is not supported by this browser")`；
  2. `requestAdapter()` 返回 null → 抛 `RuntimeError("No WebGPU adapter available")`（常见于被禁用的 GPU 或远程桌面）；
  3. 适配器为 compatibility mode（`adapter.isCompatibilityMode` 或缺少 `core-features-and-limits`）→ 抛错，说明不支持；
  4. `requestDevice()` 失败 → 抛错并附带 `adapter.info`（vendor / architecture / description）便于反馈。
- `widgets` 的 `<CesiumViewer>` 捕获以上错误，显示统一的「不支持 WebGPU」面板，包含浏览器建议与 `adapter.info`。
- **不降级到 WebGL**（ADR-0002）。

## 3. 质量分级

`QualityPreset`（`low / medium / high / ultra / auto`）影响：渲染分辩率比例、阴影级联数与分辩率、云分辩率与步数、AO / SSR 开关、TAA 或 FXAA、影像层数上限、3D Tiles `maximumScreenSpaceError`。

`auto` 依据：`adapter.info`（架构字符串识别集显 / 独显 / 移动）、`limits`、前 60 帧的 GPU 时间（timestamp-query 可用时）自适应。

## 4. 已知平台差异（需要回归的点）

- Safari：`timestamp-query`、`shader-f16`、部分压缩纹理 feature 差异；`copyExternalImageToTexture` 对 `VideoFrame` 支持。
- Firefox（wgpu）：可选 feature 集合与 Chrome 不同；错误消息格式不同（组合器错误行号映射需兼容）。
- Android：`maxTextureDimension2D` 可能为 8192 下限；虚拟纹理页池尺寸需按 limits 缩放；`rgba16float` 带宽敏感。
- HDR canvas（`toneMapping.mode = "extended"`）：仅部分平台 + HDR 显示器有效；探测 `getConfiguration()` 后回退。

## 5. 更新流程

浏览器支持变化时更新本文件与 [02-webgpu-capability-matrix.md](02-webgpu-capability-matrix.md)，并在 `50-progress/LOG.md` 记录 `[变更]`。
