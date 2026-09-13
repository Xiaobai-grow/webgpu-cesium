# Globe：四叉树、地形与影像

## 决策

### 1. 保留的 Cesium 算法（移植，不重设计）

| 模块 | 说明 |
| --- | --- |
| `QuadtreePrimitive` / `QuadtreeTile` / `QuadtreeTileProvider` | 四叉树遍历、SSE 计算、加载 / 卸载队列、`TileReplacementQueue`、`TileSelectionResult`、可见性与遮挡（`EllipsoidalOccluder`）、相机高度驱动的预加载祖先 / 兄弟策略 |
| `GlobeSurfaceTile` / `TerrainFillMesh` | 瓦片状态机（地形请求 → 变换 → 网格 → 上传）、填充网格、上采样（`upsampleQuantizedTerrainMesh`） |
| `TerrainProvider` 家族 | `CesiumTerrainProvider`（quantized-mesh + 可用性）、`EllipsoidTerrainProvider`、`CustomHeightmapTerrainProvider`、`ArcGISTiledElevationTerrainProvider`、`GoogleEarthEnterpriseTerrainProvider`（后置）、`VRTheWorldTerrainProvider`（后置）、`Cesium3DTilesTerrainProvider` |
| `TerrainData` 家族 | `QuantizedMeshTerrainData`、`HeightmapTerrainData`、`Cesium3DTilesTerrainData`，`TerrainEncoding`、`TerrainQuantization`、`TerrainMesh` |
| Worker | `createVerticesFromQuantizedTerrainMesh`、`createVerticesFromHeightmap`、`upsampleQuantizedTerrainMesh`、`HeightmapTessellator` |
| `ImageryLayer` / `ImageryLayerCollection` / `Imagery` / `TileImagery` / `ImageryState` | 影像与地形瓦片的匹配（不同瓦片方案重投影）、加载状态机、透明度 / 亮度 / 对比度 / 色相 / 饱和度 / Gamma、`cutoutRectangle`、`colorToAlpha`、`splitDirection` |
| `ImageryProvider` 家族 | `UrlTemplateImageryProvider`、`TileMapServiceImageryProvider`、`WebMapServiceImageryProvider`、`WebMapTileServiceImageryProvider`、`ArcGisMapServerImageryProvider`、`BingMapsImageryProvider`、`OpenStreetMapImageryProvider`、`SingleTileImageryProvider`、`IonImageryProvider`、`Google2DImageryProvider`、`GridImageryProvider`、`TileCoordinatesImageryProvider`（调试）、`TileDiscardPolicy` 系列 |
| 地形采样与拾取 | `sampleTerrain`、`sampleTerrainMostDetailed`、`TerrainPicker`、`Globe.pick`、`Globe.getHeight` |
| `ApproximateTerrainHeights`、`TileAvailability`、`VerticalExaggeration` | 保留 |

### 2. 重写的部分

| Cesium | 本项目 |
| --- | --- |
| `GlobeSurfaceTileProvider` 的 DrawCommand 生成（每瓦片一个 `DrawCommand`，`uniformMap` 闭包，多层 `#define TEXTURE_UNITS`） | 每瓦片一个 `RenderItem`；瓦片 uniform（`TerrainEncoding` 的解码矩阵、纹理坐标缩放偏移、影像层参数）写入 storage 数组按瓦片索引读取；影像纹理放入 **2D array 图集**（每层影像一个 `texture_2d_array`，瓦片索引作 layer）或 **虚拟纹理**（M8）。 |
| `GlobeSurfaceShaderSet`（按标志组合 GLSL） | `globe/*.wgsl` 模块 + 条件编译 + `override` 影像层数；变体：有 / 无法线、有 / 无水面掩码、有 / 无垂直夸张、影像层数、是否有裁剪平面 / 多边形 |
| `Globe` 的 `GlobeDepth`、`GlobeTranslucency*`、`PickDepth` | 深度由 Render Graph 提供；地表透明（地下模式）重新实现为「前后两个 pass + 混合」的 Render Graph 子图，首期不做 |
| Web Mercator 重投影（`ImageryLayer._reprojectTexture` 全屏 GPGPU） | `ComputePass` 或渲染到 `texture_2d_array` 层 |
| 影像瓦片上传 | `ImageBitmap` → `copyExternalImageToTexture`，`premultipliedAlpha` 与 `flipY` 显式指定 |
| 地形网格上传 | Worker 生成 `ArrayBuffer`（交错顶点：position + texcoord + height + normal + webMercatorT），主线程直接 `writeBuffer`；索引 16 位（瓦片顶点数上限 65536） |
| 裙边、填充网格 | 逻辑保留，输出到相同顶点布局 |
| 水面效果 | 保留水面掩码输入，着色升级为与海洋模块一致的法线动画（M7 之前简单版） |
| 光照 | 地形不再自己算光照；写 G-buffer（法线、基础色、粗糙度 = 1、金属度 = 0、材质 ID = terrain）交给延迟光照 |

