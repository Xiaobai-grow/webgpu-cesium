/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Check } from "./Check"
import { Frozen } from "./Frozen"
import { defined } from "./defined"
import { FeatureDetection } from "./FeatureDetection"
import { CesiumMath } from "./CesiumMath"
import type { TypedArray } from "./globalTypes"

function hue2rgb(m1: number, m2: number, h: number): number {
  let hue = h
  if (hue < 0) {
    hue += 1
  }
  if (hue > 1) {
    hue -= 1
  }
  if (hue * 6 < 1) {
    return m1 + (m2 - m1) * 6 * hue
  }
  if (hue * 2 < 1) {
    return m2
  }
  if (hue * 3 < 2) {
    return m1 + (m2 - m1) * (2 / 3 - hue) * 6
  }
  return m1
}

/** fromCartesian4 所需的四维分量 */
export interface ColorCartesian4Like {
  x: number
  y: number
  z: number
  w: number
}

/** fromRandom 选项 */
export interface ColorRandomOptions {
  red?: number
  minimumRed?: number
  maximumRed?: number
  green?: number
  minimumGreen?: number
  maximumGreen?: number
  blue?: number
  minimumBlue?: number
  maximumBlue?: number
  alpha?: number
  minimumAlpha?: number
  maximumAlpha?: number
}

const rgbaMatcher = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i
const rrggbbaaMatcher = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i
const rgbParenthesesMatcher =
  /^rgba?\s*\(\s*([0-9.]+%?)\s*[,\s]+\s*([0-9.]+%?)\s*[,\s]+\s*([0-9.]+%?)(?:\s*[,\s/]+\s*([0-9.]+))?\s*\)$/i
const hslParenthesesMatcher =
  /^hsla?\s*\(\s*([0-9.]+)\s*[,\s]+\s*([0-9.]+%)\s*[,\s]+\s*([0-9.]+%)(?:\s*[,\s/]+\s*([0-9.]+))?\s*\)$/i

