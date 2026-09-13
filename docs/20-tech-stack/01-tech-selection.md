# 技术选型

对应 ADR-0007。每项列出：选择、备选、选择理由。版本号在 M0 脚手架时锁定并回写本表。

## 语言与模块

- **TypeScript（strict、`exactOptionalPropertyTypes`、`noUncheckedIndexedAccess`）**
  - 备选：JS + JSDoc（Cesium 现状）。
  - 理由：重写项目无历史包袱；WebGPU 类型（`@webgpu/types`）与反射生成的绑定类型能在编译期捕获大量错误。
- **ESM only，`"type": "module"`，`sideEffects: false`**
  - 备选：同时产出 CJS。
  - 理由：目标是浏览器与现代打包器；不支持 Node CJS 消费。
- **目标 `ES2022`**，不做旧浏览器转译（支持 WebGPU 的浏览器都支持 ES2022）。

## 仓库与包管理

- **pnpm workspaces**
  - 备选：npm workspaces（Cesium 用）、yarn、bun。
  - 理由：硬链接节省磁盘，严格依赖隔离，workspace 协议成熟。
- **任务编排：`pnpm -r --filter` + 简单脚本**；若包数 > 8 且构建时间显著再引入 Turborepo（备选：Nx）。
- **版本：Changesets**（fixed 模式，全部包同版本）。

## 构建

- **库：tsdown（Rolldown 内核）**
  - 备选：tsup（esbuild）、unbuild、Vite lib mode、纯 tsc。
  - 理由：tsdown 输出 ESM + `.d.ts` 一步完成，Rolldown 与 Vite 生态一致，支持多入口与 Worker 资源；tsup 是可靠回退。
- **应用（示例站 / 文档站）：Vite**（Rolldown 版 Vite 若稳定则统一）。
- **WGSL 资源**：自定义 Vite / Rolldown 插件 `?wgsl`（导入为字符串，开发模式 HMR 热更新着色器；生产模式可预组合常用变体）。
- **Worker**：`new Worker(new URL("./x.worker.ts", import.meta.url), { type: "module" })`，由 tsdown / Vite 打包成独立 chunk；库消费者的打包器需支持此约定（Vite / Rollup / webpack 5 / esbuild 均支持）。
- **WASM 依赖**：Draco、Basis / KTX2、meshoptimizer 用官方 WASM，作为独立资源按需加载（`buildModuleUrl` 约定保留，允许用户配置 base URL）。

## 测试

- **Vitest**
  - Node 环境：`core`、`shaders` 组合器与反射、`tiles` 解析层（从 Cesium Specs 移植的数值测试）。
  - 浏览器模式（`@vitest/browser` + Playwright provider，Chromium 带 `--enable-unsafe-webgpu` / 软件适配器）：`rhi`、`renderer` 的资源与 pass 测试。
  - 备选：Jasmine + Karma（Cesium 现状）。理由：Karma 已停止维护。
- **Playwright**：示例站截图回归（每个里程碑验收示例一张基线图，像素差异阈值按平台），E2E 交互（相机控制）。
- **GPU 无关的着色器测试**：组合器输出快照测试；`wgsl-analyzer` / `naga` CLI（WASM 或 Node 包）做离线 WGSL 语法校验，CI 不依赖 GPU。
- **CI 中的 WebGPU**：GitHub Actions Linux runner 用 Chromium SwiftShader（软件 WebGPU）跑冒烟；性能与截图回归在自托管有 GPU 的 runner（后置）。

## 代码质量

- **ESLint（flat config）+ typescript-eslint**；规则基线：`recommended-type-checked` + 项目自定义（禁止 `any` 外泄、禁止包间反向导入 `import/no-restricted-paths`）。
- **Prettier**（2 空格、无分号、按用户规则）；`.wgsl` 用 `wgsl-analyzer` 格式化（4 空格，对齐 Cesium GLSL 约定）。
- **Husky + lint-staged**：提交前 lint / format / typecheck 受影响包。
- **提交信息**：中文，Conventional Commits 前缀（`feat:` `fix:` `docs:` `refactor:` `perf:` `test:` `chore:`）。

## 文档

- **API 文档：TypeDoc**（TSDoc 标签 `@experimental` / `@beta` / `@public`），输出 Markdown 嵌入文档站。
  - 备选：Cesium 的 jsdoc 模板。理由：TS 原生。
- **文档站：VitePress**（本 `docs/` 设计文档 + 教程 + API）。
- **示例站：Vite + Vue 3 + TypeScript**，对标 Sandcastle：左侧示例列表、右侧 canvas、可编辑代码（Monaco）+ 运行；示例源码即测试用例（Playwright 遍历所有示例截图）。
  - 备选：复用 Cesium 新 Sandcastle（React）。理由：用户技术栈 Vue 3，且要与 widgets 共享组件。

## 运行时依赖（尽量少）

| 用途 | 选择 | 备选 / 说明 |
| --- | --- | --- |
| WebGPU 类型 | `@webgpu/types` | dev 依赖 |
| WGSL 反射 | `wgsl_reflect` | 若不足则自研子集 |
| 表达式解析（3D Tiles 样式） | `jsep`（Cesium 同款） | — |
| Draco 解码 | `draco3d` WASM | — |
| KTX2 / Basis | `ktx-parse` + Basis transcoder WASM | Cesium 的 `KTX2Transcoder` 逻辑 |
| meshoptimizer | `meshoptimizer` WASM | `EXT_meshopt_compression` 与 meshlet 生成 |
| 网格简化（离线工具） | `meshoptimizer` simplifier | Nanite-like R&D |
| 大数 / 日期 | 无（移植 Cesium `JulianDate`） | — |
| URI 处理 | `urijs`（Cesium 同款）或原生 `URL` | 优先原生，缺失功能时移植 Cesium 的 `getAbsoluteUri` 等 |
| 事件 | 移植 Cesium `Event` | 无第三方 |
| 地形 / 矢量数据 | 移植 Cesium 解析 | `earcut` 用于多边形三角化（Cesium 同款） |
| UI | Vue 3 | 仅 `widgets` 与示例站 |

禁止：任何直接依赖 WebGL 的第三方库；`three` / `babylon`（避免双引擎）。

## 运行时性能约束（写入 CI 基线，M2 起）

- 主线程每帧 JS 时间 < 4 ms（1080p，世界地形 + 影像）。
- 首帧到出球 < 2 s（本地瓦片服务）。
- 包体：`core` < 150 KB gzip；`webgpu-cesium` 聚合包（不含 WASM 与 LUT 资源）< 800 KB gzip。
