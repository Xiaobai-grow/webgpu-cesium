/**
 * 稳定字符串哈希（cyrb53 变体，53 位，输出 14 位十六进制）。
 *
 * 同步、无依赖、速度快，用于组合结果与 pipeline 描述的缓存键。不用于安全场景。
 */
export function hashString(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const high = (h2 >>> 0) & 0x1fffff
  const low = h1 >>> 0
  return high.toString(16).padStart(6, "0") + low.toString(16).padStart(8, "0")
}
