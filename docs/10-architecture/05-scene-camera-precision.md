# 场景、相机与精度

对应 ADR-0005：Reverse-Z + 相机相对渲染取代 log depth 与多视锥。

## 决策

### 1. 坐标系

- 世界坐标：ECEF（WGS84 或自定义椭球），CPU 侧 `Cartesian3` 为 f64。
- 场景只有 3D 模式；不实现 2D / Columbus View / morph。
- 局部框架：`Transforms.eastNorthUpToFixedFrame` 及其变体保持 Cesium 语义。
- 天球 / 惯性：`Transforms.computeIcrfToFixedMatrix`、`computeTemeToPseudoFixedMatrix`，加载 `Iau2006XysData` 与 EOP 的方式保持（可选异步资源）。

### 2. 相机

`Camera` 保留 Cesium 的字段与方法名（`position`、`direction`、`up`、`right`、`frustum`、`setView`、`flyTo`、`lookAt`、`lookAtTransform`、`zoomIn`、`rotate`、`move*`、`computeViewRectangle`、`pickEllipsoid`、`getPixelSize`、`positionCartographic`、`heading / pitch / roll`），但内部：

- 视图矩阵拆为 **旋转部分**（f32 可表达）与 **平移部分**（f64 相机位置）；GPU 收到的 `view` 矩阵平移为 0，即「相机在原点」的视图矩阵。
- `frustum` 只有 `PerspectiveFrustum` / `OrthographicFrustum`（正交仅用于特殊工具视角）；投影矩阵按 Reverse-Z 生成：近平面映射到 1、远平面到 0，可选无穷远平面。
- `near` 默认 0.1 m（Cesium 为 1.0），`far` 默认 1e9 m 或无穷远；单视锥。
- `ScreenSpaceCameraController` 移植手感（惯性、地形碰撞、按椭球拾取旋转中心、倾斜限制、最小 / 最大缩放距离），删除 2D 分支。
- 相机事件：`changed`、`moveStart`、`moveEnd` 保留。

### 3. 深度：Reverse-Z

- 深度附件格式 `depth32float`（核心保证支持）；模板需要时用 `depth32float-stencil8`（需 feature `depth32float-stencil8`）或独立模板策略。
- 深度比较 `greater`（`greater-equal` 用于天空盒等填充远平面），清除值 0。
- Reverse-Z + f32 深度在 near = 0.1 m、far = 1e9 m 下仍有足够精度，因此：
  - 删除 `czm_logDepth` 系列与 `writeLogDepth`；
  - 删除多视锥（`FrustumCommands`、`frustumSplits`、`Scene.farToNearRatio`）；
  - 阴影、拾取、后处理只处理一个深度缓冲。
- 深度线性化与世界位置重建函数在 `builtin/depth.wgsl` 统一实现。

### 4. 位置精度：相机相对渲染

两种手段并存，按数据类型选择：

| 数据 | 方案 | 说明 |
| --- | --- | --- |
| 地形瓦片、3D Tiles 瓦片、Model 实例 | **相机相对模型矩阵**：CPU 用 f64 计算 `modelMatrix` 平移减去相机位置，再转 f32 上传 | 每帧每对象一次 f64 减法，成本可忽略；瓦片顶点本身相对瓦片中心（Cesium 已如此，`TerrainEncoding.center`） |
| 顶点直接存世界坐标的图元（Polyline / Polygon / Billboard / 点云不带中心） | **高低位拆分**（`EncodedCartesian3`）：顶点属性 `positionHigh` + `positionLow`，GPU 端 `(high - cameraHigh) + (low - cameraLow)` | 对齐 Cesium 现有做法，`builtin/transforms.wgsl` 提供 `rteToEye()` |
| 极大范围（星空、天空盒、大气） | 只用方向向量，不用位置 | — |

- 所有 group 0 的相机位置以高低位两份 f32 提供；所有模型矩阵传给 GPU 前都是相机相对的（`modelViewRelative`），GPU 端没有「世界坐标」的 f32 表示，避免误用。
- 法线 / 切线变换用 3×3 矩阵，与平移无关，不受影响。

### 5. FrameState 与场景更新

