# 进度

更新日期：2026-09-13

## 当前阶段

**M0 完成（分支 `feat/m0-scaffold`，待合并 `main`）。** 仓库已是 pnpm monorepo：7 个包 + `apps/examples` + `tools/wgsl-plugin`，示例站 `hello-triangle` 在 Chrome 中渲染随时间旋转的彩色三角形；Node / 浏览器测试与 Playwright 截图基线在本机（Windows，有 GPU）全绿。

## 里程碑状态

| 里程碑 | 状态 | 开始 | 完成 | 备注 |
| --- | --- | --- | --- | --- |
| 设计文档（本目录） | 完成 | 2026-09-13 | 2026-09-13 | 全部文档初版 + 材质系统设计（ADR-0010） |
| Git 仓库初始化与推送 | 完成 | 2026-09-13 | 2026-09-13 | `origin/main` |
| M0 脚手架 + 设备 + 三角形 | 完成 | 2026-09-13 | 2026-09-13 | 分支 `feat/m0-scaffold`；CI 首次运行待 push 后确认 |
| M1 core 移植 | 未开始 | — | — | 可与 M2 并行 |
| M2 球出现 | 未开始 | — | — | 见 [30-roadmap/03](../30-roadmap/03-first-globe-checklist.md) |
| M3 地形 | 未开始 | — | — | — |
| M4 Render Graph / 光照 / 大气 | 未开始 | — | — | — |
| M5 glTF / 3D Tiles | 未开始 | — | — | — |
| M6 阴影 / 后处理 / TAA / HDR | 未开始 | — | — | — |
| M7 云 / 天气 / 海洋 | 未开始 | — | — | ADR-0009 需先确认 |
| M8 GPU-driven / 虚拟纹理 | 未开始 | — | — | — |
| M9 图元 / Widgets | 未开始 | — | — | — |
| M10 文档站 / 发布 | 未开始 | — | — | — |

## M0 清单（[30-roadmap/03](../30-roadmap/03-first-globe-checklist.md) 0.1–0.11）

| # | 任务 | 状态 | 已验证 | 未验证 / 备注 |
| --- | --- | --- | --- | --- |
| 0.1 | 初始化 pnpm monorepo | 完成 | `pnpm install` / `pnpm lint` / `pnpm format:check` 通过 | — |
| 0.2 | 空包骨架 | 完成 | `pnpm build` 8 个包产出 `dist/index.js` + `index.d.ts` | `scene` / `widgets` 只有空 `index.ts` |
| 0.3 | Vitest 配置 | 完成 | Node 项目 core / shaders、浏览器项目 rhi / renderer；64 用例全绿（浏览器项目在真实 WebGPU 上执行） | 写法是 `vitest.config.ts` 的 `projects`（非 `vitest.workspace.ts`，见 LOG [变更]） |
| 0.4 | `.wgsl` 导入插件 | 完成 | Vite dev / build 与 tsdown 均可导入；CRLF → LF 归一 | HMR 只手动验证过一次（整页刷新），未写自动化 |
| 0.5 | 组合器最小子集 | 完成 | `#import` / `#if #elif #else #endif` / 规范化 / sourceMap / hash；快照 + 错误行号单测 | `override` 透传与选择性导入未做 |
| 0.6 | `GpuDevice.create()` | 完成 | 浏览器测试：创建 / feature 白名单 / configureCanvas / destroy / 无 `navigator.gpu` 文案 / adapter null 文案；compatibility 适配器抛错 | `onLost` 只有单测桩，未在真实设备丢失下验证 |
| 0.7 | `PipelineCache` 等缓存 | 完成 | 相同描述返回同一对象；`getRenderPipelineAsync`；`stableKey` 成本粗测 6.7 µs / 键 | — |
| 0.8 | 最小 Render Graph | 完成 | 单测：pass 顺序、未读 pass 被裁剪、循环依赖报错、导入 canvas 纹理 | 无瞬态资源别名（按设计留 M4） |
| 0.9 | 示例站骨架 | 完成 | `pnpm dev` 启动，浏览器打开渲染正常；`pnpm build:examples` 通过 | 无 Monaco 编辑器（M9） |
| 0.10 | Hello Triangle 示例 | 完成 | Playwright 基线 `apps/examples/e2e/__screenshots__/…/hello-triangle-win32.png`（冻结 `time = 1s`） | 只有 win32 基线，Linux CI 首次运行需生成 `-linux.png` |
| 0.11 | Husky + lint-staged + CI | 完成（CI 待首跑） | 本地 pre-commit 生效；`.github/workflows/ci.yml` 已写（lint / typecheck / Node 测试 / build 必过，浏览器测试 SwiftShader `continue-on-error`） | GitHub Actions 尚未跑过 |

## 进行中

无。

## 阻塞

无。

## 下一步

1. 用户审阅并合并 `feat/m0-scaffold` → `main`，观察 CI 首次运行（Linux SwiftShader 浏览器测试是否能拿到适配器）。
2. M1：`tools/port-cesium` 移植脚本 → 1.2 基础工具（替换 `core` 中 M0 的 `RuntimeError` / `DeveloperError` / `defined` / `Event` 占位实现）→ 1.3–1.8 数学 / 椭球 / 包围体 / 视锥 / 变换 / 瓦片方案。
3. M2 前：引入 `wgsl_reflect`，把 `FrameUniformsBuffer` 的手写偏移表改为反射生成并用单测锁定（2.3）。

## 待验证项汇总（跨文档）

M0（已关闭，结论见各文档「待验证」节）：

- [x] 最小 Render Graph 的 CPU 开销与代码量（[01](../10-architecture/01-overview.md)）
- [x] tsdown 多包 + `.wgsl` 打包（[02](../10-architecture/02-packages.md)）；Worker 打包顺延 M1
- [x] `PipelineCache` 键哈希成本（[03](../10-architecture/03-rhi-and-render-graph.md)）；几百个 RenderItem 排序提交顺延 M2
- [x] 自研组合器覆盖三角形与清屏（[04](../10-architecture/04-shader-system.md)）；`wgsl_reflect` 顺延 M2

M2：

- Reverse-Z 极端场景 z-fighting（[05](../10-architecture/05-scene-camera-precision.md)）
- 影像图集 bind group 切换与 256 layer 上限（[06](../10-architecture/06-globe-terrain-imagery.md)）
- 对象数据传递方式（动态偏移 vs storage）（[03](../10-architecture/03-rhi-and-render-graph.md)）
- 几百个 RenderItem 的排序 + 键查找 + 提交 < 1 ms（[03](../10-architecture/03-rhi-and-render-graph.md)）

M4：

- 材质 group 2 反射布局与 uniform 重写策略成本（[12](../10-architecture/12-material-system.md)）

其余见各架构文档「待验证」节。
