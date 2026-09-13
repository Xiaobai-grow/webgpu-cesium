# Cesium 模块移植清单

来源：`d:\code\cesium\packages\engine\Source`（1.144.0 fork，2026-08-09 主线合并）。扫描规模：Core 294 文件、Scene 390（含 Model 96、GltfPipeline 24）、Renderer 48、Shaders 641、DataSources 109、Workers 54。

处理方式取值：

- **移植**：TS 化，保留类名与签名（ADR-0004），删除 WebGL 分支，保留 Apache-2.0 头。
- **改写**：保留算法与公开 API 概念，内部按 WebGPU 与新渲染模型重做。
- **弃用**：不移植。
- **后置**：不在 M0–M10 承诺范围，按需。
- **新增**：Cesium 没有的模块。

状态取值：`未开始` / `进行中` / `完成` / `已弃用`。M1 行已按 2026-09-13 `feat/m1-core-math` 更新。

## Core

### 数学与几何基础（M1，移植）

| 模块 | 处理 | 里程碑 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `Math` | 移植 | M1 | 完成 | 导出名 `CesiumMath` |
| `Cartesian2` `Cartesian3` `Cartesian4` `Cartographic` `Spherical` | 移植 | M1 | 完成 | 保留 `result` 参数模式 |
| `Matrix2` `Matrix3` `Matrix4` `Quaternion` | 移植 | M1 | 完成 | 已加 `toFloat32Array` 列主序上传辅助 |
| `Ellipsoid` `EllipsoidGeodesic` `EllipsoidRhumbLine` `EllipsoidTangentPlane` `scaleToGeodeticSurface` | 移植 | M1 | 完成 | — |
| `Rectangle` `BoundingRectangle` `BoundingSphere` `OrientedBoundingBox` `AxisAlignedBoundingBox` | 移植 | M1 | 完成 | — |
| `Plane` `Ray` `IntersectionTests` `Intersections2D` `Interval` `Intersect` `Visibility` | 移植 | M1 | 完成 | IntersectionTests 顶部 `@ts-nocheck` |
| `CullingVolume` `Occluder` `EllipsoidalOccluder` | 移植 | M1 | 完成 | — |
| `PerspectiveFrustum` `PerspectiveOffCenterFrustum` `OrthographicFrustum` `OrthographicOffCenterFrustum` | 改写 | M1 | 完成 | 投影矩阵改 0..1 深度 + Reverse-Z；`computeCullingVolume` 保留 |
| `Transforms` `HeadingPitchRoll` `HeadingPitchRange` `TranslationRotationScale` `ReferenceFrame` `TrackingReferenceFrame` | 移植 | M1 | 完成 | ICRF 无 XYS/EOP 时返回 `undefined` |
| `EncodedCartesian3` | 移植 | M1 | 完成 | RTE 高低位 |
| `GeographicProjection` `WebMercatorProjection` `MapProjection` `Stereographic` | 移植 | M1 | 完成 | — |
| `GeographicTilingScheme` `WebMercatorTilingScheme` `TilingScheme` | 移植 | M1 | 完成 | — |
| `CubicRealPolynomial` `QuadraticRealPolynomial` `QuarticRealPolynomial` `TridiagonalSystemSolver` | 移植 | M1 | 完成 | 多项式顶部 `@ts-nocheck` |
| `Spline` `LinearSpline` `HermiteSpline` `CatmullRomSpline` `QuaternionSpline` `ConstantSpline` `SteppedSpline` `MorphWeightSpline` `HermitePolynomialApproximation` `LagrangePolynomialApproximation` `LinearApproximation` `InterpolationAlgorithm` | 移植 | M5 | 未开始 | 动画与相机飞行需要 |
| `EasingFunction` | 移植 | M2 | 完成 | 手写 LINEAR / QUAD / CUBIC，不依赖 tween.js |
| `AttributeCompression` `ComponentDatatype` `IndexDatatype` `PrimitiveType` `VertexFormat` | 移植 | M1 | 完成 | `ComponentDatatype` 映射到 `GPUVertexFormat` 名 |
| `barycentricCoordinates` `pointInsideTriangle` `Tipsify` `WireframeIndexGenerator` | 移植 | M3 / M5 | 未开始 | — |
| `MortonOrder` `HilbertOrder` `S2Cell` | 移植 | M5 | 未开始 | 隐式瓦片 |
| `NearFarScalar` `DistanceDisplayCondition` `Color` `srgbToLinear` `createColorRamp` | 移植 | M1 / M9 | 进行中 | `NearFarScalar` `Color` `srgbToLinear` 已完成；`DistanceDisplayCondition` `createColorRamp` 留 M9 |

