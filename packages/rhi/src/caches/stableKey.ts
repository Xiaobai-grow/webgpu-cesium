/**
 * 描述符 → 稳定字符串键。
 *
 * - 对象键按字典序排序，数组保持顺序，`undefined` 成员忽略；
 * - GPU 对象（GPUShaderModule、GPUBindGroupLayout、GPUPipelineLayout、GPUBuffer、GPUTexture…）
 *   不能序列化，用 WeakMap 分配的递增 id 代替（`"@<id>"`）；
 * - `label` 字段不参与键（同一描述不同标签视为同一对象）。
 */

const objectIds = new WeakMap<object, number>()
let nextObjectId = 1

/** 取得任意对象的稳定 id（同一对象多次调用返回同一值） */
export function getObjectId(object: object): number {
  let id = objectIds.get(object)
  if (id === undefined) {
    id = nextObjectId++
    objectIds.set(object, id)
  }
  return id
}

/** 判断是否为不可序列化的宿主对象（原型不是 Object / Array / null） */
function isHostObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value) as object | null
  return proto !== null && proto !== Object.prototype && proto !== Array.prototype
}

function serialize(value: unknown, out: string[]): void {
  if (value === null) {
    out.push("null")
    return
  }
  switch (typeof value) {
    case "string":
      out.push(JSON.stringify(value))
      return
    case "number":
    case "boolean":
    case "bigint":
      out.push(String(value))
      return
    case "undefined":
      out.push("u")
      return
    case "object":
      break
    default:
      // function / symbol：用 id 代替
      out.push(`@${String(getObjectId(value))}`)
      return
  }

  const object: object = value
  if (Array.isArray(object)) {
    out.push("[")
    for (let i = 0; i < object.length; i++) {
      if (i > 0) {
        out.push(",")
      }
      serialize(object[i], out)
    }
    out.push("]")
    return
  }
  // Iterable（如 Set）按顺序序列化
  if (isHostObject(object)) {
    out.push(`@${String(getObjectId(object))}`)
    return
  }
  const record = object as Record<string, unknown>
  const keys = Object.keys(record)
    .filter((key) => key !== "label" && record[key] !== undefined)
    .sort()
  out.push("{")
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!
    if (i > 0) {
      out.push(",")
    }
    out.push(key, ":")
    serialize(record[key], out)
  }
  out.push("}")
}

/** 生成稳定键 */
export function stableKey(value: unknown): string {
  const out: string[] = []
  serialize(value, out)
  return out.join("")
}
