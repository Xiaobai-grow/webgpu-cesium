# Shader 系统（WGSL）

对应 ADR-0003：手写 WGSL，不做 GLSL 转译。

## 决策

### 1. 源码组织

```
packages/shaders/src/
  builtin/                    对标 Cesium Shaders/Builtin：常量、结构体、函数
    constants.wgsl            PI、椭球常量、EPSILON
    frame.wgsl                FrameUniforms 结构体与 group 0 绑定声明
    transforms.wgsl           模型 / 视图 / 投影、RTE 高低位合成、法线变换
    ellipsoid.wgsl            椭球求交、地表法线、经纬高 ↔ 笛卡尔
    depth.wgsl                Reverse-Z 线性化、重建世界位置
    encoding.wgsl             八面体法线编码、RGBA 打包、颤动
    color.wgsl                sRGB ↔ 线性、色域、亮度
    noise.wgsl                hash、value / simplex / worley、STBN 采样
    pbr.wgsl                  BRDF、Fresnel、IBL 采样
    shadow.wgsl               级联选择、PCF / PCSS
  globe/                      地形与影像合成
  materials/                  three.js 风格材质的 WGSL 实现（basic / standard / physical / line / points / sprite / gis-*）与 hooks/ 接口点
  model/                      glTF 蒙皮、变形、实例化、要素 ID、样式（材质着色走 materials/）
  primitives/                 polyline / polygon / billboard / label / point
  atmosphere/                 Hillaire LUT 与天空、空气透视
  clouds/                     体积云 ray-march、weather map、重投影
  weather/                    粒子、雾、湿润
  ocean/                      FFT、法线、着色
  lighting/                   clustered light 分配、延迟光照
  post/                       TAA、GTAO、SSR、Bloom、Tonemap、FXAA
  pick/                       ID 输出
  compose/                    组合器实现（TS）
  reflect/                    反射实现（TS）
```

文件后缀：`.wgsl`；Vite / tsdown 通过插件按 `?raw` 字符串导入。所有 `.wgsl` 都是**模块**，没有独立入口概念；入口由 TS 侧的 `ShaderDescriptor` 指定。

### 2. 组合器（compose）

WGSL 本身没有 include / 宏。组合器是一个纯字符串处理器（放在 `shaders` 包，无 GPU 依赖），支持：

| 指令 | 语义 |
| --- | --- |
| `#import "builtin/transforms.wgsl"` | 依赖引入，拓扑排序、去重，循环依赖报错 |
| `#import "x.wgsl" as ns` | 可选命名空间前缀（函数名加前缀避免冲突） |
| `#if FEATURE_X` / `#elif` / `#else` / `#endif` | 编译期条件，`FEATURE_X` 来自 TS 侧的 defines 对象（布尔或整数比较） |
| `#define_import_path pkg/module` | 模块自声明路径（对齐 naga_oil 风格），便于第三方扩展模块 |
| `override NAME: type = default;` | 原生 WGSL，运行期 pipeline 创建时赋值，优先于 `#if` 用于数值型变体（如级联数、采样步数） |
| `@binding_auto` | 自动分配 binding 编号（规范化后由反射输出真实编号，避免手写冲突） |

原则：

- **条件编译只用于「结构性」差异**（有没有某个纹理输入、有没有蒙皮）；**数值差异用 `override`**，减少源码变体数。
- 组合器输出**规范化源码**（去注释、统一空白），其哈希即 pipeline 缓存键的一部分。
- 组合结果在开发模式下缓存到 `Map`，生产模式可预生成（构建期把常用变体预组合成静态字符串，减少运行时开销）。
- 错误信息映射回原始文件与行号（保留 `// @source file:line` 标记，`GPUCompilationInfo` 的行号可反查）。

### 3. 绑定布局约定

| Group | 用途 | 更新频率 | 内容 |
| --- | --- | --- | --- |
| 0 | 帧级 | 每帧一次 | `FrameUniforms`（视图 / 投影 / 逆矩阵、相机位置高低位、视口、时间、日月方向、大气参数、曝光）、通用采样器、大气 LUT、阴影图、蓝噪声 |
| 1 | Pass 级 | 每 pass | G-buffer 输入、深度、历史帧、pass 专属参数 |
| 2 | 材质 | 每材质 | 材质 uniform、纹理与采样器、样式表 |
| 3 | 对象 / 实例 | 每对象或动态偏移 | 模型矩阵（RTE 高低位）、实例 storage 数组、要素 ID 表、瓦片专属数据 |

- 顶点属性位置固定：0 = position（或 position high），1 = position low，2 = normal，3 = tangent，4 = texcoord0，5 = texcoord1，6 = color，7 = joints，8 = weights，9 = featureId0，10+ 自定义。地形与 glTF 都对齐这一约定，减少 pipeline 变体。
- 结构体布局用 `std140`-兼容的显式 `@align` / `@size`，TS 侧用反射生成 offset 表，不手写偏移。