### 时间（M1，移植）

| 模块 | 处理 | 里程碑 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `JulianDate` `GregorianDate` `LeapSecond` `TimeStandard` `TimeConstants` `Iso8601` `isLeapYear` `TimeInterval` `TimeIntervalCollection` `ExtrapolationType` `InterpolationType` | 移植 | M1 | 完成 | — |
| `Clock` `ClockRange` `ClockStep` `getTimestamp` | 移植 | M1 | 完成 | — |
| `Simon1994PlanetaryPositions` `Iau2000Orientation` `Iau2006XysData` `Iau2006XysSample` `IauOrientationAxes` `IauOrientationParameters` `EarthOrientationParameters` `EarthOrientationParametersSample` | 移植 | M1 | 完成 | 无 XYS JSON 时 `computeXysRadians` 返回 `undefined`；EOP 无数据返回全 0；Simon1994 `@ts-nocheck` |

### 工具与基础设施（M1，移植）

| 模块 | 处理 | 里程碑 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `defined` `Check` `DeveloperError` `RuntimeError` `destroyObject` `Frozen` `clone` `combine` `defer` `deprecationWarning` `oneTimeWarning` `formatError` `assert` | 移植 | M1 | 完成 | `Check.typeOf` 不能当 assertion function；生产剥离未做 |
| `Event` `EventHelper` `wrapFunction` | 移植 | M1 | 完成 | 泛型化 |
| `Heap` `DoublyLinkedList` `Queue` `DoubleEndedPriorityQueue` `AssociativeArray` `ManagedArray` `binarySearch` `mergeSort` `arrayRemoveDuplicates` `subdivideArray` `addAllToArray` `Packable` `PackableForInterpolation` | 移植 | M1 | 进行中 | 除 `Packable*` 外已完成；`DoubleEndedPriorityQueue` 为有序数组实现 |
| `Resource` `Request` `RequestScheduler` `RequestState` `RequestType` `RequestErrorEvent` `DefaultProxy` `Proxy` `TrustedServers` `parseResponseHeaders` `objectToQuery` `queryToObject` `getAbsoluteUri` `getBaseUri` `getExtensionFromUri` `getFilenameFromUri` `isBlobUri` `isCrossOriginUrl` `isDataUri` `appendForwardSlash` `buildModuleUrl` `loadAndExecuteScript` | 移植 | M1 | 完成 | `fetchImage` → `ImageBitmap`；不用 urijs / XHR；`loadAndExecuteScript`（JSONP）仍后置 |
| `TaskProcessor` | 改写 | M1 | 完成 | `new Worker(new URL())` + 可注入 factory；浏览器往返未测 |
| `FeatureDetection` | 改写 | M0 / M1 | 完成 | WebGPU 在 `rhi/GpuDevice.probe()`；`core` 仅 endian / typed array / BigInt / WASM / Worker |
| `Credit` | 移植 | M2 | 完成 | 无 DOMPurify，`text` 去标签 |
| `Ion` `IonResource` | 移植 | M3 | 未开始 | — |
| `getImagePixels` `getImageFromTypedArray` `loadImageFromTypedArray` `resizeImageToNextPowerOfTwo` `writeTextToCanvas` `getStringFromTypedArray` `getJsonFromTypedArray` `getMagic` `isBitSet` `createGuid` | 移植 | M2 / M9 | 未开始 | `resizeImageToNextPowerOfTwo` 可能不再需要 |
| `Fullscreen` `ScreenSpaceEventHandler` `ScreenSpaceEventType` `KeyboardEventModifier` | 移植 | M1 / M2 | 进行中 | Handler / Type / Modifier 已按清单 1.15 提前到 M1（注入 EventTarget）；`Fullscreen` 留 M2 |
| `TexturePacker` | 移植 | M9 | 未开始 | 广告牌图集 |
| `VideoSynchronizer` | 后置 | — | 未开始 | — |
| `WebGLConstants` `webGLConstantToGlslType` `VulkanConstants` `PixelFormat` `CompressedTextureBuffer` | 弃用 / 改写 | — | — | `PixelFormat` 改写为 `GPUTextureFormat` 映射；`CompressedTextureBuffer` 改写为 KTX2 转码结果类型 |
| `KTX2Transcoder` `loadKTX2` | 改写 | M5 | 未开始 | 目标格式按 `device.features` 选择 |
| `GeocoderService` 家族（`Bing` `Cartographic` `Google` `Ion` `OpenCage` `Pelias`）`GeocodeType` `IonGeocodeProviderType` | 后置 | M9+ | 未开始 | widgets 地理编码 |
| `GoogleMaps` `ITwinPlatform` | 后置 | — | 未开始 | — |
| `PinBuilder` | 移植 | M9 | 未开始 | — |