const namedHex: Record<string, string> = {
  ALICEBLUE: "#F0F8FF",
  ANTIQUEWHITE: "#FAEBD7",
  AQUA: "#00FFFF",
  AQUAMARINE: "#7FFFD4",
  AZURE: "#F0FFFF",
  BEIGE: "#F5F5DC",
  BISQUE: "#FFE4C4",
  BLACK: "#000000",
  BLANCHEDALMOND: "#FFEBCD",
  BLUE: "#0000FF",
  BLUEVIOLET: "#8A2BE2",
  BROWN: "#A52A2A",
  BURLYWOOD: "#DEB887",
  CADETBLUE: "#5F9EA0",
  CHARTREUSE: "#7FFF00",
  CHOCOLATE: "#D2691E",
  CORAL: "#FF7F50",
  CORNFLOWERBLUE: "#6495ED",
  CORNSILK: "#FFF8DC",
  CRIMSON: "#DC143C",
  CYAN: "#00FFFF",
  DARKBLUE: "#00008B",
  DARKCYAN: "#008B8B",
  DARKGOLDENROD: "#B8860B",
  DARKGRAY: "#A9A9A9",
  DARKGREEN: "#006400",
  DARKGREY: "#A9A9A9",
  DARKKHAKI: "#BDB76B",
  DARKMAGENTA: "#8B008B",
  DARKOLIVEGREEN: "#556B2F",
  DARKORANGE: "#FF8C00",
  DARKORCHID: "#9932CC",
  DARKRED: "#8B0000",
  DARKSALMON: "#E9967A",
  DARKSEAGREEN: "#8FBC8F",
  DARKSLATEBLUE: "#483D8B",
  DARKSLATEGRAY: "#2F4F4F",
  DARKSLATEGREY: "#2F4F4F",
  DARKTURQUOISE: "#00CED1",
  DARKVIOLET: "#9400D3",
  DEEPPINK: "#FF1493",
  DEEPSKYBLUE: "#00BFFF",
  DIMGRAY: "#696969",
  DIMGREY: "#696969",
  DODGERBLUE: "#1E90FF",
  FIREBRICK: "#B22222",
  FLORALWHITE: "#FFFAF0",
  FORESTGREEN: "#228B22",
  FUCHSIA: "#FF00FF",
  GAINSBORO: "#DCDCDC",
  GHOSTWHITE: "#F8F8FF",
  GOLD: "#FFD700",
  GOLDENROD: "#DAA520",
  GRAY: "#808080",
  GREEN: "#008000",
  GREENYELLOW: "#ADFF2F",
  GREY: "#808080",
  HONEYDEW: "#F0FFF0",
  HOTPINK: "#FF69B4",
  INDIANRED: "#CD5C5C",
  INDIGO: "#4B0082",
  IVORY: "#FFFFF0",
  KHAKI: "#F0E68C",
  LAVENDER: "#E6E6FA",
  LAVENDAR_BLUSH: "#FFF0F5",
  LAWNGREEN: "#7CFC00",
  LEMONCHIFFON: "#FFFACD",
  LIGHTBLUE: "#ADD8E6",
  LIGHTCORAL: "#F08080",
  LIGHTCYAN: "#E0FFFF",
  LIGHTGOLDENRODYELLOW: "#FAFAD2",
  LIGHTGRAY: "#D3D3D3",
  LIGHTGREEN: "#90EE90",
  LIGHTGREY: "#D3D3D3",
  LIGHTPINK: "#FFB6C1",
  LIGHTSEAGREEN: "#20B2AA",
  LIGHTSKYBLUE: "#87CEFA",
  LIGHTSLATEGRAY: "#778899",
  LIGHTSLATEGREY: "#778899",
  LIGHTSTEELBLUE: "#B0C4DE",
  LIGHTYELLOW: "#FFFFE0",
  LIME: "#00FF00",
  LIMEGREEN: "#32CD32",
  LINEN: "#FAF0E6",
  MAGENTA: "#FF00FF",
  MAROON: "#800000",
  MEDIUMAQUAMARINE: "#66CDAA",
  MEDIUMBLUE: "#0000CD",
  MEDIUMORCHID: "#BA55D3",
  MEDIUMPURPLE: "#9370DB",
  MEDIUMSEAGREEN: "#3CB371",
  MEDIUMSLATEBLUE: "#7B68EE",
  MEDIUMSPRINGGREEN: "#00FA9A",
  MEDIUMTURQUOISE: "#48D1CC",
  MEDIUMVIOLETRED: "#C71585",
  MIDNIGHTBLUE: "#191970",
  MINTCREAM: "#F5FFFA",
  MISTYROSE: "#FFE4E1",
  MOCCASIN: "#FFE4B5",
  NAVAJOWHITE: "#FFDEAD",
  NAVY: "#000080",
  OLDLACE: "#FDF5E6",
  OLIVE: "#808000",
  OLIVEDRAB: "#6B8E23",
  ORANGE: "#FFA500",
  ORANGERED: "#FF4500",
  ORCHID: "#DA70D6",
  PALEGOLDENROD: "#EEE8AA",
  PALEGREEN: "#98FB98",
  PALETURQUOISE: "#AFEEEE",
  PALEVIOLETRED: "#DB7093",
  PAPAYAWHIP: "#FFEFD5",
  PEACHPUFF: "#FFDAB9",
  PERU: "#CD853F",
  PINK: "#FFC0CB",
  PLUM: "#DDA0DD",
  POWDERBLUE: "#B0E0E6",
  PURPLE: "#800080",
  RED: "#FF0000",
  ROSYBROWN: "#BC8F8F",
  ROYALBLUE: "#4169E1",
  SADDLEBROWN: "#8B4513",
  SALMON: "#FA8072",
  SANDYBROWN: "#F4A460",
  SEAGREEN: "#2E8B57",
  SEASHELL: "#FFF5EE",
  SIENNA: "#A0522D",
  SILVER: "#C0C0C0",
  SKYBLUE: "#87CEEB",
  SLATEBLUE: "#6A5ACD",
  SLATEGRAY: "#708090",
  SLATEGREY: "#708090",
  SNOW: "#FFFAFA",
  SPRINGGREEN: "#00FF7F",
  STEELBLUE: "#4682B4",
  TAN: "#D2B48C",
  TEAL: "#008080",
  THISTLE: "#D8BFD8",
  TOMATO: "#FF6347",
  TURQUOISE: "#40E0D0",
  VIOLET: "#EE82EE",
  WHEAT: "#F5DEB3",
  WHITE: "#FFFFFF",
  WHITESMOKE: "#F5F5F5",
  YELLOW: "#FFFF00",
  YELLOWGREEN: "#9ACD32",
}

