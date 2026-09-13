# 包划分与依赖

## 决策

### 仓库布局

```
webgpu-cesium/
  docs/                      本文档体系
  packages/
    core/                    @webgpu-cesium/core
    rhi/                     @webgpu-cesium/rhi
    shaders/                 @webgpu-cesium/shaders
    renderer/                @webgpu-cesium/renderer
    tiles/                   @webgpu-cesium/tiles
    environment/             @webgpu-cesium/environment
    scene/                   @webgpu-cesium/scene
    widgets/                 @webgpu-cesium/widgets
    webgpu-cesium/           聚合包（re-export 全部，方便 CDN / 快速上手）
  apps/
    examples/                Vite + Vue 3 示例站（对标 Sandcastle）
    website/                 VitePress 文档站（嵌入 TypeDoc 输出）
  tools/
    wgsl-compose/            WGSL 组合器 CLI 与 Vite 插件（若不放进 shaders 包）
    port-cesium/             从 d:\code\cesium 拷贝并转换文件的辅助脚本
  test-data/                 小体积测试数据（地形瓦片、glTF、tileset.json）
```

### 各包职责与公开 API 边界

| 包 | 职责 | 公开 API（示例） | 不允许依赖 |
| --- | --- | --- | --- |
| `core` | 数学、地理、时间、几何生成、请求与调度、Worker 任务、错误类型 | `Cartesian3` `Matrix4` `Ellipsoid` `Cartographic` `Rectangle` `BoundingSphere` `Transforms` `JulianDate` `Clock` `GeographicTilingScheme` `WebMercatorTilingScheme` `Resource` `RequestScheduler` `TaskProcessor` `Event` `defined` `DeveloperError` | DOM（除 `fetch` / `Worker` 通过注入）、WebGPU 类型、其他包 |
| `rhi` | `GpuDevice` 初始化与能力探测；`Buffer` `Texture` `Sampler` `ShaderModule` 的创建、上传、销毁；pipeline / bind group layout / bind group 缓存；staging 读回；timestamp 查询；标签与调试 | `GpuDevice.create()` `GpuBuffer` `GpuTexture` `PipelineCache` `BindGroupCache` `readbackBuffer()` `GpuTimer` | `renderer` 以上任何包 |
| `shaders` | WGSL 模块源码；组合器（`#import` / `#if` / `override`）；反射（从 WGSL 提取 bind group 布局、顶点属性）；命名规范检查 | `composeShader()` `reflectShader()` `builtin/*.wgsl` | `rhi`（组合器是纯字符串处理） |
| `renderer` | Render Graph；Pass 基类；RenderItem；材质与纹理对象（three.js 风格，见 [12](12-material-system.md)）；光照（clustered、IBL）；阴影；后处理栈；拾取 pass | `RenderGraph` `Pass` `RenderItem` `Material` `MeshBasicMaterial` `MeshStandardMaterial` `MeshPhysicalMaterial` `LineBasicMaterial` `LineDashedMaterial` `PointsMaterial` `SpriteMaterial` `ShaderMaterial` `ShadowMaterial` GIS 扩展材质 `Texture` `CubeTexture` `DataTexture` `CompressedTexture` `VideoTexture` `PostProcessStack` `ShadowSettings` | `scene` `tiles` `environment` |
| `tiles` | glTF 2.0 解析与资源上传；Model 管线阶段；3D Tiles 数据集、遍历、缓存、隐式瓦片、元数据、样式、要素；Draco / KTX2 / meshopt Worker | `Model` `Cesium3DTileset` `Cesium3DTile` `Cesium3DTileStyle` `ImplicitTileset` `MetadataSchema` `GltfLoader` | `scene` |
| `environment` | 大气 LUT 与天空、日月星、体积云与 weather map、天气粒子、海洋 | `Atmosphere` `Sky` `SunMoon` `StarField` `VolumetricClouds` `WeatherSystem` `Ocean` | `scene` |
| `scene` | `Scene`、`FrameState`、`Camera`、`ScreenSpaceCameraController`、`Globe`（四叉树 + 地形 + 影像）、图元集合（Polyline / Polygon / Billboard / Label / Point）、拾取 API、时间与光照编排 | `Scene` `Camera` `Globe` `ImageryLayer` `ImageryLayerCollection` `Terrain` `PrimitiveCollection` `pick()` `pickPosition()` | `widgets` |
| `widgets` | Vue 3 组件：`Viewer` 容器、时间轴、动画控件、图层选择器、导航帮助、全屏、性能面板 | `<CesiumViewer>` `<Timeline>` `<LayerPicker>` `useViewer()` | 无（顶层） |
| `webgpu-cesium` | 聚合 re-export | 全部 | — |

### 分包原则

- **按变化频率与依赖方向切**：`core` 最稳定，`environment` 与 `widgets` 最活跃。
- **按可测试性切**：`core`、`shaders` 组合器、`tiles` 解析层可在 Node（Vitest）纯逻辑测试；`rhi`、`renderer` 用 Vitest 浏览器模式。
- **效果可裁剪**：不引入 `environment` 时，包体不含大气与云的 WGSL 与 LUT 资源。
- **Worker 归属**：Worker 入口放在使用它的包内（`tiles/workers/decodeDraco.ts`、`scene/workers/createVerticesFromQuantizedTerrainMesh.ts`），调度器 `TaskProcessor` 在 `core`。Worker 打包由 Vite / tsdown 的 `new Worker(new URL(..., import.meta.url))` 约定处理。

### 版本与发布

- 全部包同版本号（fixed versioning），用 Changesets 生成 changelog。
- 0.x 阶段每个里程碑发一个 minor；公开 API 用 `@experimental` / `@beta` TSDoc 标签标注稳定度。

## 备选

- **`renderer` 与 `rhi` 合并**：减少一层。否决：`rhi` 需要能被单独用于测试与实验（例如云 LUT 原型），并且资源缓存策略与帧图策略应可独立演进。
- **把 `Globe` 单独成包**：Globe 与 `Camera` / `FrameState` 耦合深（地形碰撞、SSE 依赖相机）；单独成包会引入双向依赖。先留在 `scene`，若后期 `scene` 过大再拆。
- **Widgets 用框架无关的 Web Components**：用户明确使用 Vue 3；示例站也是 Vue 3。选 Vue 3，后续若有需要再提供 Web Components 包装。

## 风险

- 聚合包 `webgpu-cesium` 会让 tree-shaking 依赖 `sideEffects: false` 与 ESM 纯度；任何模块级副作用（如注册全局 loader）都要放进显式的 `register*()` 函数。
- `core` 中 `Resource` 与 `TaskProcessor` 对 DOM / Worker 的依赖需要注入点，否则 Node 测试受阻。

## 待验证

- [ ] M0：tsdown 对多包 + Worker + `.wgsl` 资源的打包能否一次配置覆盖。
- [ ] M1：`core` 在 Vitest Node 环境下零 DOM 依赖跑通移植的 Specs。
- [ ] M5：`tiles` 不依赖 `scene` 时如何获得 `FrameState`（用 `renderer` 定义的 `FrameContext` 接口而非 `scene` 类型）。