### 地形与数据（M2 / M3，移植）

| 模块 | 处理 | 里程碑 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `TerrainProvider` `TerrainData` `TerrainMesh` `TerrainEncoding` `TerrainQuantization` `HeightmapEncoding` `TileProviderError` | 移植 | M2 / M3 | 进行中 | M2 仅 NONE 量化 + 零高度；`TileAvailability` `TileEdge` 留 M3 |
| `EllipsoidTerrainProvider` `HeightmapTessellator` | 移植 | M2 | 完成 | 16×16 全零，主线程同步细分，无裙边 |
| `CesiumTerrainProvider` `QuantizedMeshTerrainData` `HeightmapTerrainData` `createWorldTerrainAsync` `createWorldBathymetryAsync` `ApproximateTerrainHeights` `VerticalExaggeration` `sampleTerrain` `sampleTerrainMostDetailed` `TerrainPicker` | 移植 | M3 | 未开始 | — |
| `CustomHeightmapTerrainProvider` `ArcGISTiledElevationTerrainProvider` | 移植 | M3 | 未开始 | — |
| `Cesium3DTilesTerrainProvider` `Cesium3DTilesTerrainData` `Cesium3DTilesTerrainGeometryProcessor` | 移植 | M3（可选） | 未开始 | — |
| `GoogleEarthEnterprise*` `decodeGoogleEarthEnterpriseData` `VRTheWorldTerrainProvider` | 后置 | — | 未开始 | — |
| `VectorProvider` `VectorPipeline` `decodeVectorPolylinePositions` | 后置 | — | 未开始 | 矢量瓦片 |

### 几何生成（M9，移植）

| 模块 | 处理 | 里程碑 | 状态 |
| --- | --- | --- | --- |
| `Geometry` `GeometryAttribute` `GeometryAttributes` `GeometryInstance` `GeometryInstanceAttribute` `GeometryFactory` `GeometryPipeline` `GeometryType` `GeometryOffsetAttribute` `ColorGeometryInstanceAttribute` `ShowGeometryInstanceAttribute` `DistanceDisplayConditionGeometryInstanceAttribute` `OffsetGeometryInstanceAttribute` | 移植 | M9 | 未开始 |
| `PolygonGeometry` `PolygonOutlineGeometry` `PolygonPipeline` `PolygonGeometryLibrary` `PolygonHierarchy` `CoplanarPolygon*` `WindingOrder` `ArcType` `CornerType` | 移植 | M9 | 未开始 |
| `PolylineGeometry` `SimplePolylineGeometry` `PolylinePipeline` `GroundPolylineGeometry` `PolylineVolume*` `CorridorGeometry*` `WallGeometry*` | 移植 | M9 | 未开始 |
| `RectangleGeometry*` `EllipseGeometry*` `CircleGeometry*` `EllipsoidGeometry*` `SphereGeometry*` `BoxGeometry*` `CylinderGeometry*` `PlaneGeometry*` `FrustumGeometry*` `RectangleCollisionChecker` | 移植 | M9 | 未开始 |

## Scene

### 场景骨架（M2 / M4，改写）