const namedColors: Record<string, Color> = {}

/**
 * RGBA 颜色，分量 0..1。对标 Cesium `Core/Color.js`。
 */
export class Color {
  red: number
  green: number
  blue: number
  alpha: number

  static packedLength = 4
  static ALICEBLUE: Color
  static ANTIQUEWHITE: Color
  static AQUA: Color
  static AQUAMARINE: Color
  static AZURE: Color
  static BEIGE: Color
  static BISQUE: Color
  static BLACK: Color
  static BLANCHEDALMOND: Color
  static BLUE: Color
  static BLUEVIOLET: Color
  static BROWN: Color
  static BURLYWOOD: Color
  static CADETBLUE: Color
  static CHARTREUSE: Color
  static CHOCOLATE: Color
  static CORAL: Color
  static CORNFLOWERBLUE: Color
  static CORNSILK: Color
  static CRIMSON: Color
  static CYAN: Color
  static DARKBLUE: Color
  static DARKCYAN: Color
  static DARKGOLDENROD: Color
  static DARKGRAY: Color
  static DARKGREEN: Color
  static DARKGREY: Color
  static DARKKHAKI: Color
  static DARKMAGENTA: Color
  static DARKOLIVEGREEN: Color
  static DARKORANGE: Color
  static DARKORCHID: Color
  static DARKRED: Color
  static DARKSALMON: Color
  static DARKSEAGREEN: Color
  static DARKSLATEBLUE: Color
  static DARKSLATEGRAY: Color
  static DARKSLATEGREY: Color
  static DARKTURQUOISE: Color
  static DARKVIOLET: Color
  static DEEPPINK: Color
  static DEEPSKYBLUE: Color
  static DIMGRAY: Color
  static DIMGREY: Color
  static DODGERBLUE: Color
  static FIREBRICK: Color
  static FLORALWHITE: Color
  static FORESTGREEN: Color
  static FUCHSIA: Color
  static GAINSBORO: Color
  static GHOSTWHITE: Color
  static GOLD: Color
  static GOLDENROD: Color
  static GRAY: Color
  static GREEN: Color
  static GREENYELLOW: Color
  static GREY: Color
  static HONEYDEW: Color
  static HOTPINK: Color
  static INDIANRED: Color
  static INDIGO: Color
  static IVORY: Color
  static KHAKI: Color
  static LAVENDER: Color
  static LAVENDAR_BLUSH: Color
  static LAWNGREEN: Color
  static LEMONCHIFFON: Color
  static LIGHTBLUE: Color
  static LIGHTCORAL: Color
  static LIGHTCYAN: Color
  static LIGHTGOLDENRODYELLOW: Color
  static LIGHTGRAY: Color
  static LIGHTGREEN: Color
  static LIGHTGREY: Color
  static LIGHTPINK: Color
  static LIGHTSEAGREEN: Color
  static LIGHTSKYBLUE: Color
  static LIGHTSLATEGRAY: Color
  static LIGHTSLATEGREY: Color
  static LIGHTSTEELBLUE: Color
  static LIGHTYELLOW: Color
  static LIME: Color
  static LIMEGREEN: Color
  static LINEN: Color
  static MAGENTA: Color
  static MAROON: Color
  static MEDIUMAQUAMARINE: Color
  static MEDIUMBLUE: Color
  static MEDIUMORCHID: Color
  static MEDIUMPURPLE: Color
  static MEDIUMSEAGREEN: Color
  static MEDIUMSLATEBLUE: Color
  static MEDIUMSPRINGGREEN: Color
  static MEDIUMTURQUOISE: Color
  static MEDIUMVIOLETRED: Color
  static MIDNIGHTBLUE: Color
  static MINTCREAM: Color
  static MISTYROSE: Color
  static MOCCASIN: Color
  static NAVAJOWHITE: Color
  static NAVY: Color
  static OLDLACE: Color
  static OLIVE: Color
  static OLIVEDRAB: Color
  static ORANGE: Color
  static ORANGERED: Color
  static ORCHID: Color
  static PALEGOLDENROD: Color
  static PALEGREEN: Color
  static PALETURQUOISE: Color
  static PALEVIOLETRED: Color
  static PAPAYAWHIP: Color
  static PEACHPUFF: Color
  static PERU: Color
  static PINK: Color
  static PLUM: Color
  static POWDERBLUE: Color
  static PURPLE: Color
  static RED: Color
  static ROSYBROWN: Color
  static ROYALBLUE: Color
  static SADDLEBROWN: Color
  static SALMON: Color
  static SANDYBROWN: Color
  static SEAGREEN: Color
  static SEASHELL: Color
  static SIENNA: Color
  static SILVER: Color
  static SKYBLUE: Color
  static SLATEBLUE: Color
  static SLATEGRAY: Color
  static SLATEGREY: Color
  static SNOW: Color
  static SPRINGGREEN: Color
  static STEELBLUE: Color
  static TAN: Color
  static TEAL: Color
  static THISTLE: Color
  static TOMATO: Color
  static TURQUOISE: Color
  static VIOLET: Color
  static WHEAT: Color
  static WHITE: Color
  static WHITESMOKE: Color
  static YELLOW: Color
  static YELLOWGREEN: Color
  static TRANSPARENT: Color

