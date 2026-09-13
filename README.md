# webgpu-cesium

用 TypeScript + WebGPU + WGSL 完全重写 [CesiumJS](https://github.com/CesiumGS/cesium) 的渲染引擎与场景层：只继承 Cesium 的地理、数学、时间、地形 / 影像、3D Tiles 数据层（保留原类名与 API），渲染管线、着色器、材质系统按 WebGPU 重新设计，不兼容 WebGL。

目标是在保持 Cesium 级 GIS 能力的同时，把视觉效果升级到现代实时渲染水准：Render Graph、Reverse-Z、延迟光照、物理大气与真实日月星、基于真实卫星云图的体积云、天气系统、three.js 风格材质、GPU-driven 与虚拟化。

## 状态

M0 完成：pnpm monorepo 脚手架、`GpuDevice` 设备初始化、WGSL 组合器、最小 Render Graph，示例站可渲染旋转三角形。路线图见 [docs/30-roadmap/01-milestones.md](docs/30-roadmap/01-milestones.md)，进度见 [docs/50-progress/PROGRESS.md](docs/50-progress/PROGRESS.md)。

## 开发

需要 Node 22 LTS 与 pnpm 10（`corepack enable`）。

```sh
pnpm install          # 安装依赖（会构建 tools/wgsl-plugin 并安装 git hooks）
pnpm dev              # 启动示例站 http://localhost:5173
pnpm build            # 构建 tools + packages 到各自 dist/
pnpm lint             # ESLint
pnpm typecheck        # 各包 tsc / vue-tsc
pnpm test             # Vitest：Node（core / shaders）+ 浏览器（rhi / renderer，需 Chromium + WebGPU）
pnpm e2e              # Playwright 示例站截图基线
```

仓库布局与包职责见 [docs/10-architecture/02-packages.md](docs/10-architecture/02-packages.md)。

## 文档

全部设计、技术选型、架构决策（ADR）与进度记录在 [docs/README.md](docs/README.md)。

## 浏览器要求

需要支持 WebGPU 的浏览器（Chrome / Edge / Firefox / Safari 26+ 稳定版）。不提供 WebGL 回退。

## 许可

Apache-2.0（与 CesiumJS 一致）。移植自 CesiumJS 的文件保留其原始版权声明。
