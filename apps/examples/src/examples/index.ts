/**
 * 示例注册表。每个示例是一个 `.ts` 模块，导出 `run(canvas): Promise<() => void>`（返回清理函数）。
 * 新增示例：在 `src/examples/` 下新建文件并在此登记；Playwright 会按此表遍历截图（后续）。
 */
export type ExampleCleanup = () => void
export type ExampleRun = (canvas: HTMLCanvasElement) => Promise<ExampleCleanup>

export interface ExampleModule {
  run: ExampleRun
}

export interface ExampleEntry {
  id: string
  title: string
  description: string
  /** 里程碑标签 */
  milestone: string
  /** 哈希路由查询，例如 `{ terrain: "mars3d" }` */
  query?: Record<string, string>
  load: () => Promise<ExampleModule>
}

export const EXAMPLES: readonly ExampleEntry[] = [
  {
    id: "hello-triangle",
    title: "Hello Triangle",
    description: "GpuDevice + RenderGraph + WGSL 组合器：随时间旋转的彩色三角形",
    milestone: "M0",
    load: () => import("./hello-triangle"),
  },
  {
    id: "hello-globe",
    title: "Globe / OSM",
    description: "零高度椭球 + OpenStreetMap 影像 + Reverse-Z / RTE 相机",
    milestone: "M2",
    load: () => import("./hello-globe"),
  },
  {
    id: "hello-terrain",
    title: "Terrain / Heightmap",
    description: "自定义高度图山体（对比 hello-globe 零高度）；可选 ion 世界地形",
    milestone: "M3",
    load: () => import("./hello-terrain"),
  },
  {
    id: "hello-terrain-china",
    title: "Terrain / 中国（mars3d）",
    description:
      "CesiumTerrainProvider.fromUrl 接 mars3d 中国 quantized-mesh（需访问 data.mars3d.cn）",
    milestone: "M3",
    query: { terrain: "mars3d" },
    load: () => import("./hello-terrain"),
  },
]

export function findExample(id: string): ExampleEntry | undefined {
  return EXAMPLES.find((entry) => entry.id === id)
}