  constructor(red?: number, green?: number, blue?: number, alpha?: number) {
    this.red = red ?? 1.0
    this.green = green ?? 1.0
    this.blue = blue ?? 1.0
    this.alpha = alpha ?? 1.0
  }

  static fromCartesian4(cartesian: ColorCartesian4Like, result?: Color): Color {
    Check.typeOf.object("cartesian", cartesian)
    if (!defined(result)) {
      return new Color(cartesian.x, cartesian.y, cartesian.z, cartesian.w)
    }
    result.red = cartesian.x
    result.green = cartesian.y
    result.blue = cartesian.z
    result.alpha = cartesian.w
    return result
  }

  static fromBytes(
    red?: number,
    green?: number,
    blue?: number,
    alpha?: number,
    result?: Color,
  ): Color {
    const r = Color.byteToFloat(red ?? 255.0)
    const g = Color.byteToFloat(green ?? 255.0)
    const b = Color.byteToFloat(blue ?? 255.0)
    const a = Color.byteToFloat(alpha ?? 255.0)
    if (!defined(result)) {
      return new Color(r, g, b, a)
    }
    result.red = r
    result.green = g
    result.blue = b
    result.alpha = a
    return result
  }

  static fromAlpha(color: Color, alpha: number, result?: Color): Color {
    Check.typeOf.object("color", color)
    Check.typeOf.number("alpha", alpha)
    if (!defined(result)) {
      return new Color(color.red, color.green, color.blue, alpha)
    }
    result.red = color.red
    result.green = color.green
    result.blue = color.blue
    result.alpha = alpha
    return result
  }

  static fromRgba(rgba: number, result?: Color): Color {
    scratchUint32Array[0] = rgba
    return Color.fromBytes(
      scratchUint8Array[0],
      scratchUint8Array[1],
      scratchUint8Array[2],
      scratchUint8Array[3],
      result,
    )
  }

  static fromHsl(
    hue?: number,
    saturation?: number,
    lightness?: number,
    alpha?: number,
    result?: Color,
  ): Color {
    const h = (hue ?? 0.0) % 1.0
    const s = saturation ?? 0.0
    const l = lightness ?? 0.0
    const a = alpha ?? 1.0
    let red = l
    let green = l
    let blue = l
    if (s !== 0) {
      const m2 = l < 0.5 ? l * (1 + s) : l + s - l * s
      const m1 = 2.0 * l - m2
      red = hue2rgb(m1, m2, h + 1 / 3)
      green = hue2rgb(m1, m2, h)
      blue = hue2rgb(m1, m2, h - 1 / 3)
    }
    if (!defined(result)) {
      return new Color(red, green, blue, a)
    }
    result.red = red
    result.green = green
    result.blue = blue
    result.alpha = a
    return result
  }

