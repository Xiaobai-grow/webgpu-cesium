/**
 * 在不引入 DOM lib 的前提下拿到 WHATWG URL 构造器。
 */

export interface UrlLike {
  href: string
  pathname: string
  search: string
  hash: string
  protocol: string
  host: string
}

export type UrlConstructor = new (url: string, base?: string) => UrlLike

/**
 * `globalThis.URL`，Node 22 与浏览器均有；类型上避开 DOM。
 */
export function getUrlConstructor(): UrlConstructor | undefined {
  const ctor = (globalThis as Record<string, unknown>).URL
  return typeof ctor === "function" ? (ctor as UrlConstructor) : undefined
}