- `FrameState` 字段：`frameNumber`、`time`（JulianDate）、`camera`、`cullingVolume`、`pixelRatio`、`viewport`、`passes`（需要哪些 pass：render / pick / depth-only）、`lightDirectionWC`（太阳或自定义）、`moonDirectionWC`、`fog`、`shadowHints`、`creditDisplay`、`afterRender` 回调队列、`renderItems`（按 pass 标签分桶）。
- 删除：`commandList`、`frustumSplits`、`mode`、`morphTime`、`mapProjection`（仅 3D）、`useLogDepth`。
- `Scene.render(time)`：更新 Clock → 相机 → 日月方向（`Simon1994PlanetaryPositions`）→ 环境（大气参数）→ 各图元 `update(frameState)` → 组装帧图 → 执行 → 处理异步结果（拾取、timestamp）→ `postRender` 事件。
- `Scene.requestRenderMode` 保留语义（仅在场景变化时渲染），`maximumRenderTimeChange` 保留。

### 6. 拾取

- `pick(windowPosition)`：ID pass 渲染到 `r32uint`（或 `rgba8unorm` 编码）小视口，异步读回；返回 `Promise<PickedObject | undefined>`。
- `pickPosition(windowPosition)`：从深度缓冲读回单像素，Reverse-Z 反投影 + 相机位置 f64 加回；返回 `Promise<Cartesian3 | undefined>`。
- `drillPick`：多次 ID pass 剔除已选对象；限制次数。
- 拾取批量：一帧内多次请求合并为一次读回。
- 提供同步「上一帧结果」访问接口用于 hover 等高频场景（结果延迟 1–2 帧）。

### 7. 剔除

- CPU：`CullingVolume` 与 `BoundingSphere` / `OrientedBoundingBox` 保留；四叉树与 3D Tiles 遍历仍在 CPU（M2–M5），GPU-driven 剔除在 M8 引入用于 Model 实例与 meshlet。
- 遮挡：`EllipsoidalOccluder`（地平线剔除）保留；后期 Hi-Z 遮挡剔除（compute）作为 M8 的一部分。

## 备选

- **保留 log depth**：与 Reverse-Z 相比精度更差、需要额外片元写深度（关闭 early-z），WebGPU 也不允许 `gl_FragDepth` 之外的技巧。否决。
- **保留多视锥**：为 WebGL 24 位深度设计；Reverse-Z f32 单视锥足够。否决。
- **GPU 端 f64 模拟（double-float）**：WGSL 无 f64；模拟成本高。仅在极端需要时局部使用（例如高精度射线求交 compute），不作通用方案。
- **所有对象都用高低位顶点属性**：多一个属性、多带宽；对有中心点的瓦片数据没有必要。按数据类型分开处理。

## 风险

- Reverse-Z 下的深度偏移（polygon offset）语义与 WebGL 相反：`depthBias` 符号要反；地形上贴地几何（分类、贴地线）的偏移策略需要重新标定。
- 多个不同来源的深度（云的低分辨率深度、透明物体）与主深度合并时的一致性。
- `pickPosition` 异步化是与 Cesium 的显著 API 差异；需要在示例与文档中强调。
- 相机控制器手感回归难以自动测试。缓解：录制 Cesium 中的一组输入事件序列与相机结果，作为数值回归。

## 待验证

- [x] M1：PerspectiveFrustum Reverse-Z 投影矩阵数值（2026-09-13，`packages/core/src/bounds.test.ts`）：eye-space `z = -near` 映到 NDC z=1，`z = -far` 映到 0；`far = Infinity` 时远处趋近 0；`computeCullingVolume` 仍返回 6 平面。
- [x] M2：Camera 视图平移为 0 + RTE 高低位（2026-09-13，`Camera.test.ts` / `FrameUniforms.test.ts`）；深度 `depth32float` + `greater` + clear 0。高空默认必须天底（`-PI/2`），`-PI/4` 会看向太空导致 0 级瓦片被视锥剔除。未做 100 m 录屏抖动对比，也未在多 GPU 上比 `far=1e9` 与无穷远。
- [x] M3：真地形 Reverse-Z / RTE（2026-09-13）：高度图 / 量化网格 / 填充网格沿用 M2 `depth32float` + `greater` + 每瓦片 48 字节 RTE uniform。hello-terrain 山体可见、非黑屏。未做 100 m 贴地 z-fighting 专项，也未测成千瓦片 RTE 成本（低空瓦片数仍远低于千级）。
- [ ] M3 / M9：贴地几何的 `depthBias` 参数标定（M3 无贴地图元，顺延 M9）。
- [ ] M5：`pickPosition` 读回延迟（一帧还是两帧），是否需要「预测式」同步 API。