  static fromRandom(options?: ColorRandomOptions, result?: Color): Color {
    const resolved = options ?? Frozen.EMPTY_OBJECT
    let red = resolved.red
    if (!defined(red)) {
      const minimumRed = resolved.minimumRed ?? 0
      const maximumRed = resolved.maximumRed ?? 1.0
      Check.typeOf.number.lessThanOrEquals("minimumRed", minimumRed, maximumRed)
      red = minimumRed + CesiumMath.nextRandomNumber() * (maximumRed - minimumRed)
    }
    let green = resolved.green
    if (!defined(green)) {
      const minimumGreen = resolved.minimumGreen ?? 0
      const maximumGreen = resolved.maximumGreen ?? 1.0
      Check.typeOf.number.lessThanOrEquals("minimumGreen", minimumGreen, maximumGreen)
      green = minimumGreen + CesiumMath.nextRandomNumber() * (maximumGreen - minimumGreen)
    }
    let blue = resolved.blue
    if (!defined(blue)) {
      const minimumBlue = resolved.minimumBlue ?? 0
      const maximumBlue = resolved.maximumBlue ?? 1.0
      Check.typeOf.number.lessThanOrEquals("minimumBlue", minimumBlue, maximumBlue)
      blue = minimumBlue + CesiumMath.nextRandomNumber() * (maximumBlue - minimumBlue)
    }
    let alpha = resolved.alpha
    if (!defined(alpha)) {
      const minimumAlpha = resolved.minimumAlpha ?? 0
      const maximumAlpha = resolved.maximumAlpha ?? 1.0
      Check.typeOf.number.lessThanOrEquals("minimumAlpha", minimumAlpha, maximumAlpha)
      alpha = minimumAlpha + CesiumMath.nextRandomNumber() * (maximumAlpha - minimumAlpha)
    }
    if (!defined(result)) {
      return new Color(red, green, blue, alpha)
    }
    result.red = red
    result.green = green
    result.blue = blue
    result.alpha = alpha
    return result
  }

  static fromCssColorString(color: string, result?: Color): Color | undefined {
    Check.typeOf.string("color", color)
    const dest = result ?? new Color()
    const trimmed = color.trim()
    const named = namedColors[trimmed.toUpperCase()]
    if (defined(named)) {
      Color.clone(named, dest)
      return dest
    }
    let matches = rgbaMatcher.exec(trimmed)
    if (matches !== null) {
      dest.red = parseInt(matches[1] ?? "0", 16) / 15
      dest.green = parseInt(matches[2] ?? "0", 16) / 15.0
      dest.blue = parseInt(matches[3] ?? "0", 16) / 15.0
      dest.alpha = parseInt(matches[4] ?? "f", 16) / 15.0
      return dest
    }
    matches = rrggbbaaMatcher.exec(trimmed)
    if (matches !== null) {
      dest.red = parseInt(matches[1] ?? "00", 16) / 255.0
      dest.green = parseInt(matches[2] ?? "00", 16) / 255.0
      dest.blue = parseInt(matches[3] ?? "00", 16) / 255.0
      dest.alpha = parseInt(matches[4] ?? "ff", 16) / 255.0
      return dest
    }
    matches = rgbParenthesesMatcher.exec(trimmed)
    if (matches !== null) {
      const r = matches[1] ?? "0"
      const g = matches[2] ?? "0"
      const b = matches[3] ?? "0"
      dest.red = parseFloat(r) / (r.endsWith("%") ? 100.0 : 255.0)
      dest.green = parseFloat(g) / (g.endsWith("%") ? 100.0 : 255.0)
      dest.blue = parseFloat(b) / (b.endsWith("%") ? 100.0 : 255.0)
      dest.alpha = parseFloat(matches[4] ?? "1.0")
      return dest
    }
    matches = hslParenthesesMatcher.exec(trimmed)
    if (matches !== null) {
      return Color.fromHsl(
        parseFloat(matches[1] ?? "0") / 360.0,
        parseFloat(matches[2] ?? "0") / 100.0,
        parseFloat(matches[3] ?? "0") / 100.0,
        parseFloat(matches[4] ?? "1.0"),
        dest,
      )
    }
    return undefined
  }