### 4. 反射（reflect）

用 WGSL 解析（候选：`wgsl_reflect`；若覆盖不足则自研基于 `wesl` / 简易 tokenizer 的子集解析）从规范化源码提取：

- 各 group / binding 的类型（uniform / storage / texture / sampler）、访问模式、纹理维度与采样类型；
- uniform / storage 结构体的成员偏移与大小；
- 顶点入口的属性位置与类型；
- 片元入口的输出位置与数量（用于校验颜色附件数）；
- `override` 常量列表与默认值。

反射结果用于：自动创建 `GPUBindGroupLayout`、校验材质参数对象、生成 TS 类型（开发时脚本），以及在开发模式校验 RenderItem 提供的资源是否完整。

### 5. 命名与风格

- 文件与模块路径 kebab-case；函数 camelCase；结构体 PascalCase；常量 UPPER_SNAKE_CASE；uniform 结构体成员 camelCase。
- 内置函数前缀不再用 `czm_`；用命名空间目录区分（`ellipsoid_intersect`、`depth_linearize` 由 `as` 前缀生成，或直接靶向名 `intersectEllipsoid`）。最终选一种并在 M0 前确定，写进本节。
- 每个 `.wgsl` 顶部有注释头：用途、依赖的 defines、期望的 group 绑定。
- 用 `wgsl-analyzer` 做语法检查与格式化（编辑器与 CI）。

### 6. 自定义着色器（对标 `CustomShader`，落地在材质系统）

两条路径，均见 [12-material-system.md](12-material-system.md)：

- **`ShaderMaterial`**：用户提供完整的 WGSL 顶点 / 片元模块（可 `#import` 内置模块与 `builtin/frame.wgsl`），片元输出 `MaterialOutput`（走延迟 / 前向统一光照）或 `rawOutput`（直接输出颜色）；`uniforms` 对象经反射生成 group 2 布局。
- **`Material.onBeforeCompose(shader)`**：对内置材质在七个固定接口点注入 WGSL 片段（`vertex_position` `vertex_output` `material_baseColor` `material_normal` `material_roughnessMetalness` `material_emissive` `material_output`），并可追加 uniform；Model 管线阶段使用同一组接口点，阶段先于用户钩子执行。
- 不接受 GLSL；不兼容 Cesium `CustomShader` 语法（非目标）。

## 备选

- **GLSL → WGSL 转译（naga / tint WASM）**：可复用 Cesium 641 个 GLSL 与 `ShaderBuilder`，但 Cesium GLSL 深度绑定 WebGL 的 uniform / 多视锥 / log depth 模型，转译后仍要重写绝大部分逻辑；调试与错误定位差；引入 WASM 体积。否决（ADR-0003）。
- **TSL 式 JS 节点图生成 WGSL（three.js TSL）**：表达力强但学习成本与实现成本高，且对 GIS 特有着色（地形合成、样式）收益小。否决，后续若做可视化材质编辑器再评估。
- **直接采用 naga_oil / wesl 现成组合器**：`wesl` 是社区标准化方向，值得跟踪；M0 先自研最小子集（import / if / override 透传），若 `wesl` 的 JS 实现稳定则迁移。记为待验证。

## 风险

- 手写 WGSL 工作量大：Cesium 有 641 个 GLSL 文件。缓解：本项目不需要 1:1 复制（2D / Columbus / log depth / 多视锥全删；Appearance / Fabric 材质不移植），首批实际需要的是 globe、model、primitives、atmosphere、post 约 80–120 个模块。
- WGSL 缺少的语言特性（无枚举、无函数指针、纹理不能放数组除 binding_array 未落地）会让材质系统难以泛化。缓解：材质用「固定槽位 + 条件编译」，纹理数组用 `texture_2d_array` 图集。
- 反射库对新语法（`subgroups`、`f16`、`enable` 指令）支持滞后。缓解：反射输入是组合器输出，可先剥离 `enable` 行再解析。

## 待验证

- [ ] M0：自研组合器最小子集 + `wgsl_reflect` 能否覆盖三角形与清屏；错误行号映射效果。
- [ ] M2：地形着色器（影像合成 N 层）用 `override` 层数 vs `#if` 展开的 pipeline 数与性能。
- [ ] M4：group 0 `FrameUniforms` 结构大小是否超过 `maxUniformBufferBindingSize` 的保守值（64 KB），大气 LUT 是否需要独立 group。
- [ ] M5：Model 管线阶段的「接口点」设计能否同时支持内部阶段与用户自定义着色器。
