# 变更日志

按日期倒序。标签：`[对齐]` `[决策]` `[变更]` `[推翻]` `[完成]` `[阻塞]` `[风险]`。

## 2026-09-13（第三轮：M0）

- [完成] M0 0.1–0.11 全部落地于分支 `feat/m0-scaffold`（未合并 `main`）：pnpm monorepo（`packages/{core,rhi,shaders,renderer,scene,widgets,webgpu-cesium}`、`apps/examples`、`tools/wgsl-plugin`）、工具链（TypeScript 6 strict、tsdown、Vite 8、Vitest 5 Node + 浏览器、Playwright、ESLint 10 flat + typescript-eslint、Prettier、Husky + lint-staged、Changesets、Apache-2.0 `LICENSE` / `NOTICE`、GitHub Actions）、`.wgsl` 导入插件、WGSL 组合器最小子集、`GpuDevice` + 四个缓存、最小 Render Graph + `RenderItem` + `FrameUniformsBuffer`、Vue 3 示例站与 `hello-triangle`、Playwright 截图基线。锁定版本见 [20-tech-stack/01](../20-tech-stack/01-tech-selection.md)「锁定版本」。
- [完成] 本机验证（Windows 11，有独显，Chrome for Testing）：`pnpm install` / `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm format:check` 通过；`pnpm test` 6 个文件 64 用例全绿，其中 rhi / renderer 浏览器项目在真实 WebGPU 适配器上执行（13 个可选 feature 全部命中白名单）；`pnpm e2e` 2 用例通过并生成 `hello-triangle-win32.png` 基线。
- [变更] Vitest 项目配置从文档所写的 `vitest.workspace.ts` 改为根 `vitest.config.ts` 的 `test.projects`：Vitest 4 起已移除 workspace 文件。回写 [20-tech-stack/01](../20-tech-stack/01-tech-selection.md)。
- [变更] `.wgsl` 插件按文件后缀匹配（`import x from "./foo.wgsl"`），不用文档原写的 `?wgsl` 查询串；TS 声明 `@webgpu-cesium/wgsl-plugin/client` 在根 `tsconfig.base.json` 全局引入。回写 [20-tech-stack/01](../20-tech-stack/01-tech-selection.md)。
- [变更] `FeatureDetection` 不再作为独立模块改写，M0 落地为 `GpuDevice.probe()` + `features.ts` 白名单。回写 [30-roadmap/02](../30-roadmap/02-cesium-module-inventory.md)。
- [决策] WGSL 内置函数命名：整文件 `#import`、不改名、靶向名 camelCase、按目录归属，不引入 `as` 前缀。写入 [10-architecture/04](../10-architecture/04-shader-system.md) 第 5 节。
- [决策] 浏览器测试与 E2E 用 Playwright `channel: "chromium"`（完整 Chrome for Testing 新 headless）：默认 `chrome-headless-shell` 没有 GPU 进程，`requestAdapter()` 返回 null。
- [决策] `docs/` 与 `.wgsl` 不经 Prettier（中文表格宽度计算失真；WGSL 由 wgsl-analyzer 格式化）；仓库统一 LF（`.gitattributes` + Prettier `endOfLine: lf`），`.wgsl` 插件与组合器都把 CRLF 归一为 LF，保证哈希与快照跨平台一致。
- [决策] `core` 的 `RuntimeError` / `DeveloperError` / `defined` / `Event` 为 M0 占位实现（带 TODO），M1 1.2 从 Cesium 移植替换。
- [风险] GitHub Actions 尚未首跑：Linux SwiftShader 能否拿到 WebGPU 适配器未知，浏览器测试与 E2E 在 CI 中设为 `continue-on-error`；E2E 基线只有 `-win32.png`，Linux 首跑需 `--update-snapshots` 生成 `-linux.png`。
- [风险] `PipelineCache` 键每次约 6.7 µs，几百个 RenderItem 每帧重算会到 ms 级；M2 起 RenderItem 需缓存已解析的 pipeline 键。
- [风险] 2d `drawImage` 无法从持续 rAF 渲染的 WebGPU canvas 读到像素（`getCurrentTexture` 替换绘制缓冲），E2E 像素断言改为只依赖 Playwright 截图对比；M2 的「缩放序列无黑瓦片」断言（2.13）需改用 `copyTextureToBuffer` 回读或暂停渲染后采样。

