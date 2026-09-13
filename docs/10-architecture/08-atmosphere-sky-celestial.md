# 大气、天空与天体

对应 ADR-0008。

## 决策

### 1. 大气模型：Hillaire 2020 为主

采用《A Scalable and Production Ready Sky and Atmosphere Rendering Technique》（Hillaire, EGSR 2020，UE4/5 Sky Atmosphere 的基础）：

| LUT | 尺寸（默认） | 更新频率 | 计算方式 |
| --- | --- | --- | --- |
| Transmittance LUT | 256×64 | 大气参数变化时 | compute |
| Multiple Scattering LUT | 32×32 | 大气参数变化时 | compute（每像素 64 方向积分） |
| Sky-View LUT | 192×108（经纬参数化） | 每帧（相机高度 / 太阳方向变化） | compute |
| Aerial Perspective 体纹理 | 32×32×32（视锥切片） | 每帧 | compute |
| Camera Volume（可选，用于云 / 雾内散射） | 复用 Aerial Perspective | 每帧 | — |

- 参数化保留 Bruneton 的物理量（Rayleigh / Mie 散射与吸收系数、臭氧层、地面反照率、行星半径与大气顶高度），可从 `Ellipsoid` 自动取半径；支持非地球行星与「艺术化」参数。
- **地表与远景**：延迟光照阶段用 Aerial Perspective 体纹理为 G-buffer 中每像素叠加空气透视（透射率 × 颜色 + 内散射）；替代 Cesium 的 `czm_fog` 与 `GroundAtmosphere`。
- **天空**：Sky-View LUT 在天空 pass 采样（远平面填充，Reverse-Z 深度 = 0）；相机在大气层外（太空视角）时退化为直接 ray-march 或用透射率 LUT + 单次散射近似（Hillaire 论文附录处理方式）。
- **太阳光照颜色**：透射率 LUT 在相机 / 地表高度上采样太阳方向，得到经大气衰减的直射光颜色，作为延迟光照的主光颜色。
- **云与大气耦合**：体积云 ray-march 时用透射率 LUT 计算太阳到云的衰减，用 Multiple Scattering LUT 近似环境光；云被大气「包裹」由 Aerial Perspective 叠加。
- 全部 LUT 用 `rgba16float`，compute 生成；参数变化时重算，Sky-View / AP 每帧重算（成本 < 0.2 ms）。

### 2. 备选：Bruneton 2017 预计算

- fork 中 `ThreeGeospatial/Atmosphere` 已有 Bruneton 预计算实现（`BrunetonPrecompute`、`.exr` / `.bin` LUT 资源），质量高、多次散射准确，但：LUT 大（transmittance 256×64、scattering 256×128×32 3D）、预计算慢（毫秒到秒级，参数变化时不能实时）、参数化对相机高度范围有限制。
- 定为备选：若 Hillaire 在高空 / 太空视角出现能量误差不可接受，可在 `environment` 内提供 `BrunetonAtmosphere` 实现同一 `Atmosphere` 接口。

### 3. 太阳、月亮与星空

| 天体 | 位置 | 渲染 |
| --- | --- | --- |
| 太阳 | `Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame` → ICRF → ECEF（`Transforms.computeIcrfToFixedMatrix`，缺 EOP 数据时退化为 `computeTemeToPseudoFixedMatrix`） | 天空 pass 中按角直径（约 0.53°）画日盘，颜色 = 透射率 LUT 衰减后的太阳辐亮度；limb darkening；Bloom 自然产生光晕；镜头光斑作为后处理可选（fork 有 `BrunetonLensFlareStage` 参考） |
| 月亮 | `Simon1994PlanetaryPositions.computeMoonPositionInEarthInertialFrame` | 月盘用月面反照率纹理 + 法线（NASA CGI Moon Kit），光照方向 = 太阳方向，自然得到月相；角直径约 0.52°；地照（earthshine）常量项；夜间月光作为第二方向光进入延迟光照（强度按相位与高度角） |
| 星空 | Hipparcos / Tycho-2 简化星表（约 9000 颗 6.5 等以内），ICRF 方向 + 视星等 + B-V 色指数 → RGB | 点精灵或小四边形，强度按视星等映射到 HDR 亮度；被大气透射率与天空亮度压制（白天不可见）；银河可选用 Gaia 全天图作为低分辨率背景纹理 |
| 行星 | 后置（可用 VSOP87 简化） | 点光 |

- 时间由 `Scene.clock` 提供 `JulianDate`；`Scene.light` 默认 `SunLight`，可替换为 `DirectionalLight` 固定方向。
- 天空 pass 顺序：星空 → 月亮 → 天空散射（覆盖 / 混合）→ 日盘；实际用一个全屏 pass 完成，按深度 = 0 的像素执行。

### 4. 时间驱动的环境状态

`EnvironmentState`（每帧计算，放 group 0 `FrameUniforms`）：太阳方向（ECEF 与视图空间）、太阳辐亮度、月亮方向与相位、地表高度、相机在大气中的高度、曝光基准（按太阳高度角 / 场景亮度自动曝光）。

## 风险

- Hillaire 的 Sky-View LUT 在地平线附近分辩率不足会导致带状；缓解：非线性参数化（论文中已用），必要时提高到 384×216。
- 太空视角下地球边缘的大气光环（limb）与 Cesium 的 `SkyAtmosphere` 视觉差异；需要对比截图。
- 相机穿越大气顶层时的连续性（LUT 参数化切换）。
- EOP / IAU2006 数据加载失败时日月位置有秒级角度误差，对渲染可接受，对精确阴影分析需提示。

## 待验证

- [ ] M4：Hillaire 四张 LUT 在集显上的每帧成本；Sky-View LUT 尺寸取舍。
- [ ] M4：从地表到 400 km 轨道连续飞行时的能量与颜色连续性。
- [ ] M4：太阳辐亮度到显示亮度的曝光映射（物理单位还是相对单位），与 Bloom 阈值配合。
- [ ] M4：星表数据体积（压缩后目标 < 200 KB）与点渲染在 TAA 下的闪烁。