| 模块 | 处理 | 里程碑 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `Scene` | 改写 | M2 | 完成 | 删除 2D / CV、多视锥、`commandList`；稳定 `globe` pass |
| `FrameState` | 改写 | M2 | 完成 | 见 [05](../10-architecture/05-scene-camera-precision.md) |
| `Camera` `CameraFlightPath` `computeFlyToLocationForRectangle` `TweenCollection` | 改写 | M2 | 进行中 | Camera / Tween / flyTo 已做；`CameraFlightPath` 完整路径未移植 |
| `ScreenSpaceCameraController` `CameraEventAggregator` `CameraEventType` | 移植（3D 分支） | M2 | 进行中 | 3D 旋转 / 缩放 / 倾斜；无 Aggregator 录制回放 |
| `DeviceOrientationCameraController` | 后置 | — | 未开始 | — |
| `SceneTransforms` | 改写 | M2 | 完成 | 最小 `getPickRay` / 世界↔窗 |
| `View` `SceneFramebuffer` `PickDepth` `PickFramebuffer` `PickDepthFramebuffer` `Picking` `SnapFramebuffer` `Snapping` `PlanarFillIdFramebuffer` `OpaqueDepthTextureHandle` | 改写 | M5 / M9 | 未开始 | 合并为 Render Graph 的 `PickPass` + `ReadbackQueue` |
| `SceneMode` `SceneTransitioner` `MapMode2D` `FrustumCommands` `DerivedCommand` `DepthPlane` `OIT` `ViewportQuad` `JobScheduler` `JobType` | 弃用 | — | 已弃用 | `OIT` 的权重函数移植到 WBOIT 模块；`JobScheduler` 由 RHI 上传预算替代 |
| `CreditDisplay` | 移植 | M2 | 完成 | 文本归属；挂在 Viewer 容器 |
| `FrameRateMonitor` `PerformanceDisplay` `DebugInspector` | 改写 | M2 | 进行中 | `PerformanceDisplay` 简版；timestamp-query 留 M4 |
| `Light` `DirectionalLight` `SunLight` | 移植 | M4 | 未开始 | — |
| `Fog` `Atmosphere` `SkyAtmosphere` `DynamicAtmosphereLightingType` `Sun` `Moon` `SkyBox` `SunPostProcess` | 改写 | M4 | 未开始 | 由 `environment` 包的 Hillaire 大气 / 天体替代；保留 `Scene.fog` / `Scene.skyAtmosphere` 等属性名作为开关 |
| `ImageBasedLighting` `SpecularEnvironmentCubeMap` `DynamicEnvironmentMapManager` `BrdfLutGenerator` | 改写 | M4 | 未开始 | compute 生成 |
| `ShadowMap` `ShadowMapShader` `ShadowMode` | 改写 | M6 | 未开始 | CSM 重做；`ShadowSettings` 保留选项名 |
| `PostProcessStage*` `Tonemapper` `AutoExposure` `PostProcessStageLibrary` | 改写 | M6 | 未开始 | 阶段 API 概念保留 |
| `ClippingPlane(Collection)` `ClippingPolygon(Collection)` `getClippingFunction` `getClipAndStyleCode` | 改写 | 后置 | 未开始 | — |
| `Splitter` `SplitDirection` | 移植 | M2 | 未开始 | — |
| `Appearance` `MaterialAppearance` `PerInstanceColorAppearance` `EllipsoidSurfaceAppearance` `PolylineColorAppearance` `PolylineMaterialAppearance` `DebugAppearance` `ShadowVolumeAppearance` `Material`（Fabric） | 改写为 three.js 风格材质 | M4 / M9 | 未开始 | 见 [12-material-system.md](../10-architecture/12-material-system.md) 与 ADR-0010；Fabric 内置材质类型（Grid / Stripe / Checkerboard / Fade / Water / ElevationRamp / Contour / SlopeRamp / AspectRamp / PolylineArrow / Dash / Glow / Outline / Image）以子类等价物提供 |
| `BlendEquation` `BlendFunction` `BlendingState` `BlendOption` `CullFace` `DepthFunction` `StencilConstants` `StencilFunction` `StencilOperation` | 弃用 | — | 已弃用 | 直接用 `GPU*` 枚举 |
| `ThreeGeospatialController` | 弃用 | — | 已弃用 | fork 专有 |

### Globe、地形、影像（M2 / M3）

