/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * quantized-mesh-1.0 二进制：解析与测试用编码。
 */

import { AttributeCompression } from "./AttributeCompression"
import { BoundingSphere } from "./BoundingSphere"
import { Cartesian3 } from "./Cartesian3"
import { getJsonFromTypedArray } from "./getJsonFromTypedArray"
import { IndexDatatype } from "./IndexDatatype"
import { OrientedBoundingBox } from "./OrientedBoundingBox"
import type { Rectangle } from "./Rectangle"
import type { Ellipsoid } from "./Ellipsoid"

/** 量化网格扩展 ID。对标 Cesium QuantizedMeshExtensionIds */
export const QuantizedMeshExtensionIds = Object.freeze({
  OCT_VERTEX_NORMALS: 1,
  WATER_MASK: 2,
  METADATA: 4,
})

/** 量化网格解析结果 */
export interface QuantizedMeshParseResult {
  center: Cartesian3
  minimumHeight: number
  maximumHeight: number
  boundingSphere: BoundingSphere
  horizonOcclusionPoint: Cartesian3
  quantizedVertices: Uint16Array
  indices: Uint16Array | Uint32Array
  westIndices: number[]
  southIndices: number[]
  eastIndices: number[]
  northIndices: number[]
  encodedNormals: Uint8Array | undefined
  waterMask: Uint8Array | undefined
  metadata: unknown
}

/** 解析选项 */
export interface ParseQuantizedMeshOptions {
  littleEndianExtensionSize?: boolean
  requestVertexNormals?: boolean
  requestWaterMask?: boolean
  requestMetadata?: boolean
}

const MAX_SHORT = 32767

/**
 * 高水位索引解码（webgl-loader / Cesium）。
 *
 * @param indices 索引（就地改写）
 */
export function decodeHighWaterMarkIndices(indices: Uint16Array | Uint32Array): void {
  let highest = 0
  for (let i = 0; i < indices.length; ++i) {
    const code = indices[i] ?? 0
    indices[i] = highest - code
    if (code === 0) {
      ++highest
    }
  }
}

/**
 * 高水位索引编码。
 *
 * @param indices 原始索引
 */
export function encodeHighWaterMarkIndices(indices: ArrayLike<number>): number[] {
  const encoded: number[] = []
  let highest = 0
  for (let i = 0; i < indices.length; ++i) {
    const value = indices[i] ?? 0
    encoded.push(highest - value)
    if (value === highest) {
      ++highest
    }
  }
  return encoded
}

function zigZagEncode(value: number): number {
  return ((value << 1) ^ (value >> 31)) >>> 0
}

/**
 * 对 u/v/height 做 zig-zag delta 编码（zigZagDeltaDecode 的逆）。
 *
 * @param values 绝对值序列
 */
export function zigZagDeltaEncode(values: ArrayLike<number>): Uint16Array {
  const out = new Uint16Array(values.length)
  let previous = 0
  for (let i = 0; i < values.length; ++i) {
    const value = values[i] ?? 0
    const delta = value - previous
    out[i] = zigZagEncode(delta) & 0xffff
    previous = value
  }
  return out
}

/**
 * 解析 quantized-mesh 瓦片缓冲。
 *
 * @param buffer 二进制
 * @param options 扩展开关
 */
