# ADR-0002：仅 WebGPU，不兼容 WebGL

- 状态：已接受
- 日期：2026-09-13
- 相关文档：[20-tech-stack/02-webgpu-capability-matrix.md](../20-tech-stack/02-webgpu-capability-matrix.md)、[20-tech-stack/03-browser-support.md](../20-tech-stack/03-browser-support.md)

## 背景

Cesium 同时支持 WebGL 1 / 2，渲染抽象（`Context`、`RenderState`、GLSL 版本桥）都为此付出复杂度。WebGPU 已在 Chrome / Edge / Firefox / Safari 稳定版发布。用户要求「完全弃用 WebGL，也不考虑兼容 WebGL」。

## 候选方案

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| A. 双后端（WebGPU + WebGL 2 回退） | 覆盖旧浏览器 | 渲染抽象必须取两者交集：无 compute、无 storage buffer、无 indirect；Render Graph / GPU-driven / 虚拟化全部要写两份或被砍；着色器双语言 |
| B. 仅 WebGPU | 抽象层薄、能力全用、着色器单一语言 | 无 WebGPU 的环境无法运行 |
| C. WebGPU 为主 + 用 WebGL 实现的极简「兼容视图」 | 给旧浏览器一个静态地球 | 维护两套代码，收益低 |

## 决策

B。`GpuDevice.create()` 在无 WebGPU 时抛 `RuntimeError`，widgets 显示统一提示。不接受任何以 WebGL 兼容为目的的抽象层或 PR。也不支持 WebGPU Compatibility mode 的适配器（其限制会砍掉 `texture_2d_array` 层数、storage 纹理等本项目依赖的能力）。

## 理由

- 本项目的核心卖点（Render Graph、compute 驱动的大气 / 云 / 剔除、Reverse-Z、延迟渲染）都依赖 WebGPU 独有能力。
- 目标用户是新建项目，非 Cesium 老用户迁移；浏览器覆盖已足够。

## 后果

- 所有 API 可以直接暴露 WebGPU 类型（`GPUTextureFormat` 等），不需要自定义枚举镜像。
- 文档与示例站需要清楚说明浏览器要求。
- 引入任何依赖时检查其不依赖 WebGL（禁止 `three`、`babylon` 等双引擎）。
