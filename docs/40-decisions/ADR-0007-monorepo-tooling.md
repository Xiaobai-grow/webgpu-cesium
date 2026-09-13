# ADR-0007：pnpm workspaces + tsdown + Vite + Vitest

- 状态：已接受
- 日期：2026-09-13
- 相关文档：[20-tech-stack/01-tech-selection.md](../20-tech-stack/01-tech-selection.md)、[10-architecture/02-packages.md](../10-architecture/02-packages.md)

## 背景

Cesium 使用 npm workspaces + gulp + esbuild + Karma / Jasmine + jsdoc + 自研 Sandcastle（近期改为 Vite + React）。本项目重写，工具链可自由选择；用户偏好 Vue 3 与现代打包器。

## 候选方案

| 领域 | 选择 | 备选 | 理由 |
| --- | --- | --- | --- |
| 包管理 | pnpm workspaces | npm / yarn / bun | 严格依赖、快速、workspace 协议 |
| 库构建 | tsdown（Rolldown） | tsup、unbuild、Vite lib、tsc | 一步产出 ESM + d.ts，多入口，与 Vite / Rolldown 生态一致；tsup 为回退 |
| 应用构建 | Vite | — | 示例站 / 文档站；`?wgsl` 插件与 HMR |
| 测试 | Vitest（Node + 浏览器模式 / Playwright） | Jasmine + Karma、Web Test Runner | Karma 停维；Vitest 与 Vite 共享配置 |
| E2E / 截图 | Playwright | Cypress | 与 Vitest 浏览器模式共用 |
| API 文档 | TypeDoc | jsdoc | TS 原生 |
| 文档站 | VitePress | Docusaurus | Vue 生态 |
| 示例站 | Vite + Vue 3 | 复用 Cesium Sandcastle（React） | 用户技术栈；与 widgets 共享 |
| 版本 | Changesets（fixed） | Lerna | 简单 |
| Lint / 格式 | ESLint flat + typescript-eslint + Prettier；`wgsl-analyzer` | Biome | Biome 对 TS 类型感知规则支持不足；后续可评估 |
| 提交 | Husky + lint-staged；Conventional Commits（中文） | — | — |

## 决策

采用上表「选择」列。包作用域暂定 `@webgpu-cesium/*`，正式发布前可另立 ADR 改名（需避免 Cesium 商标问题）。

## 理由

见表。核心是：单一 Vite / Rolldown 生态、TS 原生、浏览器测试可跑 WebGPU。

## 后果

- M0 锁定各工具版本并回写 [01-tech-selection.md](../20-tech-stack/01-tech-selection.md)。
- 需要自研 `?wgsl` 插件（几十行）与 Worker 打包约定验证。
- CI 需要能跑 Chromium + SwiftShader WebGPU 的镜像。
- 若 tsdown 在多包 + Worker + 资源上遇阻，回退 tsup，不改架构。
