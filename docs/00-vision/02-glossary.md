# 术语表

按主题分组。首列为文档与代码中统一使用的写法。

## 地理与坐标

| 术语 | 含义 |
| --- | --- |
| WGS84 | 世界大地坐标系 1984，默认椭球（长半轴 6378137 m，扁率 1/298.257223563）。 |
| ECEF | 地心地固坐标系，Cesium 中的「世界坐标」`Cartesian3`，单位米。 |
| ENU | 东-北-上局部坐标系，`Transforms.eastNorthUpToFixedFrame`。 |
| ICRF | 国际天球参考系，用于日月星与惯性参考系；`Transforms.computeIcrfToFixedMatrix`。 |
| Cartographic | 经度、纬度（弧度）、高度（米）三元组。 |
| Geodetic surface normal | 椭球面法线，`Ellipsoid.geodeticSurfaceNormal`，与相机「上」向量和地形法线相关。 |
| TilingScheme | 瓦片方案：地理（2×1 根瓦片）或 Web Mercator（1×1 根瓦片）。 |
| SSE | Screen Space Error，屏幕空间误差；几何误差投影到屏幕的像素数，驱动 LOD 细分。 |
| Quantized-mesh | Cesium 地形网格格式，顶点 16 位量化、含裙边与法线。 |
| Skirt | 裙边；瓦片边缘向下延伸的几何，遮盖相邻瓦片 LOD 不同造成的缝隙。 |
| Fill mesh | 填充网格；瓦片数据未到时用邻居边缘生成的临时几何。 |
| Vertical exaggeration | 垂直夸张，地形高度缩放。 |
| Implicit tiling | 3D Tiles 1.1 隐式瓦片：四叉树 / 八叉树 + 子树可用性位流，不再逐瓦片写 JSON。 |
| Structural metadata | `EXT_structural_metadata` / `3DTILES_metadata` 定义的属性表、类、枚举、语义。 |
| Feature ID | `EXT_mesh_features` 中把顶点 / 纹素映射到要素的 ID。 |

## 渲染与 GPU

