/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/tiles
 */
import { Cartesian3, Matrix4, RuntimeError } from "@webgpu-cesium/core"
import { parseJsonChunk } from "./tileHeader"

const MAGIC = 0x6d643369

export interface I3dmFeatureTable {
  INSTANCES_LENGTH?: number
  RTC_CENTER?: number[]
  POSITION?: { byteOffset: number }
  NORMAL_UP?: { byteOffset: number }
  NORMAL_RIGHT?: { byteOffset: number }
  SCALE?: { byteOffset: number }
  SCALE_NON_UNIFORM?: { byteOffset: number }
  EAST_NORTH_UP?: boolean
}

export interface ParsedI3dm {
  gltf: Uint8Array
  featureTableJson: I3dmFeatureTable
  featureTableBinary: Uint8Array
  batchTableJson: Record<string, unknown>
  instances: Matrix4[]
  rtcCenter: Cartesian3 | undefined
}

/**
 * 解析 i3dm，抽出实例矩阵。
 *
 * @param bytes 整瓦片
 */
export function parseI3dm(bytes: Uint8Array): ParsedI3dm {
  if (bytes.byteLength < 32) {
    throw new RuntimeError("i3dm is too short.")
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) !== MAGIC) {
    throw new RuntimeError("Not an i3dm tile.")
  }
  const featureTableJsonByteLength = view.getUint32(12, true)
  const featureTableBinaryByteLength = view.getUint32(16, true)
  const batchTableJsonByteLength = view.getUint32(20, true)
  const batchTableBinaryByteLength = view.getUint32(24, true)
  const gltfFormat = view.getUint32(28, true)
  let offset = 32
  const featureTableJson = parseJsonChunk(
    bytes,
    offset,
    featureTableJsonByteLength,
  ) as I3dmFeatureTable
  offset += featureTableJsonByteLength
  const featureTableBinary = bytes.subarray(offset, offset + featureTableBinaryByteLength)
  offset += featureTableBinaryByteLength
  const batchTableJson = parseJsonChunk(bytes, offset, batchTableJsonByteLength) as Record<
    string,
    unknown
  >
  offset += batchTableJsonByteLength + batchTableBinaryByteLength
  let gltf: Uint8Array
  if (gltfFormat === 0) {
    const uri = new TextDecoder().decode(bytes.subarray(offset)).replace(/\0+$/g, "")
    throw new RuntimeError(`i3dm external glTF URI is not fetched here: ${uri}`)
  } else {
    gltf = bytes.subarray(offset)
  }
  const instances = readInstances(featureTableJson, featureTableBinary)
  let rtcCenter: Cartesian3 | undefined
  if (featureTableJson.RTC_CENTER && featureTableJson.RTC_CENTER.length >= 3) {
    rtcCenter = new Cartesian3(
      featureTableJson.RTC_CENTER[0] ?? 0,
      featureTableJson.RTC_CENTER[1] ?? 0,
      featureTableJson.RTC_CENTER[2] ?? 0,
    )
  }
  return { gltf, featureTableJson, featureTableBinary, batchTableJson, instances, rtcCenter }
}

function readInstances(json: I3dmFeatureTable, binary: Uint8Array): Matrix4[] {
  const count = json.INSTANCES_LENGTH ?? 0
  const instances: Matrix4[] = []
  const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength)
  const posOffset = json.POSITION?.byteOffset ?? 0
  for (let i = 0; i < count; i++) {
    const x =
      view.byteLength >= posOffset + (i + 1) * 12 ? view.getFloat32(posOffset + i * 12, true) : 0
    const y =
      view.byteLength >= posOffset + i * 12 + 8 ? view.getFloat32(posOffset + i * 12 + 4, true) : 0
    const z =
      view.byteLength >= posOffset + i * 12 + 12 ? view.getFloat32(posOffset + i * 12 + 8, true) : 0
    instances.push(Matrix4.fromTranslation(new Cartesian3(x, y, z), new Matrix4()))
  }
  if (instances.length === 0) {
    instances.push(Matrix4.clone(Matrix4.IDENTITY, new Matrix4()))
  }
  return instances
}