### 3. 顶点布局（与 `TerrainEncoding` 对齐）

Cesium 的 `TerrainEncoding` 已支持量化（`BITS12`）与非量化两种布局、可选法线（八面体编码）、可选 `webMercatorT`、可选 `geodeticSurfaceNormal`。保留其编码逻辑，WGSL 端 `globe/terrain-encoding.wgsl` 提供 `decodePosition()`、`decodeTexcoord()`、`decodeHeight()`、`decodeNormal()`，解码矩阵放瓦片 storage 数据。

### 4. 影像合成

- 每瓦片最多 N 层影像（Cesium 由 `maxTextureUnits` 限制，通常 16–31）；本项目每层影像一个 `texture_2d_array` 绑定，N 通过 `override` 指定，超过时分多次 pass 叠加（Cesium 也如此）。
- 每层参数（alpha、brightness、contrast、hue、saturation、gamma、splitDirection、cutout、colorToAlpha、纹理坐标矩形、layer 索引）打包在瓦片 storage 数据的数组中。
- 合成结果写 G-buffer 基础色（线性空间）；`gamma` 等美化参数在合成阶段作用。

### 5. 虚拟纹理接口（为 M8 预留）

- `ImageryLayer` 对上层暴露 `sampleDescriptor`：要么「图集 layer + 变换」，要么「虚拟纹理页表 + 物理纹理」。地形着色器通过条件编译在两种采样路径间切换。
- 页请求反馈：低分辨率 feedback pass 输出所需页 ID，异步读回后驱动影像请求；首期（M2–M7）不启用。

### 6. 「先出球」的最小路径（M2）

1. `EllipsoidTerrainProvider`（无高程）+ `GeographicTilingScheme` 四叉树；
2. 一层 `UrlTemplateImageryProvider`（OSM 或本地瓦片）；
3. 每瓦片顶点在 Worker 里由 `HeightmapTessellator` 用全零高度生成（复用地形路径，避免写第二套网格）；
4. 简单前向着色（无 G-buffer）：影像 × Lambert；
5. `ScreenSpaceCameraController` 基本旋转 / 缩放。

验收：能在示例站看到带 OSM 影像的地球，缩放到街区级别不抖动、不缺瓦片、瓦片切换无缝。

## 备选

- **在 GPU 上生成地形网格（compute tessellation）**：可减少 Worker 与上传，但 quantized-mesh 已是预三角化格式，收益小；heightmap 类可后期做。否决首期。
- **一开始就做虚拟纹理**：复杂度高，且 Cesium 的多层图集方案已能工作。虚拟纹理列 M8。
- **每瓦片独立纹理绑定（Cesium 现状）**：bind group 数 = 瓦片数 × 层数，切换开销大。改用 array 图集。
- **移植 `GlobeTranslucency`**：依赖多 pass 深度技巧，与延迟渲染冲突；后置并重新设计。

## 风险

- `texture_2d_array` 图集需要所有瓦片同尺寸；影像 Provider 瓦片尺寸不一致（256 / 512）时需要按层分组或重采样。
- 图集 layer 上限 `maxTextureArrayLayers`（核心 256）：一层影像同时驻留瓦片超过 256 时需要多个图集或虚拟纹理。相机在低空时可见瓦片一般 < 200，但预加载会增加。
- Cesium 的四叉树逻辑约 2000 行且与 `FrameState`、`Camera` 细节耦合，移植时容易引入行为偏差。缓解：移植 `QuadtreePrimitiveSpec` 与 `GlobeSurfaceTileProviderSpec` 的非渲染部分。
- Web Mercator 影像贴到地理瓦片的重投影是每瓦片一次 GPU 操作，需要用 compute 批量做。

## 待验证

- [x] M2：`texture_2d_array` 图集 + 每瓦片 uniform（2026-09-13）：group 0 frame / group 1 图集 / group 2 tile；地形与影像须 0 级瓦片数相同（hello-globe 用 WebMercator 对齐 OSM）。国家尺度 64 瓦片、1 条 pipeline。256 layer 未在太空–国家路径触发。`reproject.wgsl` 已写未接线。像素断言用 `copyTextureToBuffer`，禁止 2d `drawImage` 截 WebGPU canvas。
- [ ] M3：Worker 生成顶点到 `writeBuffer` 的端到端延迟；是否需要 `mappedAtCreation` 或分帧上传。
- [ ] M3：Reverse-Z 下裙边与填充网格的视觉一致性。
