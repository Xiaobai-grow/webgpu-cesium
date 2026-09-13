# ADR-0009：云图数据源与 weather map 生成方式

- 状态：提议（M7 开始前需确认数据源可用性后转为已接受）
- 日期：2026-09-13
- 相关文档：[10-architecture/09-clouds-and-weather.md](../10-architecture/09-clouds-and-weather.md)

## 背景

用户要求体积云「使用真实的云图生成」。体积云渲染需要 weather map（覆盖率、类型、云顶高、降水）；真实数据来自卫星云产品。需要决定：数据源、获取方式、预处理、更新频率、离线回退。

## 候选方案

| 方案 | 数据 | 更新 | 分辩率 | 获取 | 优点 | 缺点 |
| --- | --- | --- | --- | --- | --- | --- |
| A. NASA GIBS（MODIS Terra / Aqua、VIIRS） | `Cloud_Fraction`、`Cloud_Top_Height`、`Cloud_Optical_Thickness`、`Cloud_Top_Temperature` | 每日（部分近实时 ~3 h） | 约 5–10 km | WMTS / WMS，支持 CORS，免费无密钥 | 物理量齐全，可推断云类型与高度；可靠稳定 | 非实时；日间产品有轨道缝隙 |
| B. 静止卫星合成（GOES-16 / 18、Himawari-9、Meteosat） | 可见 / 红外通道，云掩码 | 10–15 min | 2–4 km | 需自建合成服务（AWS 公开数据集）或第三方 | 实时感强 | 需要服务器；工作量大；CORS 与配额 |
| C. 商业 / 社区瓦片（OpenWeatherMap、RainViewer、Windy） | 渲染后的云层 RGBA 瓦片 | 实时 | 中等 | 需 API key，CORS 视服务而定 | 接入快 | 无物理量，只能反推覆盖率；许可限制 |
| D. 数值天气模型（GFS / ECMWF Open Data） | 云量分层（低 / 中 / 高）、降水、风 | 6 h，预报到未来 | 0.25°（约 25 km） | GRIB2，需要服务端转换 | 有分层云量与预报，可驱动天气系统 | 分辩率低；需要服务端 |
| E. 内置离线快照 | 一张压缩的全球云量图（源自 A） | 静态 | — | 打包资源 | 零依赖 | 不真实 |

## 提议的决策

- 定义 `WeatherMapProvider` 接口（类似 `ImageryProvider`）：`requestWeatherMap(time: JulianDate, level: number): Promise<WeatherMapTile>`，输出通道：coverage、type、topHeight、precipitation。
- 默认实现 `GibsWeatherMapProvider`（方案 A）：拉取 `Cloud_Fraction` + `Cloud_Top_Height`（可选 `Cloud_Optical_Thickness`）等经纬 WMTS 瓦片，Worker 内拼成全球图，插值最近两天数据，缝隙用时间相邻数据填补，叠加低频噪声。
- 内置 `StaticWeatherMapProvider`（方案 E）作为离线 / 无网默认。
- `ProceduralWeatherMapProvider` 用于艺术化 / 演示。
- 方案 D 作为 `WeatherSystem` 的可选 `WeatherProvider`（分层云量、降水、风），后置。
- 方案 B、C 不做官方实现，接口允许用户自行实现。

## 理由

- A 是唯一免费、无密钥、支持 CORS、带物理量的全球源，适合作默认。
- 实时静止卫星（B）需要服务端，超出客户端库范围。

## 待确认（转为已接受前）

- [ ] GIBS 图层名称、瓦片矩阵、可用时间范围与近实时延迟实测。
- [ ] 一次全球拼图的请求数（等经纬 2048×1024 约需 32 个 512 瓦片）与 Worker 处理时间。
- [ ] 云顶高度 → 云类型映射规则的视觉效果。
- [ ] 许可与署名要求（GIBS 需展示 NASA 署名，走 `Credit`）。

## 后果

- M7 前需要一个独立的数据实验（脚本级），结果写回本 ADR 并转状态。
- `Credit` 系统需支持天气数据源署名。