export function parseQuantizedMesh(
  buffer: ArrayBuffer,
  options?: ParseQuantizedMeshOptions,
): QuantizedMeshParseResult {
  const littleEndianExtensionSize = options?.littleEndianExtensionSize ?? true
  const requestVertexNormals = options?.requestVertexNormals ?? false
  const requestWaterMask = options?.requestWaterMask ?? false
  const requestMetadata = options?.requestMetadata ?? false

  let pos = 0
  const view = new DataView(buffer)
  const center = new Cartesian3(
    view.getFloat64(pos, true),
    view.getFloat64(pos + 8, true),
    view.getFloat64(pos + 16, true),
  )
  pos += 24

  const minimumHeight = view.getFloat32(pos, true)
  pos += 4
  const maximumHeight = view.getFloat32(pos, true)
  pos += 4

  const boundingSphere = new BoundingSphere(
    new Cartesian3(
      view.getFloat64(pos, true),
      view.getFloat64(pos + 8, true),
      view.getFloat64(pos + 16, true),
    ),
    view.getFloat64(pos + 24, true),
  )
  pos += 32

  const horizonOcclusionPoint = new Cartesian3(
    view.getFloat64(pos, true),
    view.getFloat64(pos + 8, true),
    view.getFloat64(pos + 16, true),
  )
  pos += 24

  const vertexCount = view.getUint32(pos, true)
  pos += 4
  const encodedVertexBuffer = new Uint16Array(buffer, pos, vertexCount * 3)
  pos += vertexCount * 6

  const uBuffer = encodedVertexBuffer.subarray(0, vertexCount)
  const vBuffer = encodedVertexBuffer.subarray(vertexCount, 2 * vertexCount)
  const heightBuffer = encodedVertexBuffer.subarray(vertexCount * 2, 3 * vertexCount)
  AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer)

  let bytesPerIndex = Uint16Array.BYTES_PER_ELEMENT
  if (vertexCount > 64 * 1024) {
    bytesPerIndex = Uint32Array.BYTES_PER_ELEMENT
  }
  if (pos % bytesPerIndex !== 0) {
    pos += bytesPerIndex - (pos % bytesPerIndex)
  }

  const triangleCount = view.getUint32(pos, true)
  pos += 4
  const indices = IndexDatatype.createTypedArrayFromArrayBuffer(
    vertexCount,
    buffer,
    pos,
    triangleCount * 3,
  )
  pos += triangleCount * 3 * bytesPerIndex
  decodeHighWaterMarkIndices(indices)

  const readEdge = (): number[] => {
    const count = view.getUint32(pos, true)
    pos += 4
    const edge = IndexDatatype.createTypedArrayFromArrayBuffer(vertexCount, buffer, pos, count)
    pos += count * bytesPerIndex
    return Array.from(edge)
  }

  const westIndices = readEdge()
  const southIndices = readEdge()
  const eastIndices = readEdge()
  const northIndices = readEdge()

  let encodedNormals: Uint8Array | undefined
  let waterMask: Uint8Array | undefined
  let metadata: unknown
  while (pos < view.byteLength) {
    const extensionId = view.getUint8(pos)
    pos += 1
    const extensionLength = view.getUint32(pos, littleEndianExtensionSize)
    pos += 4
    if (extensionId === QuantizedMeshExtensionIds.OCT_VERTEX_NORMALS && requestVertexNormals) {
      encodedNormals = new Uint8Array(buffer, pos, vertexCount * 2)
    } else if (extensionId === QuantizedMeshExtensionIds.WATER_MASK && requestWaterMask) {
      waterMask = new Uint8Array(buffer, pos, extensionLength)
    } else if (extensionId === QuantizedMeshExtensionIds.METADATA && requestMetadata) {
      const stringLength = view.getUint32(pos, true)
      if (stringLength > 0) {
        metadata = getJsonFromTypedArray(new Uint8Array(buffer), pos + 4, stringLength)
      }
    }
    pos += extensionLength
  }

  return {
    center,
    minimumHeight,
    maximumHeight,
    boundingSphere,
    horizonOcclusionPoint,
    quantizedVertices: encodedVertexBuffer,
    indices,
    westIndices,
    southIndices,
    eastIndices,
    northIndices,
    encodedNormals,
    waterMask,
    metadata,
  }
}

/** 编码输入（测试 / 合成瓦片） */
export interface EncodeQuantizedMeshInput {
  quantizedU: ArrayLike<number>
  quantizedV: ArrayLike<number>
  quantizedHeight: ArrayLike<number>
  indices: ArrayLike<number>
  minimumHeight: number
  maximumHeight: number
  center?: Cartesian3
  boundingSphere?: BoundingSphere
  horizonOcclusionPoint?: Cartesian3
  westIndices: ArrayLike<number>
  southIndices: ArrayLike<number>
  eastIndices: ArrayLike<number>
  northIndices: ArrayLike<number>
  encodedNormals?: Uint8Array
  waterMask?: Uint8Array
}

/**
 * 编码 quantized-mesh 瓦片（供单测与合成地形）。
 *
 * @param input 已量化的 u/v/h 与索引
 */
