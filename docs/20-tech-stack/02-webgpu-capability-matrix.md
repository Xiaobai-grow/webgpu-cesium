# WebGPU 能力矩阵与使用策略

更新日期：2026-09-13。每次浏览器版本变化或规范落地时更新本表并在 `LOG.md` 记录。

## 1. 核心能力（无需 feature，直接依赖）

| 能力 | 用途 |
| --- | --- |
| Render / compute pipeline，storage buffer，`texture_2d_array`、`texture_3d`、cube | 全部 |
| `depth32float`、`depth24plus`、`depth24plus-stencil8` | Reverse-Z 用 `depth32float` |
| `rgba16float` 颜色附件与采样 | HDR 中间缓冲、LUT |
| `r32uint` 颜色附件 | 拾取 ID |
| `drawIndirect` / `drawIndexedIndirect` / `dispatchWorkgroupsIndirect` | GPU-driven |
| `copyExternalImageToTexture`（`ImageBitmap`、canvas、`VideoFrame`） | 影像上传 |
| `mapAsync` 读回 | 拾取、反馈、统计 |
| 32 位原子 | 直方图、剔除计数 |
| `override` 常量 | 变体 |
| 渲染 bundle | 静态图元批次可选优化 |
| 保证的限制：`maxTextureDimension2D` 8192、`maxTextureArrayLayers` 256、`maxBindGroups` 4、`maxStorageBufferBindingSize` 128 MB、`maxUniformBufferBindingSize` 64 KB、`maxColorAttachments` 8、`maxVertexAttributes` 16、`maxVertexBuffers` 8 | 设计上限 |

## 2. 可选 feature 使用策略

| Feature | 用途 | 缺失时回退 | 探测时机 |
| --- | --- | --- | --- |
| `timestamp-query` | 帧时间分解、性能面板 | 关闭 GPU 计时，只显示 CPU 时间 | 设备创建 |
| `indirect-first-instance` | indirect 参数携带 `firstInstance` | 用 storage 实例索引表间接寻址 | 设备创建；影响 GPU-driven 变体 |
| `shader-f16` | LUT、噪声、FFT 中间数据、云 ray-march 累加 | f32 版本模块（`#if HAS_F16`） | 设备创建；组合器 define |
| `subgroups` | 剔除压缩、前缀和、自动曝光直方图归约 | 共享内存版本 | 设备创建 |
| `depth-clip-control` | 阴影 pass 关闭深度裁剪（pancaking） | 在顶点着色器中手动夹近平面 | 设备创建 |
| `depth32float-stencil8` | 需要模板的分类 / 裁剪 pass | 用 `depth24plus-stencil8` 单独一次分类 pass（精度低）或不做模板分类 | 设备创建 |
| `float32-filterable` | 双线性采样 f32 LUT / 高度图 | 用 `rgba16float` 或手动双线性 | 设备创建 |
| `texture-compression-bc` | 桌面纹理压缩（glTF KTX2、影像可选） | 转码到 ETC2 / ASTC 或解压为 RGBA8 | 设备创建；KTX2 转码目标格式 |
| `texture-compression-etc2` / `texture-compression-astc` | 移动端 | 同上 | 同上 |
| `rg11b10ufloat-renderable` | 更省带宽的 HDR 颜色缓冲 | `rgba16float` | 设备创建 |
| `bgra8unorm-storage` | 直接 compute 写 canvas 格式 | 中间 `rgba8unorm` + 拷贝 | 设备创建 |
| `dual-source-blending` | 单 pass 双源混合（透明、OIT 变体） | WBOIT 双附件 | 设备创建 |
| `clip-distances` | 裁剪平面用硬件裁剪 | 片元 `discard` | 设备创建 |
| `texture-formats-tier1/2`、`texture-component-swizzle` 等新 feature | 按需 | — | 跟踪 |

策略：

- `GpuDevice.create()` 探测 `adapter.features`，把所有支持且在白名单内的 feature 放入 `requiredFeatures`；上层通过 `device.features.has()` 决定变体与 defines。
- 任何可选 feature 都必须有回退路径，否则不进入承诺范围。
- 限制（`limits`）按需请求更高值（例如 `maxBufferSize`、`maxStorageBufferBindingSize`、`maxTextureDimension2D` 16384 用于虚拟纹理页池），失败时使用核心值并在性能面板提示。