| 模块 | 处理 | 里程碑 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `QuadtreePrimitive` `QuadtreeTile` `QuadtreeTileProvider` `QuadtreeTileLoadState` `QuadtreeOccluders` `TileReplacementQueue` `TileSelectionResult` `TileBoundingRegion` | 移植 | M2 | 完成 | 精简移植，非 2000 行 1:1 |
| `Globe` `GlobeSurfaceTile` `GlobeSurfaceTileProvider` `TerrainFillMesh` `TerrainState` `Terrain` | 改写 | M2 / M3 | 进行中 | M2 零高度路径；`TerrainFillMesh` 留 M3 |
| `GlobeSurfaceShaderSet` `GlobeDepth` `GlobeTranslucency*` `TranslucentTileClassification` | 弃用 / 后置 | — | — | 着色器变体由组合器管理；地表透明后置 |
| `ImageryLayer` `ImageryLayerCollection` `Imagery` `TileImagery` `ImageryState` `ImageryLayerFeatureInfo` `GetFeatureInfoFormat` `TimeDynamicImagery` | 移植 / 改写 | M2 | 进行中 | 层 / Imagery / TileImagery 已做；要素查询与时序影像未做 |
| `ImageryProvider` `UrlTemplateImageryProvider` `OpenStreetMapImageryProvider` `TileMapServiceImageryProvider` `SingleTileImageryProvider` `GridImageryProvider` `TileCoordinatesImageryProvider` `TileDiscardPolicy` `DiscardMissingTileImagePolicy` `DiscardEmptyTileImagePolicy` `NeverTileDiscardPolicy` | 移植 | M2 | 进行中 | OSM / URL / TMS / Grid / TileCoordinates / DiscardPolicy 已做；`SingleTile` 未做 |
| `WebMapServiceImageryProvider` `WebMapTileServiceImageryProvider` `ArcGisMapServerImageryProvider` `ArcGisMapService` `ArcGisBaseMapType` `BingMapsImageryProvider` `BingMapsStyle` `IonImageryProvider` `IonImageryProviderFactory` `IonWorldImageryStyle` `createWorldImageryAsync` `Google2DImageryProvider` `Azure2DImageryProvider` `MapboxImageryProvider` `MapboxStyleImageryProvider` | 移植 | M3 | 未开始 | — |
| `GoogleEarthEnterpriseImageryProvider` `GoogleEarthEnterpriseMapsProvider` | 后置 | — | 未开始 | — |
| `Megatexture` | 参考 | M8 | 未开始 | 体素用的图集；虚拟纹理自研 |

### 3D Tiles、Model、glTF（M5）

