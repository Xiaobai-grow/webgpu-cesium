/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 *
 * 偏离：未移植依赖 Scene/AttributeType 的 dequantize；oct / 纹理坐标 / zigZag 为纯数学。
 */

import { Cartesian2 } from "./Cartesian2"
import { Cartesian3 } from "./Cartesian3"
import type { Cartesian4 } from "./Cartesian4"
import { Check } from "./Check"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { CesiumMath } from "./CesiumMath"
import type { Color } from "./Color"

const RIGHT_SHIFT8 = 1.0 / 256.0
const LEFT_SHIFT16 = 65536.0
const LEFT_SHIFT8 = 256.0
const octEncodeScratch = new Cartesian2()
const uint8ForceArray = new Uint8Array(1)
const scratchEncodeCart2 = new Cartesian2()

function forceUint8(value: number): number {
  uint8ForceArray[0] = value
  return uint8ForceArray[0] ?? 0
}

function zigZagDecode(value: number): number {
  return (value >> 1) ^ -(value & 1)
}

/**
 * 属性压缩。对标 Cesium `Core/AttributeCompression.js` 的 oct 等纯数学部分。
 */
export const AttributeCompression = {
  octEncodeInRange(vector: Cartesian3, rangeMax: number, result: Cartesian2): Cartesian2 {
    Check.defined("vector", vector)
    Check.defined("result", result)
    const magSquared = Cartesian3.magnitudeSquared(vector)
    if (Math.abs(magSquared - 1.0) > CesiumMath.EPSILON6) {
      throw new DeveloperError("vector must be normalized.")
    }
    result.x = vector.x / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z))
    result.y = vector.y / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z))
    if (vector.z < 0) {
      const x = result.x
      const y = result.y
      result.x = (1.0 - Math.abs(y)) * CesiumMath.signNotZero(x)
      result.y = (1.0 - Math.abs(x)) * CesiumMath.signNotZero(y)
    }
    result.x = CesiumMath.toSNorm(result.x, rangeMax)
    result.y = CesiumMath.toSNorm(result.y, rangeMax)
    return result
  },

  octEncode(vector: Cartesian3, result: Cartesian2): Cartesian2 {
    return AttributeCompression.octEncodeInRange(vector, 255, result)
  },

  octEncodeToCartesian4(vector: Cartesian3, result: Cartesian4): Cartesian4 {
    AttributeCompression.octEncodeInRange(vector, 65535, octEncodeScratch)
    result.x = forceUint8(octEncodeScratch.x * RIGHT_SHIFT8)
    result.y = forceUint8(octEncodeScratch.x)
    result.z = forceUint8(octEncodeScratch.y * RIGHT_SHIFT8)
    result.w = forceUint8(octEncodeScratch.y)
    return result
  },

  octDecodeInRange(x: number, y: number, rangeMax: number, result: Cartesian3): Cartesian3 {
    Check.defined("result", result)
    if (x < 0 || x > rangeMax || y < 0 || y > rangeMax) {
      throw new DeveloperError(
        `x and y must be unsigned normalized integers between 0 and ${rangeMax}`,
      )
    }
    result.x = CesiumMath.fromSNorm(x, rangeMax)
    result.y = CesiumMath.fromSNorm(y, rangeMax)
    result.z = 1.0 - (Math.abs(result.x) + Math.abs(result.y))
    if (result.z < 0.0) {
      const oldVX = result.x
      result.x = (1.0 - Math.abs(result.y)) * CesiumMath.signNotZero(oldVX)
      result.y = (1.0 - Math.abs(oldVX)) * CesiumMath.signNotZero(result.y)
    }
    return Cartesian3.normalize(result, result)
  },

  octDecode(x: number, y: number, result: Cartesian3): Cartesian3 {
    return AttributeCompression.octDecodeInRange(x, y, 255, result)
  },

  octDecodeFromCartesian4(encoded: Cartesian4, result: Cartesian3): Cartesian3 {
    Check.typeOf.object("encoded", encoded)
    Check.typeOf.object("result", result)
    const xOct16 = encoded.x * LEFT_SHIFT8 + encoded.y
    const yOct16 = encoded.z * LEFT_SHIFT8 + encoded.w
    return AttributeCompression.octDecodeInRange(xOct16, yOct16, 65535, result)
  },

  octPackFloat(encoded: Cartesian2): number {
    Check.defined("encoded", encoded)
    return 256.0 * encoded.x + encoded.y
  },

  octEncodeFloat(vector: Cartesian3): number {
    AttributeCompression.octEncode(vector, scratchEncodeCart2)
    return AttributeCompression.octPackFloat(scratchEncodeCart2)
  },

  octDecodeFloat(value: number, result: Cartesian3): Cartesian3 {
    Check.defined("value", value)
    const temp = value / 256.0
    const x = Math.floor(temp)
    const y = (temp - x) * 256.0
    return AttributeCompression.octDecode(x, y, result)
  },

  octPack(v1: Cartesian3, v2: Cartesian3, v3: Cartesian3, result: Cartesian2): Cartesian2 {
    const encoded1 = AttributeCompression.octEncodeFloat(v1)
    const encoded2 = AttributeCompression.octEncodeFloat(v2)
    const encoded3 = AttributeCompression.octEncode(v3, scratchEncodeCart2)
    result.x = 65536.0 * encoded3.x + encoded1
    result.y = 65536.0 * encoded3.y + encoded2
    return result
  },

  octUnpack(packed: Cartesian2, v1: Cartesian3, v2: Cartesian3, v3: Cartesian3): void {
    let temp = packed.x / 65536.0
    const x = Math.floor(temp)
    const encodedFloat1 = (temp - x) * 65536.0
    temp = packed.y / 65536.0
    const y = Math.floor(temp)
    const encodedFloat2 = (temp - y) * 65536.0
    AttributeCompression.octDecodeFloat(encodedFloat1, v1)
    AttributeCompression.octDecodeFloat(encodedFloat2, v2)
    AttributeCompression.octDecode(x, y, v3)
  },

  compressTextureCoordinates(textureCoordinates: Cartesian2): number {
    Check.defined("textureCoordinates", textureCoordinates)
    const x = (textureCoordinates.x * 4095.0) | 0
    const y = (textureCoordinates.y * 4095.0) | 0
    return 4096.0 * x + y
  },

  decompressTextureCoordinates(compressed: number, result: Cartesian2): Cartesian2 {
    Check.defined("compressed", compressed)
    Check.defined("result", result)
    const temp = compressed / 4096.0
    const xZeroTo4095 = Math.floor(temp)
    result.x = xZeroTo4095 / 4095.0
    result.y = (compressed - xZeroTo4095 * 4096) / 4095
    return result
  },

  zigZagDeltaDecode(uBuffer: Uint16Array, vBuffer: Uint16Array, heightBuffer?: Uint16Array): void {
    Check.defined("uBuffer", uBuffer)
    Check.defined("vBuffer", vBuffer)
    const count = uBuffer.length
    let u = 0
    let v = 0
    let height = 0
    for (let i = 0; i < count; ++i) {
      u += zigZagDecode(uBuffer[i] ?? 0)
      v += zigZagDecode(vBuffer[i] ?? 0)
      uBuffer[i] = u
      vBuffer[i] = v
      if (defined(heightBuffer)) {
        height += zigZagDecode(heightBuffer[i] ?? 0)
        heightBuffer[i] = height
      }
    }
  },

  encodeRGB8(color: Color): number {
    Check.typeOf.object("color", color)
    return (
      Math.round(CesiumMath.clamp(color.red * 255, 0, 255)) * LEFT_SHIFT16 +
      Math.round(CesiumMath.clamp(color.green * 255, 0, 255)) * LEFT_SHIFT8 +
      Math.round(CesiumMath.clamp(color.blue * 255, 0, 255))
    )
  },

  decodeRGB8(encoded: number, result: Color): Color {
    Check.typeOf.number("encoded", encoded)
    Check.typeOf.object("result", result)
    const value = Math.floor(encoded)
    result.red = ((value >> 16) & 255) / 255
    result.green = ((value >> 8) & 255) / 255
    result.blue = (value & 255) / 255
    return result
  },

  decodeRGB565(typedArray: Uint16Array, result?: Float32Array): Float32Array {
    Check.defined("typedArray", typedArray)
    const count = typedArray.length
    const dest = result ?? new Float32Array(count * 3)
    const mask5 = (1 << 5) - 1
    const mask6 = (1 << 6) - 1
    const normalize5 = 1.0 / 31.0
    const normalize6 = 1.0 / 63.0
    for (let i = 0; i < count; i++) {
      const value = typedArray[i] ?? 0
      const offset = 3 * i
      dest[offset] = (value >> 11) * normalize5
      dest[offset + 1] = ((value >> 5) & mask6) * normalize6
      dest[offset + 2] = (value & mask5) * normalize5
    }
    return dest
  },
}
