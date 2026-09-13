# webgpu-cesium

用 TypeScript + WebGPU + WGSL 完全重写 [CesiumJS](https://github.com/CesiumGS/cesium) 的渲染引擎与场景层：只继承 Cesium 的地理、数学、时间、地形 / 影像、3D Tiles 数据层（保留原类名与 API），渲染管线、着色器、材质系统按 WebGPU 重新设计，不兼容 WebGL。

目标是在保持 Cesium 级 GIS 能力的同时，把视觉效果升级到现代实时渲染水准：Render Graph、Reverse-Z、延迟光照、物理大气与真实日月星、基于真实卫星云图的体积云、天气系统、three.js 风格材质、GPU-driven 与虚拟化。

## 状态

设计阶段。当前仓库只有设计文档，尚无工程代码。路线图见 [docs/30-roadmap/01-milestones.md](docs/30-roadmap/01-milestones.md)，进度见 [docs/50-progress/PROGRESS.md](docs/50-progress/PROGRESS.md)。

## 文档

全部设计、技术选型、架构决策（ADR）与进度记录在 [docs/README.md](docs/README.md)。

## 浏览器要求

需要支持 WebGPU 的浏览器（Chrome / Edge / Firefox / Safari 26+ 稳定版）。不提供 WebGL 回退。

## 许可

Apache-2.0（与 CesiumJS 一致）。移植自 CesiumJS 的文件保留其原始版权声明。