| 模块 | 处理 | 里程碑 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `GltfPipeline/*`（24 文件） | 移植 | M5 | 未开始 | — |
| `GltfLoader` `GltfJsonLoader` `GltfBufferViewLoader` `GltfVertexBufferLoader` `GltfIndexBufferLoader` `GltfTextureLoader` `GltfImageLoader` `GltfDracoLoader` `GltfStructuralMetadataLoader` `GltfLoaderUtil` `BufferLoader` `DracoLoader` `ResourceLoader` `ResourceLoaderState` `ResourceCache` `ResourceCacheKey` `ResourceCacheStatistics` `SupportedImageFormats` `findMeshoptExtension` `hasExtension` `getBinaryAccessor` `getMeshPrimitives` | 移植 | M5 | 未开始 | GPU buffer / texture 创建改走 RHI |
| `GltfSpzLoader` | 后置 | — | 未开始 | 高斯泼溅 |
| `ModelComponents` `AttributeType` `VertexAttributeSemantic` `InstanceAttributeSemantic` `AlphaMode` `Axis` `ModelAnimationLoop` `ModelAnimationState` | 移植 | M5 | 未开始 | — |
| `Model/Model` `ModelSceneGraph` `ModelRuntimeNode` `ModelRuntimePrimitive` `ModelNode` `ModelSkin` `ModelAnimation*` `ModelArticulation*` `ModelFeature` `ModelFeatureTable` `ModelStatistics` `ModelUtility` `ModelType` `ModelReader` `ModelAlphaOptions` `ModelLightingOptions` `LightingModel` | 移植 / 改写 | M5 | 未开始 | — |
| `Model/*PipelineStage`（约 35 个） | 改写 | M5 | 未开始 | 改为数据准备阶段，不拼字符串 |
| `Model/ModelDrawCommand(s)` `ClassificationModelDrawCommand` `ModelRenderResources` `NodeRenderResources` `PrimitiveRenderResources` `StyleCommandsNeeded` | 改写 | M5 | 未开始 | 输出 RenderItem |
| `Model/CustomShader*` `UniformType` `VaryingType` `TextureManager` `TextureUniform` | 改写 | M5 | 未开始 | 由 `ShaderMaterial` 与 `Material.onBeforeCompose` 承担；`TextureManager` 由 `Texture` 对象 + RHI 缓存替代 |
| `Model/MaterialPipelineStage` | 改写 | M5 | 未开始 | glTF 材质 → `MeshPhysicalMaterial` / `MeshBasicMaterial` 映射 |
| `Model/B3dmLoader` `I3dmLoader` `PntsLoader` `GeoJsonLoader` `B3dmParser` `I3dmParser` `PntsParser` `parseBatchTable` `BatchTable` `BatchTableHierarchy` `BatchTexture` | 移植 | M5 | 未开始 | — |
| `Model/ModelImagery*` `ImageryPipelineStage` `Imagery*` | 后置 | — | 未开始 | — |
| `Model/PrimitiveOutlineGenerator` `PrimitiveOutlinePipelineStage` | 移植 | M5 | 未开始 | — |
| `Cesium3DTileset` `Cesium3DTile` `Cesium3DTileContent*` `Cesium3DTilesetCache` `Cesium3DTilesetStatistics` `Cesium3DTilesetHeatmap` `Cesium3DTilesetMetadata` `Cesium3DTilesetTraversal` `Cesium3DTilesetBaseTraversal` `Cesium3DTilesetSkipTraversal` `Cesium3DTilesetMostDetailedTraversal` `Cesium3DTileOptimizations` `Cesium3DTileOptimizationHint` `Cesium3DTilePass` `Cesium3DTilePassState` `Cesium3DTileRefine` `Cesium3DTileColorBlendMode` `Cesium3DContentGroup` `preprocess3DTileContent` `Tileset3DTileContent` `Multiple3DTileContent` `Empty3DTileContent` `Composite3DTileContent` `Model3DTileContent` `TileBoundingVolume` `TileBoundingSphere` `TileOrientedBoundingBox` `TileBoundingS2Cell` `BoundingVolumeSemantics` `UrlTemplate3DTilesDataProvider` | 移植 | M5 | 未开始 | 渲染接口改写 |
| `Implicit*`（9 文件） | 移植 | M5 | 未开始 | — |
| `Metadata*` `StructuralMetadata` `PropertyTable` `PropertyTexture(Property)` `PropertyAttribute(Property)` `JsonMetadataTable` `parseStructuralMetadata` `parseFeatureMetadataLegacy` `find*Metadata` `getMetadata*` `PickedMetadataInfo` `MetadataPicking` `TileMetadata` `TilesetMetadata` `GroupMetadata` `ContentMetadata` | 移植 | M5 | 未开始 | — |
| `Cesium3DTileStyle` `Cesium3DTileStyleEngine` `Expression` `ExpressionNodeType` `ConditionsExpression` `StyleExpression` | 移植 | M5 | 未开始 | jsep 依赖 |
| `Cesium3DTileFeature` `Cesium3DTilePointFeature` `Cesium3DTileFeatureTable` `Cesium3DTileBatchTable` | 移植 | M5 | 未开始 | — |
| `PointCloud` `PointCloudShading` `PointCloudEyeDomeLighting` `TimeDynamicPointCloud` | 改写 | M5 | 未开始 | EDL 作为后处理阶段 |
| `createGooglePhotorealistic3DTileset` `createOsmBuildingsAsync` | 移植 | M5 | 未开始 | — |
| `Vector3DTile*` `Geometry3DTileContent` `VectorGltf3DTileContent` `buildVectorGltfFromMVT` `decodeMVT` `MVTDataProvider` `Cesium3DTileVectorFeature` | 后置 | — | 未开始 | 矢量瓦片 |
| `GaussianSplat*` `Cesium3DTilesVoxelProvider` `Voxel*` `SpatialNode` `KeyframeNode` `Megatexture` `buildVoxelDrawCommands` `buildVoxelCustomShader` `processVoxelProperties` | 后置 | — | 未开始 | 体素与高斯泼溅；WebGPU compute 有优势，后期专项 |
| `I3S*` `ITwinData` | 后置 | — | 未开始 | — |

### 图元（M9）

| 模块 | 处理 | 里程碑 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `Primitive` `PrimitiveCollection` `PrimitivePipeline` `PrimitiveState` `PrimitiveLoadPlan` | 改写 | M9 | 未开始 | 材质对象替代 Appearance |
| `GroundPrimitive` `GroundPolylinePrimitive` `ClassificationPrimitive` `ClassificationType` `InvertClassification` `OrderedGroundPrimitiveCollection` | 改写 | M9 / 后置 | 未开始 | 贴地技术在 Reverse-Z 下重标定 |
| `Billboard` `BillboardCollection` `BillboardTexture` `BillboardLoadState` `createBillboardPointCallback` `HorizontalOrigin` `VerticalOrigin` `HeightReference` | 改写 | M9 | 未开始 | 图集走 `TexturePacker` |
| `Label` `LabelCollection` `LabelStyle` `SDFSettings` | 改写 | M9 | 未开始 | SDF 文字 |
| `PointPrimitive` `PointPrimitiveCollection` | 改写 | M9 | 未开始 | — |
| `Polyline` `PolylineCollection` | 改写 | M9 | 未开始 | — |
| `BufferPoint*` `BufferPolygon*` `BufferPolyline*` `BufferPrimitive*` `renderBuffer*` | 评估 | M9 | 未开始 | Cesium 新的 buffer 图元，与本项目 storage 实例方案接近，优先参考 |
| `EllipsoidPrimitive` `DebugCameraPrimitive` `DebugModelMatrixPrimitive` `createTangentSpaceDebugPrimitive` `createElevationBandMaterial` | 移植 / 改写 | M9 | 未开始 | — |
| `ParticleSystem` `Particle` `ParticleBurst` `ParticleEmitter` `BoxEmitter` `CircleEmitter` `ConeEmitter` `SphereEmitter` | 改写 | M7 | 未开始 | 改为 GPU 粒子，天气系统共用 |
| `CloudCollection` `CumulusCloud` `CloudType` | 弃用 | — | 已弃用 | 体积云替代；可作 `low` 预设退化参考 |
| `Panorama*` `CubeMapPanorama` `EquirectangularPanorama` `GoogleStreetViewCubeMapPanoramaProvider` | 后置 | — | 未开始 | — |
| `EdgeDisplayMode` `EdgeFramebuffer` `GeoJsonPrimitive` `SensorVolumePortionToDisplay` `ColorBlendMode` | 评估 | M9 | 未开始 | — |

