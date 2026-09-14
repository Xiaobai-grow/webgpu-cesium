/**
 * accessor → typed array（含 stride / 量化解码到 f32）。
 */
import { RuntimeError } from "@webgpu-cesium/core"
import { GLTF_COMPONENT, GLTF_TYPE_COMPONENTS, type GltfJson } from "./types"

/**
 * 读 accessor 为 Float32（位置 / 法线 / UV）或整数索引。
 *
 * @param gltf JSON
 * @param buffers 已解析 buffer
 * @param accessorIndex accessor
 * @param asIndex 是否索引
 */
export function getAccessorData(
  gltf: GltfJson,
  buffers: readonly Uint8Array[],
  accessorIndex: number,
  asIndex = false,
): Float32Array | Uint16Array | Uint32Array {
  const accessor = gltf.accessors?.[accessorIndex]
  if (!accessor) {
    throw new RuntimeError(`Missing accessor ${String(accessorIndex)}.`)
  }
  const components = GLTF_TYPE_COMPONENTS[accessor.type] ?? 1
  const count = accessor.count
  const componentType = accessor.componentType
  const view =
    accessor.bufferView !== undefined ? gltf.bufferViews?.[accessor.bufferView] : undefined
  const byteOffset = (view?.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const buffer = view !== undefined ? buffers[view.buffer] : undefined
  if (!buffer) {
    return asIndex ? new Uint16Array(0) : new Float32Array(count * components)
  }
  const elementBytes = componentSize(componentType) * components
  const stride = view?.byteStride ?? elementBytes
  const src = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  if (asIndex) {
    if (componentType === GLTF_COMPONENT.UNSIGNED_INT) {
      const dest = new Uint32Array(count)
      for (let i = 0; i < count; i++) {
        dest[i] = readComponent(src, byteOffset + i * stride, componentType)
      }
      return dest
    }
    const dest = new Uint16Array(count)
    for (let i = 0; i < count; i++) {
      dest[i] = readComponent(src, byteOffset + i * stride, componentType)
    }
    return dest
  }
  const dest = new Float32Array(count * components)
  const normalized = accessor.normalized === true
  for (let i = 0; i < count; i++) {
    const row = byteOffset + i * stride
    for (let c = 0; c < components; c++) {
      const raw = readComponent(src, row + c * componentSize(componentType), componentType)
      dest[i * components + c] = normalized ? normalize(raw, componentType) : raw
    }
  }
  return dest
}

function componentSize(componentType: number): number {
  switch (componentType) {
    case GLTF_COMPONENT.BYTE:
    case GLTF_COMPONENT.UNSIGNED_BYTE:
      return 1
    case GLTF_COMPONENT.SHORT:
    case GLTF_COMPONENT.UNSIGNED_SHORT:
      return 2
    case GLTF_COMPONENT.UNSIGNED_INT:
    case GLTF_COMPONENT.FLOAT:
      return 4
    default:
      throw new RuntimeError(`Unsupported componentType ${String(componentType)}.`)
  }
}

function readComponent(view: DataView, offset: number, componentType: number): number {
  switch (componentType) {
    case GLTF_COMPONENT.BYTE:
      return view.getInt8(offset)
    case GLTF_COMPONENT.UNSIGNED_BYTE:
      return view.getUint8(offset)
    case GLTF_COMPONENT.SHORT:
      return view.getInt16(offset, true)
    case GLTF_COMPONENT.UNSIGNED_SHORT:
      return view.getUint16(offset, true)
    case GLTF_COMPONENT.UNSIGNED_INT:
      return view.getUint32(offset, true)
    case GLTF_COMPONENT.FLOAT:
      return view.getFloat32(offset, true)
    default:
      throw new RuntimeError(`Unsupported componentType ${String(componentType)}.`)
  }
}

function normalize(value: number, componentType: number): number {
  switch (componentType) {
    case GLTF_COMPONENT.BYTE:
      return Math.max(value / 127, -1)
    case GLTF_COMPONENT.UNSIGNED_BYTE:
      return value / 255
    case GLTF_COMPONENT.SHORT:
      return Math.max(value / 32767, -1)
    case GLTF_COMPONENT.UNSIGNED_SHORT:
      return value / 65535
    default:
      return value
  }
}