  static pack(
    value: Color,
    array: number[] | TypedArray,
    startingIndex?: number,
  ): number[] | TypedArray {
    Check.typeOf.object("value", value)
    Check.defined("array", array)
    let i = startingIndex ?? 0
    array[i++] = value.red
    array[i++] = value.green
    array[i++] = value.blue
    array[i] = value.alpha
    return array
  }

  static unpack(array: ArrayLike<number>, startingIndex?: number, result?: Color): Color {
    Check.defined("array", array)
    let i = startingIndex ?? 0
    const dest = result ?? new Color()
    dest.red = array[i++] ?? 0
    dest.green = array[i++] ?? 0
    dest.blue = array[i++] ?? 0
    dest.alpha = array[i] ?? 0
    return dest
  }

  static byteToFloat(number: number): number {
    return number / 255.0
  }

  static floatToByte(number: number): number {
    return number === 1.0 ? 255.0 : (number * 256.0) | 0
  }

  static clone(color?: Color, result?: Color): Color | undefined {
    if (!defined(color)) {
      return undefined
    }
    if (!defined(result)) {
      return new Color(color.red, color.green, color.blue, color.alpha)
    }
    result.red = color.red
    result.green = color.green
    result.blue = color.blue
    result.alpha = color.alpha
    return result
  }