## Renderer（全部弃用）

`AutomaticUniforms` `Buffer` `BufferUsage` `ClearCommand` `ComputeCommand` `ComputeEngine` `Context` `ContextLimits` `createUniform` `createUniformArray` `CubeMap` `CubeMapFace` `demodernizeShader` `DrawCommand` `Framebuffer` `FramebufferManager` `freezeRenderState` `GpuDevice`（fork 阶段 1 产物）`loadCubeMap` `MipmapHint` `MultisampleFramebuffer` `Pass` `PassState` `PickId` `PixelDatatype` `Renderbuffer` `RenderbufferFormat` `RenderState` `Sampler` `ShaderBuilder` `ShaderCache` `ShaderDestination` `ShaderFunction` `ShaderProgram` `ShaderSource` `ShaderStruct` `SharedContext` `Sync` `Texture` `Texture3D` `TextureAtlas` `TextureCache` `TextureMagnificationFilter` `TextureMinificationFilter` `TextureWrap` `UniformState` `VertexArray` `VertexArrayFacade`

对应关系见 [03-rhi-and-render-graph.md](../10-architecture/03-rhi-and-render-graph.md) 第 3 节。`TextureAtlas` 的打包算法（`TexturePacker`）保留；`UniformState` 中的矩阵派生逻辑（视图 / 投影 / 逆矩阵 / 法线矩阵 / 日月方向）迁入 `FrameUniforms` 的 CPU 填充器。

## Shaders（641 个 GLSL，全部弃用，WGSL 重写）

重写清单按 WGSL 模块目录组织，见 [04-shader-system.md](../10-architecture/04-shader-system.md)。Cesium `Builtin/Functions` 中值得逐个对照移植的算法：`octDecode / octEncode`、`unpackDepth / packDepth`、`transpose`、`eyeToWindowCoordinates / windowToEyeCoordinates`、`ellipsoidWgs84TextureCoordinates`、`rayEllipsoidIntersectionInterval`、`getDefaultMaterial`、`phong`、`pbrLighting`（对照，重写为 GGX）、`luminance`、`hue / saturation`、`HSBToRGB / RGBToHSB`、`antialias`、`lineDistance`、`translateRelativeToEye`（RTE）、`computePosition`、`fog`（替换为空气透视）、`sphericalHarmonics`、`approximateSphericalCoordinates`、`writeNonPerspective`、`geodeticSurfaceNormal`、`nearFarScalar`、`decompressTextureCoordinates`、`readDepth`、`reverseLogDepth`（不需要）。

fork 内 `ThreeGeospatial/*` 与 `Extension/Ocean/*` 的 GLSL（大气、云、海洋、延迟光照、GBuffer）作为算法参考，不直接移植。

## DataSources（109 文件，后置）

`Entity` / `EntityCollection` / `*Graphics` / `*Visualizer` / `CzmlDataSource` / `GeoJsonDataSource` / `KmlDataSource` / `GpxDataSource` / `Property` 系列 / `CallbackProperty` / `SampledProperty` / `PositionProperty` 等：首期不移植。若后续需要，`Property` 系列与解析层可直接移植，`Visualizer` 层需要针对新图元 API 重写。

## Workers（54 文件）

