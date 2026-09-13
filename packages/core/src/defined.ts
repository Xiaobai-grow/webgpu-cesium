/**
 * 判断值既不是 `undefined` 也不是 `null`，并收窄类型。
 *
 * 与 Cesium `Core/defined.js` 语义一致；TS 版本增加类型收窄。
 * TODO(M1): 移植时保留本签名。
 */
export function defined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}
