/**
 * @webgpu-cesium/wgsl-plugin
 *
 * Vite 与 Rolldown（tsdown）共用的 `.wgsl` 导入插件：
 *
 * ```ts
 * import triangleWgsl from "./triangle.wgsl"   // string
 * ```
 *
 * - `load` 钩子读取文件并输出 `export default "<源码>"`，对 Vite 与 Rolldown 都生效；
 * - dev 下 Vite 把 `.wgsl` 纳入模块图，文件变更会沿 importer 传播；importer 未 `import.meta.hot.accept`
 *   时触发整页刷新，因此「修改 .wgsl 浏览器自动刷新」无需额外逻辑；
 * - 只处理 `.wgsl` 后缀（可带 `?raw` 等查询串），不做组合、不做校验——组合器在 @webgpu-cesium/shaders。
 */
import { readFile } from "node:fs/promises"
import type { Plugin as RolldownPlugin } from "rolldown"
import type { Plugin as VitePlugin } from "vite"

const WGSL_RE = /\.wgsl(?:\?.*)?$/

export interface WgslPluginOptions {
  /**
   * 是否在输出中保留源码原样（默认 true）。
   * 设为 false 时去掉每行首尾空白，用于减小生产包体；行号映射由组合器负责，不受影响。
   */
  preserveWhitespace?: boolean
}

/** 去掉查询串，得到磁盘路径 */
function stripQuery(id: string): string {
  const index = id.indexOf("?")
  return index === -1 ? id : id.slice(0, index)
}

/** 把 WGSL 源码转成 ES 模块源码 */
export function wgslToModule(source: string, options: WgslPluginOptions = {}): string {
  const preserve = options.preserveWhitespace ?? true
  // 统一为 LF，避免 Windows 检出（CRLF）导致产物与哈希随平台变化
  const normalized = source.replace(/\r\n?/g, "\n")
  const text = preserve
    ? normalized
    : normalized
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
  return `export default ${JSON.stringify(text)}\n`
}

/**
 * 创建插件实例。返回类型同时满足 Vite 与 Rolldown 的 Plugin 接口（两者钩子签名一致）。
 */
export function wgsl(options: WgslPluginOptions = {}): VitePlugin & RolldownPlugin {
  return {
    name: "webgpu-cesium:wgsl",
    // Vite 专用：先于内置 load 兜底插件运行；Rolldown 忽略该字段
    enforce: "pre",

    async load(id: string) {
      if (!WGSL_RE.test(id)) {
        return null
      }
      const source = await readFile(stripQuery(id), "utf8")
      return {
        code: wgslToModule(source, options),
        map: null,
        // 告知 Vite 该模块已是 JS，避免再被其它 transform 当作未知类型处理
        moduleType: "js",
      }
    },
  } as VitePlugin & RolldownPlugin
}

export default wgsl