## 2026-09-13（第二轮）

- [对齐] 材质系统参考 three.js **经典属性式材质类层级**（`Material` 基类 + `MeshBasic / Standard / Physical / Line / Points / Sprite / Shader`），Cesium Fabric 与 Appearance 不移植；节点式材质（TSL 风格）列为后置 R&D。
- [对齐] 材质覆盖范围：图元与 glTF Model / 3D Tiles 统一使用，glTF PBR 映射到 `MeshPhysicalMaterial`，用户可覆写模型材质；Globe 地表保持专用着色器。
- [决策] ADR-0010 材质系统（已接受）；ADR-0003 补充「节点式材质后置，不改变手写 WGSL 结论」。
- [变更] 新增 [10-architecture/12-material-system.md](../10-architecture/12-material-system.md)；回写 README、00-vision、02-packages、04-shader-system、07-3dtiles、10-lighting、01-milestones（M4 加材质基础，M5 加 glTF 映射与覆写，M9 加线 / 点 / 精灵 / Shader 与 GIS 扩展材质）、02-inventory、60-references。
- [变更] 仓库接入：`git init -b main`，远端 `origin = https://github.com/Xiaobai-grow/webgpu-cesium.git`，首个提交推送到 `main`；新增根目录 `.gitignore` 与 `README.md`。分支与提交约定写入 [README.md](../README.md)「仓库信息」。

## 2026-09-13（第一轮）

- [对齐] 项目定位：在新仓库 `d:\code\webgpu-cesium` 用 TypeScript + WebGPU + WGSL 完全重写 CesiumJS 渲染与场景层，只从 Cesium 移植地理 / 数学 / 时间 / 3D Tiles / 地形 / 影像数据层；不兼容 WebGL；引入 Render Graph、GPU-driven、虚拟化、物理大气、真实云图体积云、天气系统等。
- [对齐] 本轮只产出 `docs/` 设计与进度文档，不写任何工程代码，不 `git init`，不改动 `d:\code\cesium`。
- [对齐] 从 Cesium 移植的数学 / 地理 / Tiles 模块保留类名与方法签名（含 `result` 参数模式），TS 化并保留 Apache-2.0 头。
- [决策] ADR-0001 新仓库重写而非原地迁移（已接受）。
- [决策] ADR-0002 仅 WebGPU，不兼容 WebGL，不支持 Compatibility mode（已接受）。
- [决策] ADR-0003 手写 WGSL + 组合器，不做 GLSL 转译（已接受）。
- [决策] ADR-0004 数学 / 地理 / Tiles 保留 Cesium 命名（已接受）。
- [决策] ADR-0005 Reverse-Z + 相机相对渲染，删除 log depth 与多视锥（已接受）。
- [决策] ADR-0006 Render Graph 组织帧（已接受）。
- [决策] ADR-0007 pnpm + tsdown + Vite + Vitest + Vue 3 示例站 + VitePress（已接受）。
- [决策] ADR-0008 大气用 Hillaire 2020，Bruneton 2017 为备选（已接受）。
- [决策] ADR-0009 云图数据源默认 NASA GIBS，接口 `WeatherMapProvider`（提议，M7 前确认）。
- [推翻] `d:\code\cesium\Documentation\WebGPU-Migration\`（2026-08-23 原地迁移方案，7 阶段、GLSL 转译、薄 Context 后端）被 ADR-0001 / ADR-0003 取代；fork 内 `Renderer/GpuDevice.js` 与 `FeatureDetection.supportsWebGPU` 不再推进。
- [完成] `docs/` 初版：README、00-vision（2）、10-architecture（11）、20-tech-stack（3）、30-roadmap（3）、40-decisions（README + 9 ADR）、50-progress（2）、60-references（1）。
- [风险] WebGPU 尚无 64 位原子、bindless、mesh shader：Nanite 式软光栅列为 R&D 轨道，不进入承诺路线（见 [11-virtualization.md](../10-architecture/11-virtualization.md)）。
- [风险] 真实云图分辩率（5–10 km）远低于渲染需要，需叠加程序噪声；实时静止卫星源需服务端，不做官方实现。

## 2026-08-23（历史，来自 cesium fork）

- [决策] 原地迁移方案阶段 0 / 1：文档 + `GpuDevice.js` + `supportsWebGPU`。已于 2026-09-13 被取代，保留于 fork 仓库作参考。