export function encodeQuantizedMesh(input: EncodeQuantizedMeshInput): ArrayBuffer {
  const vertexCount = input.quantizedU.length
  const triangleCount = (input.indices.length / 3) | 0
  const uEnc = zigZagDeltaEncode(input.quantizedU)
  const vEnc = zigZagDeltaEncode(input.quantizedV)
  const hEnc = zigZagDeltaEncode(input.quantizedHeight)
  const indexEncoded = encodeHighWaterMarkIndices(input.indices)

  const use32 = vertexCount > 64 * 1024
  const bytesPerIndex = use32 ? 4 : 2
  const vertexBytes = 4 + vertexCount * 6
  const afterVertices = 88 + vertexBytes
  const pad =
    afterVertices % bytesPerIndex === 0 ? 0 : bytesPerIndex - (afterVertices % bytesPerIndex)

  const edgeBytes =
    16 +
    (input.westIndices.length +
      input.southIndices.length +
      input.eastIndices.length +
      input.northIndices.length) *
      bytesPerIndex
  const indexBytes = 4 + triangleCount * 3 * bytesPerIndex
  let extensionBytes = 0
  if (input.encodedNormals) {
    extensionBytes += 5 + input.encodedNormals.byteLength
  }
  if (input.waterMask) {
    extensionBytes += 5 + input.waterMask.byteLength
  }

  const total = 88 + vertexBytes + pad + indexBytes + edgeBytes + extensionBytes
  const buffer = new ArrayBuffer(total)
  const view = new DataView(buffer)
  const center = input.center ?? Cartesian3.ZERO
  const sphere = input.boundingSphere ?? new BoundingSphere(center, 1)
  const hop = input.horizonOcclusionPoint ?? new Cartesian3(1, 0, 0)

  let pos = 0
  view.setFloat64(pos, center.x, true)
  view.setFloat64(pos + 8, center.y, true)
  view.setFloat64(pos + 16, center.z, true)
  pos += 24
  view.setFloat32(pos, input.minimumHeight, true)
  pos += 4
  view.setFloat32(pos, input.maximumHeight, true)
  pos += 4
  view.setFloat64(pos, sphere.center.x, true)
  view.setFloat64(pos + 8, sphere.center.y, true)
  view.setFloat64(pos + 16, sphere.center.z, true)
  view.setFloat64(pos + 24, sphere.radius, true)
  pos += 32
  view.setFloat64(pos, hop.x, true)
  view.setFloat64(pos + 8, hop.y, true)
  view.setFloat64(pos + 16, hop.z, true)
  pos += 24
  view.setUint32(pos, vertexCount, true)
  pos += 4
  const verts = new Uint16Array(buffer, pos, vertexCount * 3)
  verts.set(uEnc, 0)
  verts.set(vEnc, vertexCount)
  verts.set(hEnc, vertexCount * 2)
  pos += vertexCount * 6
  pos += pad
  view.setUint32(pos, triangleCount, true)
  pos += 4
  for (let i = 0; i < indexEncoded.length; i++) {
    if (use32) {
      view.setUint32(pos, indexEncoded[i] ?? 0, true)
      pos += 4
    } else {
      view.setUint16(pos, indexEncoded[i] ?? 0, true)
      pos += 2
    }
  }
  const writeEdge = (edge: ArrayLike<number>): void => {
    view.setUint32(pos, edge.length, true)
    pos += 4
    for (let i = 0; i < edge.length; i++) {
      if (use32) {
        view.setUint32(pos, edge[i] ?? 0, true)
        pos += 4
      } else {
        view.setUint16(pos, edge[i] ?? 0, true)
        pos += 2
      }
    }
  }
  writeEdge(input.westIndices)
  writeEdge(input.southIndices)
  writeEdge(input.eastIndices)
  writeEdge(input.northIndices)
  if (input.encodedNormals) {
    view.setUint8(pos, QuantizedMeshExtensionIds.OCT_VERTEX_NORMALS)
    pos += 1
    view.setUint32(pos, input.encodedNormals.byteLength, true)
    pos += 4
    new Uint8Array(buffer, pos, input.encodedNormals.byteLength).set(input.encodedNormals)
    pos += input.encodedNormals.byteLength
  }
  if (input.waterMask) {
    view.setUint8(pos, QuantizedMeshExtensionIds.WATER_MASK)
    pos += 1
    view.setUint32(pos, input.waterMask.byteLength, true)
    pos += 4
    new Uint8Array(buffer, pos, input.waterMask.byteLength).set(input.waterMask)
  }
  return buffer
}

export { MAX_SHORT }

/**
 * 由矩形估计 OBB（裙边不计入）。
 *
 * @param rectangle 矩形
 * @param minimumHeight 最小高
 * @param maximumHeight 最大高
 * @param ellipsoid 椭球
 */
export function quantizedMeshOrientedBoundingBox(
  rectangle: Rectangle,
  minimumHeight: number,
  maximumHeight: number,
  ellipsoid: Ellipsoid,
): OrientedBoundingBox {
  return OrientedBoundingBox.fromRectangle(rectangle, minimumHeight, maximumHeight, ellipsoid)
}