| Worker | 处理 | 里程碑 | 状态 |
| --- | --- | --- | --- |
| `createTaskProcessorWorker` `transferTypedArrayTest` | 改写 | M1 | `createTaskProcessorWorker` 完成；`transferTypedArrayTest` 未做 |
| `createVerticesFromHeightmap` | 移植 | M2 | 完成 | 默认同步调用；Worker 入口已导出，未默认启用 |
| `createVerticesFromQuantizedTerrainMesh` `upsampleQuantizedTerrainMesh` `incrementallyBuildTerrainPicker` | 移植 | M3 | 未开始 |
| `createVerticesFromCesium3DTilesTerrain` `upsampleVerticesFromCesium3DTilesTerrain` | 移植 | M3（可选） | 未开始 |
| `decodeDraco` `transcodeKTX2` | 移植 | M5 | 未开始 |
| `createGeometry` `combineGeometry` `create*Geometry`（约 30 个） | 移植 | M9 | 未开始 |
| `createVectorTile*` `decodeI3S` `decodeGoogleEarthEnterprisePacket` | 后置 | — | 未开始 |
| `gaussianSplatSorter` `gaussianSplatTextureGenerator` | 后置 | — | 未开始 |
| 新增：`buildMeshlets`、`preprocessWeatherMap`、`generateCloudNoise`（若不用 compute） | 新增 | M7 / M8 | 未开始 |

## Widgets（`packages/widgets`，弃用，Vue 3 重做）

M2：最小 `CesiumViewer`（画布挂载、Credit、性能条）。完整 `Viewer` / `Timeline` / `Animation` / `BaseLayerPicker` / `NavigationHelp` / `Fullscreen` / `Home` / `InfoBox` / `SelectionIndicator` / `PerformancePanel` / `TilesInspector` 留 M9（Vue 3）。

## 新增模块（Cesium 没有）

| 模块 | 包 | 里程碑 | 状态 |
| --- | --- | --- | --- |
| `GpuDevice` `PipelineCache` `BindGroupLayoutCache` `SamplerCache` `ShaderModuleCache` | rhi | M0 | 完成 |
| `ReadbackQueue` `GpuTimer` | rhi | M4 | 未开始 |
| WGSL 组合器（`#import` / `#if`、规范化、sourceMap、hash）与内置模块 `builtin/constants.wgsl` `builtin/frame.wgsl` | shaders | M0 | 完成 |
| WGSL 反射（`wgsl_reflect`） | shaders | M2 | 未开始 | M2 继续手写 FrameUniforms 偏移，单测锁定 `frame.wgsl` |
| `RenderGraph`（最小：`addPass` / 资源句柄 / 导入 canvas / 裁剪 / 拓扑排序）、`RenderItem` 类型 | renderer | M0 | 完成 |
| `RenderGraph` 瞬态资源别名、多队列、性能统计 | renderer | M4 | 未开始 |
| `FrameUniformsBuffer`（矩阵 + RTE 高低位 + 视口 / 时间） | renderer | M0 / M2 | 完成 | 偏移手写 |
| `Material` `Texture` 基类，`MeshBasicMaterial` `MeshStandardMaterial` `MeshPhysicalMaterial`，`MaterialOutput` 契约，`onBeforeCompose` 接口点 | renderer / shaders | M4 | 未开始 |
| `LineBasicMaterial` `LineDashedMaterial` `PointsMaterial` `SpriteMaterial` `ShaderMaterial` `ShadowMaterial` `MeshNormalMaterial` `MeshDepthMaterial`，GIS 扩展材质，`VideoTexture` `CanvasTexture` `DataTexture` 系列 | renderer | M9 | 未开始 |
| `FrameUniforms` 完整填充器（相机矩阵与高低位）、`EnvironmentState` | renderer / scene | M2 / M4 | 进行中 | M2 已填矩阵与 RTE；`EnvironmentState` 留 M4 |
| Hillaire 大气、`StarField`、月面渲染 | environment | M4 | 未开始 |
| CSM、GTAO、TAA、Bloom、自动曝光、WBOIT | renderer | M6 | 未开始 |
| `VolumetricClouds` `WeatherMapProvider` `WeatherSystem` `Ocean` | environment | M7 | 未开始 |
| GPU-driven 剔除、Hi-Z、虚拟纹理、meshlet | renderer / tiles | M8 | 未开始 |
| 示例站骨架（Vue 3 + Vue Router，`hello-triangle`） | apps/examples | M0 | 完成 |
| Vue 3 widgets、示例站完整版（Monaco）、文档站 | widgets / apps | M9 / M10 | 未开始 |