## 3. 尚未落地的能力（跟踪）

| 能力 | 状态（2026-09） | 影响 | 跟踪 |
| --- | --- | --- | --- |
| 64 位原子 min / max（`vec2<u32>` 复合） | WGSL 规范 PR 已获编辑批准，CTS 已合并，浏览器未发布 | Nanite 式软光栅可见性缓冲 | [gpuweb#5071](https://github.com/gpuweb/gpuweb/issues/5071) |
| Bindless（`GPUResourceTable`） | 草案，无浏览器预览，Firefox 表示将做首批实现 | 可见性缓冲材质解析、无限材质纹理 | [gpuweb#5517](https://github.com/gpuweb/gpuweb/issues/5517)、[proposals/bindless.md](https://github.com/gpuweb/gpuweb/blob/main/proposals/bindless.md) |
| Mesh shader | 不在规范，被 bindless 阻塞；wgpu 原生已支持 | meshlet 渲染只能 compute + indirect | gpuweb 议题 |
| Ray tracing | 不在规范 | 不考虑 | — |
| 多线程 / Worker 中的 `GPUDevice`（跨 Worker 共享） | 规范允许在 Worker 中获取设备，但同一设备跨线程共享未定 | 目前主线程渲染，Worker 只做 CPU 工作 | — |
| Compatibility mode | Chrome 已发布（面向 GLES 3.1 设备） | 本项目**不**支持 compatibility mode 的限制（无 `texture_2d_array` 层数缩减等）；探测到 compat 适配器时报错 | — |

## 4. 与 WebGL / Cesium 假设的差异清单（移植时逐条检查）

| 差异 | 影响点 |
| --- | --- |
| 纹理 Y 轴：WebGPU 纹理坐标原点在左上，`copyExternalImageToTexture` 默认不翻转 | Cesium `Texture` 默认 `flipY: true`；影像与 glTF 纹理上传处显式处理 |
| NDC 深度范围 0..1（WebGL 为 -1..1） | 投影矩阵生成（`PerspectiveOffCenterFrustum` 等）需改为 0..1，Reverse-Z 再反转 |
| 帧缓冲 Y 轴：WebGPU 渲染目标原点左上，与 WebGL 相反 | 后处理全屏 UV、`readPixels` 行序、拾取像素坐标 |
| 无同步 `readPixels` / `getBufferSubData` | 拾取、地形采样 GPU 路径、测试断言全部异步 |
| 无 `gl.enable` 即时状态；混合 / 深度 / 剔除进 pipeline | `RenderState` 概念消失 |
| Uniform 需要显式结构布局（`std140` 类似）；不支持 `mat3x3` 紧凑布局 | 反射生成偏移；`mat3` 用三列 `vec4` 或 `mat3x3<f32>` 注意 48 字节 |
| 无 `gl_FragDepth` 之外的深度写入技巧；写深度会关 early-z | 不用 log depth；贴地几何用 `depthBias` |
| 纹理不能在 uniform 数组中动态索引（非 bindless） | 影像层用 `texture_2d_array`；材质纹理槽位固定 |
| 无几何着色器 / transform feedback | 用 compute |
| `discard` 存在但成本考虑不同 | alpha mask 材质仍可用 |
| 顶点属性必须与 pipeline 布局一致，无默认值 | 缺失属性用 defines 关掉代码路径 |
| 采样器与纹理分离；非过滤采样器（`non-filtering`）用于 `r32float` 等 | 深度 / 拾取纹理用 `unfilterable-float` / `uint` 采样类型 |
| 多重采样只在渲染时解析，不能采样 MSAA 纹理（除 `textureLoad`） | TAA 为主，MSAA 仅可选于无后处理模式 |
| 压缩纹理必须整块上传，不支持 `texSubImage` 非对齐 | KTX2 转码结果按 4×4 块对齐 |
| `GPUBuffer` 大小需 4 字节对齐；`writeBuffer` 偏移与大小 4 字节对齐；`copyBufferToBuffer` 4 字节对齐；纹理行 `bytesPerRow` 256 字节对齐 | 上传与读回代码 |
| 设备丢失是一等事件 | `Scene` 处理 `onLost` |