  static equals(left?: Color, right?: Color): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left.red === right.red &&
        left.green === right.green &&
        left.blue === right.blue &&
        left.alpha === right.alpha)
    )
  }

  static equalsArray(color: Color, array: ArrayLike<number>, offset: number): boolean {
    return (
      color.red === array[offset] &&
      color.green === array[offset + 1] &&
      color.blue === array[offset + 2] &&
      color.alpha === array[offset + 3]
    )
  }

  static bytesToRgba(red: number, green: number, blue: number, alpha: number): number {
    scratchUint8Array[0] = red
    scratchUint8Array[1] = green
    scratchUint8Array[2] = blue
    scratchUint8Array[3] = alpha
    return scratchUint32Array[0] ?? 0
  }

  static add(left: Color, right: Color, result: Color): Color {
    Check.typeOf.object("left", left)
    Check.typeOf.object("right", right)
    Check.typeOf.object("result", result)
    result.red = left.red + right.red
    result.green = left.green + right.green
    result.blue = left.blue + right.blue
    result.alpha = left.alpha + right.alpha
    return result
  }

  static subtract(left: Color, right: Color, result: Color): Color {
    result.red = left.red - right.red
    result.green = left.green - right.green
    result.blue = left.blue - right.blue
    result.alpha = left.alpha - right.alpha
    return result
  }

  static multiply(left: Color, right: Color, result: Color): Color {
    result.red = left.red * right.red
    result.green = left.green * right.green
    result.blue = left.blue * right.blue
    result.alpha = left.alpha * right.alpha
    return result
  }

  static divide(left: Color, right: Color, result: Color): Color {
    result.red = left.red / right.red
    result.green = left.green / right.green
    result.blue = left.blue / right.blue
    result.alpha = left.alpha / right.alpha
    return result
  }

  static mod(left: Color, right: Color, result: Color): Color {
    result.red = left.red % right.red
    result.green = left.green % right.green
    result.blue = left.blue % right.blue
    result.alpha = left.alpha % right.alpha
    return result
  }

  static lerp(start: Color, end: Color, t: number, result: Color): Color {
    result.red = CesiumMath.lerp(start.red, end.red, t)
    result.green = CesiumMath.lerp(start.green, end.green, t)
    result.blue = CesiumMath.lerp(start.blue, end.blue, t)
    result.alpha = CesiumMath.lerp(start.alpha, end.alpha, t)
    return result
  }

  static multiplyByScalar(color: Color, scalar: number, result: Color): Color {
    result.red = color.red * scalar
    result.green = color.green * scalar
    result.blue = color.blue * scalar
    result.alpha = color.alpha * scalar
    return result
  }

  static divideByScalar(color: Color, scalar: number, result: Color): Color {
    result.red = color.red / scalar
    result.green = color.green / scalar
    result.blue = color.blue / scalar
    result.alpha = color.alpha / scalar
    return result
  }

  clone(result?: Color): Color | undefined {
    return Color.clone(this, result)
  }

  equals(other?: Color): boolean {
    return Color.equals(this, other)
  }

  equalsEpsilon(other?: Color, epsilon?: number): boolean {
    const resolved = epsilon ?? 0.0
    return (
      this === other ||
      (defined(other) &&
        Math.abs(this.red - other.red) <= resolved &&
        Math.abs(this.green - other.green) <= resolved &&
        Math.abs(this.blue - other.blue) <= resolved &&
        Math.abs(this.alpha - other.alpha) <= resolved)
    )
  }

  toString(): string {
    return `(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`
  }

  toCssColorString(): string {
    const red = Color.floatToByte(this.red)
    const green = Color.floatToByte(this.green)
    const blue = Color.floatToByte(this.blue)
    if (this.alpha === 1) {
      return `rgb(${red},${green},${blue})`
    }
    return `rgba(${red},${green},${blue},${this.alpha})`
  }

  toCssHexString(): string {
    const hex = (n: number): string => Color.floatToByte(n).toString(16).padStart(2, "0")
    if (this.alpha < 1) {
      return `#${hex(this.red)}${hex(this.green)}${hex(this.blue)}${hex(this.alpha)}`
    }
    return `#${hex(this.red)}${hex(this.green)}${hex(this.blue)}`
  }

  toBytes(result?: number[]): number[] {
    const red = Color.floatToByte(this.red)
    const green = Color.floatToByte(this.green)
    const blue = Color.floatToByte(this.blue)
    const alpha = Color.floatToByte(this.alpha)
    if (!defined(result)) {
      return [red, green, blue, alpha]
    }
    result[0] = red
    result[1] = green
    result[2] = blue
    result[3] = alpha
    return result
  }

  toRgba(): number {
    return Color.bytesToRgba(
      Color.floatToByte(this.red),
      Color.floatToByte(this.green),
      Color.floatToByte(this.blue),
      Color.floatToByte(this.alpha),
    )
  }

  brighten(magnitude: number, result: Color): Color {
    Check.typeOf.number.greaterThanOrEquals("magnitude", magnitude, 0.0)
    Check.typeOf.object("result", result)
    const mag = 1.0 - magnitude
    result.red = 1.0 - (1.0 - this.red) * mag
    result.green = 1.0 - (1.0 - this.green) * mag
    result.blue = 1.0 - (1.0 - this.blue) * mag
    result.alpha = this.alpha
    return result
  }

  darken(magnitude: number, result: Color): Color {
    Check.typeOf.number.greaterThanOrEquals("magnitude", magnitude, 0.0)
    Check.typeOf.object("result", result)
    const mag = 1.0 - magnitude
    result.red = this.red * mag
    result.green = this.green * mag
    result.blue = this.blue * mag
    result.alpha = this.alpha
    return result
  }

  withAlpha(alpha: number, result?: Color): Color {
    return Color.fromAlpha(this, alpha, result)
  }
}

const scratchArrayBuffer = FeatureDetection.supportsTypedArrays()
  ? new ArrayBuffer(4)
  : new ArrayBuffer(4)
const scratchUint32Array = new Uint32Array(scratchArrayBuffer)
const scratchUint8Array = new Uint8Array(scratchArrayBuffer)

function assignNamed(name: string, hex: string): Color {
  const color = Object.freeze(Color.fromCssColorString(hex)!) as Color
  namedColors[name] = color
  ;(Color as unknown as Record<string, Color>)[name] = color
  return color
}

for (const [name, hex] of Object.entries(namedHex)) {
  assignNamed(name, hex)
}
Color.TRANSPARENT = Object.freeze(new Color(0, 0, 0, 0))
namedColors.TRANSPARENT = Color.TRANSPARENT