| 术语 | 含义 |
| --- | --- |
| RHI | Render Hardware Interface，对 WebGPU 的薄封装：设备、缓冲、纹理、采样器、pipeline 缓存、bind group 缓存。 |
| Render Graph | 帧图：以 pass 为节点、资源为边描述一帧，编译后确定执行顺序、资源别名与生命周期。 |
| Pass | 一次 `GPURenderPassEncoder` 或 `GPUComputePassEncoder` 的工作单元。 |
| RenderItem | 场景层提交给渲染器的最小绘制描述：几何、材质变体、实例数据、排序键。 |
| Pipeline cache | 以（shader 变体哈希，渲染状态，颜色 / 深度目标格式）为键缓存 `GPURenderPipeline`。 |
| Bind group layout 约定 | 固定 group 编号：0 = 帧级（相机、时间、大气），1 = pass 级，2 = 材质，3 = 对象 / 实例。 |
| Reverse-Z | 近平面深度为 1、远平面为 0 的深度约定；配合 `depth32float` 大幅提升远距离深度精度，深度比较函数为 `greater`。 |
| RTE | Relative To Eye，相机相对渲染：CPU 用 f64 计算相对相机的坐标，GPU 只处理小数值，消除大坐标抖动。 |
| High / low split | 把 f64 位置拆为两个 f32（高位 + 低位），GPU 端相减得到相对坐标；Cesium 的 `EncodedCartesian3`。 |
| Uber shader | 用宏 / 常量生成多个变体的单一着色器源码。本项目用 WGSL 模块 + `override` 常量 + 组合器。 |
| Material | 参考 three.js 的材质基类；持有渲染状态（面、混合、深度、模板）与着色参数，派生 `MeshBasicMaterial` `MeshStandardMaterial` `MeshPhysicalMaterial` `LineBasicMaterial` `PointsMaterial` `SpriteMaterial` `ShaderMaterial` 等。 |
| Texture（对象） | 参考 three.js 的纹理对象：源数据、wrap / filter、色彩空间、UV 变换、`needsUpdate`；由 RHI 映射为 `GPUTexture` + `GPUSampler`。 |
| 材质槽位 | 材质中固定编号的纹理绑定位置（`map`、`normalMap`…）；缺失时绑定 1×1 默认纹理并用 defines 跳过采样。 |
| MaterialOutput | 材质片元阶段的统一输出结构（基础色、法线、粗糙度、金属度、自发光、遮蔽、不透明度、材质 ID），由渲染器决定写 G-buffer 或前向着色。 |
| onBeforeCompose | 材质钩子，对应 three.js `onBeforeCompile`：在组合器拼装 WGSL 前注入片段到固定接口点。 |
| Fabric | Cesium 的 JSON + GLSL 材质 DSL，本项目不移植。 |
| NodeMaterial / TSL | three.js 的节点式材质与 Three Shading Language；本项目列为后置 R&D。 |
| Shader 组合器 | 把 WGSL 模块按 `#import` 依赖拼装、处理条件编译并做去重的构建 / 运行期工具。 |
| Override 常量 | WGSL `override` 声明的管线创建期常量，用于变体控制。 |
| Indirect draw | 绘制参数存于 GPU buffer，由 compute 写入，`drawIndirect` / `drawIndexedIndirect` 读取。 |
| GPU-driven | 剔除、LOD 选择、绘制参数生成都在 GPU 上完成，CPU 只提交少量 indirect 调用。 |
| Meshlet | 把网格切成 64–128 三角形的小簇，可按簇做剔除与 LOD；Nanite 的基本单位。 |
| Nanite | UE5 的虚拟化几何：meshlet 层级 DAG + 软光栅 + 可见性缓冲。 |
| Visibility buffer | 每像素存（实例 ID，三角形 ID）的缓冲，延后材质计算。 |
| SVT | Sparse Virtual Texturing，虚拟纹理：巨大逻辑纹理按页驻留在物理纹理图集中，用间接表查找。 |
| VSM | Virtual Shadow Maps，UE5 的虚拟阴影贴图：按页按需渲染的超高分辨率阴影。 |
| CSM | Cascaded Shadow Maps，级联阴影。 |
| G-buffer | 延迟渲染的几何缓冲：法线、基础色、金属 / 粗糙度、运动向量等。 |
| Clustered lighting | 把视锥切成 3D 网格，每个 cluster 存光源列表。 |
| IBL | Image Based Lighting，基于环境贴图的间接光。 |
| GTAO | Ground Truth Ambient Occlusion。 |
| SSR | Screen Space Reflections。 |
| SSGI | Screen Space Global Illumination。 |
| TAA | Temporal Anti-Aliasing。 |
| HDR 输出 | canvas 使用 `rgba16float` 并开启 `toneMapping: { mode: "extended" }`，在 HDR 显示器上输出超过 1.0 的亮度。 |
| Staging buffer | 用于 GPU→CPU 读回的 `MAP_READ` 缓冲；WebGPU 没有同步 `readPixels`。 |
| Timestamp query | GPU 时间戳查询，用于帧时间分解。 |

## 大气、天气与天体

| 术语 | 含义 |
| --- | --- |
| Bruneton 2017 | 预计算大气散射：透射率、单次 / 多次散射、辐照度 LUT。 |
| Hillaire 2020 | 《A Scalable and Production Ready Sky and Atmosphere Rendering Technique》：透射率 LUT + 多次散射 LUT + 天空视图 LUT + 空气透视体纹理，实时计算。 |
| Aerial perspective | 空气透视：远处物体被大气散射染色与衰减。 |
| Weather map | 体积云的 2D 控制纹理：云覆盖率、云类型、降水概率等通道。 |
| Nubis / Schneider | Guerrilla Games 的《Horizon》体积云方案，Perlin-Worley 噪声 + weather map + ray-march。 |
| Perlin-Worley | 体积云基础形状噪声，Perlin 与反向 Worley 的混合。 |
| Cloud fraction | 卫星产品中的云量 / 云覆盖率，用于生成 weather map coverage 通道。 |
| GIBS | NASA Global Imagery Browse Services，提供 MODIS / VIIRS 等卫星产品瓦片。 |
| Simon 1994 | Cesium 使用的日月位置解析历表 `Simon1994PlanetaryPositions`。 |
| IAU 2006 / EOP | 地球自转与极移参数，用于 ICRF ↔ ECEF 变换。 |
| Tessendorf / FFT 海洋 | 用 Phillips / JONSWAP 频谱经逆 FFT 生成海面位移与法线。 |
