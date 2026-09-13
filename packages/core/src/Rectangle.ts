/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { type BoundingSphere } from "./BoundingSphere"
import { Cartesian3 } from "./Cartesian3"
import { Cartographic } from "./Cartographic"
import { Check } from "./Check"
import { defined } from "./defined"
import { Ellipsoid } from "./Ellipsoid"
import { CesiumMath } from "./CesiumMath"
import { Matrix4 } from "./Matrix4"
import { Transforms } from "./Transforms"

const fromBoundingSphereMatrixScratch = new Matrix4()
const fromBoundingSphereEastScratch = new Cartesian3()
const fromBoundingSphereNorthScratch = new Cartesian3()
const fromBoundingSphereWestScratch = new Cartesian3()
const fromBoundingSphereSouthScratch = new Cartesian3()
const fromBoundingSpherePositionsScratch = [
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
]

const subsampleLlaScratch = new Cartographic()

/**
 * 经纬度矩形（弧度）。
 * 对标 Cesium `Core/Rectangle.js`，不要改名为 GlobeRectangle。
 */
export class Rectangle {
  west: number
  south: number
  east: number
  north: number

  static packedLength = 4

  /**
   * 最大经纬矩形 [-π, -π/2, π, π/2]。
   */
  static readonly MAX_VALUE: Rectangle = Object.freeze(
    new Rectangle(-Math.PI, -CesiumMath.PI_OVER_TWO, Math.PI, CesiumMath.PI_OVER_TWO),
  )

  /**
   * @param west 西经，弧度
   * @param south 南纬，弧度
   * @param east 东经，弧度
   * @param north 北纬，弧度
   */
  constructor(west?: number, south?: number, east?: number, north?: number) {
    this.west = west ?? 0.0
    this.south = south ?? 0.0
    this.east = east ?? 0.0
    this.north = north ?? 0.0
  }

  /** 宽度（弧度），跨越日界线时已展开 */
  get width(): number {
    return Rectangle.computeWidth(this)
  }

  /** 高度（弧度） */
  get height(): number {
    return Rectangle.computeHeight(this)
  }

  /**
   * 打包到数组。
   *
   * @param value 矩形
   * @param array 目标数组
   * @param startingIndex 起始下标
   */
  static pack(value: Rectangle, array: number[], startingIndex?: number): number[] {
    Check.typeOf.object("value", value)
    Check.defined("array", array)

    let index = startingIndex ?? 0
    array[index++] = value.west
    array[index++] = value.south
    array[index++] = value.east
    array[index] = value.north
    return array
  }

  /**
   * 从数组解包。
   *
   * @param array 打包数组
   * @param startingIndex 起始下标
   * @param result 可选结果对象
   */
  static unpack(array: number[], startingIndex?: number, result?: Rectangle): Rectangle {
    Check.defined("array", array)

    let index = startingIndex ?? 0
    if (!defined(result)) {
      result = new Rectangle()
    }

    result.west = array[index++]!
    result.south = array[index++]!
    result.east = array[index++]!
    result.north = array[index]!
    return result
  }

  /**
   * 计算宽度（弧度）。east < west 时跨越日界线。
   *
   * @param rectangle 矩形
   */
  static computeWidth(rectangle: Rectangle): number {
    Check.typeOf.object("rectangle", rectangle)
    let east = rectangle.east
    const west = rectangle.west
    if (east < west) {
      east += CesiumMath.TWO_PI
    }
    return east - west
  }

  /**
   * 计算高度（弧度）。
   *
   * @param rectangle 矩形
   */
  static computeHeight(rectangle: Rectangle): number {
    Check.typeOf.object("rectangle", rectangle)
    return rectangle.north - rectangle.south
  }

  /**
   * 从角度边界创建（结果为弧度）。
   *
   * @param west 西经，度
   * @param south 南纬，度
   * @param east 东经，度
   * @param north 北纬，度
   * @param result 可选结果对象
   */
  static fromDegrees(
    west?: number,
    south?: number,
    east?: number,
    north?: number,
    result?: Rectangle,
  ): Rectangle {
    const nextWest = CesiumMath.toRadians(west ?? 0.0)
    const nextSouth = CesiumMath.toRadians(south ?? 0.0)
    const nextEast = CesiumMath.toRadians(east ?? 0.0)
    const nextNorth = CesiumMath.toRadians(north ?? 0.0)

    if (!defined(result)) {
      return new Rectangle(nextWest, nextSouth, nextEast, nextNorth)
    }

    result.west = nextWest
    result.south = nextSouth
    result.east = nextEast
    result.north = nextNorth
    return result
  }

  /**
   * 从弧度边界创建。
   *
   * @param west 西经
   * @param south 南纬
   * @param east 东经
   * @param north 北纬
   * @param result 可选结果对象
   */
  static fromRadians(
    west?: number,
    south?: number,
    east?: number,
    north?: number,
    result?: Rectangle,
  ): Rectangle {
    if (!defined(result)) {
      return new Rectangle(west, south, east, north)
    }

    result.west = west ?? 0.0
    result.south = south ?? 0.0
    result.east = east ?? 0.0
    result.north = north ?? 0.0
    return result
  }

  /**
   * 包围一组经纬高的最小矩形（含日界线较短跨度）。
   *
   * @param cartographics 经纬高数组
   * @param result 可选结果对象
   */
  static fromCartographicArray(cartographics: Cartographic[], result?: Rectangle): Rectangle {
    Check.defined("cartographics", cartographics)

    let west = Number.MAX_VALUE
    let east = -Number.MAX_VALUE
    let westOverIDL = Number.MAX_VALUE
    let eastOverIDL = -Number.MAX_VALUE
    let south = Number.MAX_VALUE
    let north = -Number.MAX_VALUE

    for (let i = 0, len = cartographics.length; i < len; i++) {
      const position = cartographics[i]!
      west = Math.min(west, position.longitude)
      east = Math.max(east, position.longitude)
      south = Math.min(south, position.latitude)
      north = Math.max(north, position.latitude)

      const lonAdjusted =
        position.longitude >= 0 ? position.longitude : position.longitude + CesiumMath.TWO_PI
      westOverIDL = Math.min(westOverIDL, lonAdjusted)
      eastOverIDL = Math.max(eastOverIDL, lonAdjusted)
    }

    if (east - west > eastOverIDL - westOverIDL) {
      west = westOverIDL
      east = eastOverIDL

      if (east > CesiumMath.PI) {
        east = east - CesiumMath.TWO_PI
      }
      if (west > CesiumMath.PI) {
        west = west - CesiumMath.TWO_PI
      }
    }

    if (!defined(result)) {
      return new Rectangle(west, south, east, north)
    }

    result.west = west
    result.south = south
    result.east = east
    result.north = north
    return result
  }

  /**
   * 包围一组笛卡尔点的最小矩形。
   *
   * @param cartesians ECEF 数组
   * @param ellipsoid 椭球
   * @param result 可选结果对象
   */
  static fromCartesianArray(
    cartesians: Cartesian3[],
    ellipsoid?: Ellipsoid,
    result?: Rectangle,
  ): Rectangle {
    Check.defined("cartesians", cartesians)
    const nextEllipsoid = ellipsoid ?? Ellipsoid.default

    let west = Number.MAX_VALUE
    let east = -Number.MAX_VALUE
    let westOverIDL = Number.MAX_VALUE
    let eastOverIDL = -Number.MAX_VALUE
    let south = Number.MAX_VALUE
    let north = -Number.MAX_VALUE

    for (let i = 0, len = cartesians.length; i < len; i++) {
      const position = nextEllipsoid.cartesianToCartographic(cartesians[i]!)!
      west = Math.min(west, position.longitude)
      east = Math.max(east, position.longitude)
      south = Math.min(south, position.latitude)
      north = Math.max(north, position.latitude)

      const lonAdjusted =
        position.longitude >= 0 ? position.longitude : position.longitude + CesiumMath.TWO_PI
      westOverIDL = Math.min(westOverIDL, lonAdjusted)
      eastOverIDL = Math.max(eastOverIDL, lonAdjusted)
    }

    if (east - west > eastOverIDL - westOverIDL) {
      west = westOverIDL
      east = eastOverIDL

      if (east > CesiumMath.PI) {
        east = east - CesiumMath.TWO_PI
      }
      if (west > CesiumMath.PI) {
        west = west - CesiumMath.TWO_PI
      }
    }

    if (!defined(result)) {
      return new Rectangle(west, south, east, north)
    }

    result.west = west
    result.south = south
    result.east = east
    result.north = north
    return result
  }

  /**
   * 从包围球（忽略高度）创建矩形。
   *
   * @param boundingSphere 包围球
   * @param ellipsoid 椭球
   * @param result 可选结果对象
   */
  static fromBoundingSphere(
    boundingSphere: BoundingSphere,
    ellipsoid?: Ellipsoid,
    result?: Rectangle,
  ): Rectangle {
    Check.typeOf.object("boundingSphere", boundingSphere)

    const center = boundingSphere.center
    const radius = boundingSphere.radius
    const nextEllipsoid = ellipsoid ?? Ellipsoid.default

    if (!defined(result)) {
      result = new Rectangle()
    }

    if (Cartesian3.equals(center, Cartesian3.ZERO)) {
      Rectangle.clone(Rectangle.MAX_VALUE, result)
      return result
    }

    const eastNorthUpToFixedFrame = (
      Transforms as unknown as {
        eastNorthUpToFixedFrame: (
          origin: Cartesian3,
          ellipsoid?: Ellipsoid,
          result?: Matrix4,
        ) => Matrix4
      }
    ).eastNorthUpToFixedFrame
    const fromENU = eastNorthUpToFixedFrame(center, nextEllipsoid, fromBoundingSphereMatrixScratch)
    const east = Matrix4.multiplyByPointAsVector(
      fromENU,
      Cartesian3.UNIT_X,
      fromBoundingSphereEastScratch,
    )
    Cartesian3.normalize(east, east)
    const north = Matrix4.multiplyByPointAsVector(
      fromENU,
      Cartesian3.UNIT_Y,
      fromBoundingSphereNorthScratch,
    )
    Cartesian3.normalize(north, north)

    Cartesian3.multiplyByScalar(north, radius, north)
    Cartesian3.multiplyByScalar(east, radius, east)

    const south = Cartesian3.negate(north, fromBoundingSphereSouthScratch)
    const west = Cartesian3.negate(east, fromBoundingSphereWestScratch)

    const positions = fromBoundingSpherePositionsScratch
    Cartesian3.add(center, north, positions[0]!)
    Cartesian3.add(center, west, positions[1]!)
    Cartesian3.add(center, south, positions[2]!)
    Cartesian3.add(center, east, positions[3]!)
    positions[4] = center

    return Rectangle.fromCartesianArray(positions, nextEllipsoid, result)
  }

  /**
   * 复制矩形；源未定义时返回 undefined。
   *
   * @param rectangle 源
   * @param result 可选结果对象
   */
  static clone(rectangle?: Rectangle, result?: Rectangle): Rectangle | undefined {
    if (!defined(rectangle)) {
      return undefined
    }

    if (!defined(result)) {
      return new Rectangle(rectangle.west, rectangle.south, rectangle.east, rectangle.north)
    }

    result.west = rectangle.west
    result.south = rectangle.south
    result.east = rectangle.east
    result.north = rectangle.north
    return result
  }

  /**
   * 绝对容差比较。
   *
   * @param left 左值
   * @param right 右值
   * @param absoluteEpsilon 绝对容差
   */
  static equalsEpsilon(left?: Rectangle, right?: Rectangle, absoluteEpsilon?: number): boolean {
    const nextEpsilon = absoluteEpsilon ?? 0

    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Math.abs(left.west - right.west) <= nextEpsilon &&
        Math.abs(left.south - right.south) <= nextEpsilon &&
        Math.abs(left.east - right.east) <= nextEpsilon &&
        Math.abs(left.north - right.north) <= nextEpsilon)
    )
  }

  /**
   * 分量精确相等。
   *
   * @param left 左值
   * @param right 右值
   */
  static equals(left?: Rectangle, right?: Rectangle): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left.west === right.west &&
        left.south === right.south &&
        left.east === right.east &&
        left.north === right.north)
    )
  }

  /**
   * 校验经纬度范围。
   *
   * @param rectangle 矩形
   */
  static _validate(rectangle: Rectangle): void {
    Check.typeOf.object("rectangle", rectangle)

    const north = rectangle.north
    Check.typeOf.number.greaterThanOrEquals("north", north, -CesiumMath.PI_OVER_TWO)
    Check.typeOf.number.lessThanOrEquals("north", north, CesiumMath.PI_OVER_TWO)

    const south = rectangle.south
    Check.typeOf.number.greaterThanOrEquals("south", south, -CesiumMath.PI_OVER_TWO)
    Check.typeOf.number.lessThanOrEquals("south", south, CesiumMath.PI_OVER_TWO)

    const west = rectangle.west
    Check.typeOf.number.greaterThanOrEquals("west", west, -Math.PI)
    Check.typeOf.number.lessThanOrEquals("west", west, Math.PI)

    const east = rectangle.east
    Check.typeOf.number.greaterThanOrEquals("east", east, -Math.PI)
    Check.typeOf.number.lessThanOrEquals("east", east, Math.PI)
  }

  /**
   * 西南角。
   *
   * @param rectangle 矩形
   * @param result 可选结果对象
   */
  static southwest(rectangle: Rectangle, result?: Cartographic): Cartographic {
    Check.typeOf.object("rectangle", rectangle)

    if (!defined(result)) {
      return new Cartographic(rectangle.west, rectangle.south)
    }
    result.longitude = rectangle.west
    result.latitude = rectangle.south
    result.height = 0.0
    return result
  }

  /**
   * 西北角。
   *
   * @param rectangle 矩形
   * @param result 可选结果对象
   */
  static northwest(rectangle: Rectangle, result?: Cartographic): Cartographic {
    Check.typeOf.object("rectangle", rectangle)

    if (!defined(result)) {
      return new Cartographic(rectangle.west, rectangle.north)
    }
    result.longitude = rectangle.west
    result.latitude = rectangle.north
    result.height = 0.0
    return result
  }

  /**
   * 东北角。
   *
   * @param rectangle 矩形
   * @param result 可选结果对象
   */
  static northeast(rectangle: Rectangle, result?: Cartographic): Cartographic {
    Check.typeOf.object("rectangle", rectangle)

    if (!defined(result)) {
      return new Cartographic(rectangle.east, rectangle.north)
    }
    result.longitude = rectangle.east
    result.latitude = rectangle.north
    result.height = 0.0
    return result
  }

  /**
   * 东南角。
   *
   * @param rectangle 矩形
   * @param result 可选结果对象
   */
  static southeast(rectangle: Rectangle, result?: Cartographic): Cartographic {
    Check.typeOf.object("rectangle", rectangle)

    if (!defined(result)) {
      return new Cartographic(rectangle.east, rectangle.south)
    }
    result.longitude = rectangle.east
    result.latitude = rectangle.south
    result.height = 0.0
    return result
  }

  /**
   * 中心点（跨越日界线时先展开经度）。
   *
   * @param rectangle 矩形
   * @param result 可选结果对象
   */
  static center(rectangle: Rectangle, result?: Cartographic): Cartographic {
    Check.typeOf.object("rectangle", rectangle)

    let east = rectangle.east
    const west = rectangle.west

    if (east < west) {
      east += CesiumMath.TWO_PI
    }

    const longitude = CesiumMath.negativePiToPi((west + east) * 0.5)
    const latitude = (rectangle.south + rectangle.north) * 0.5

    if (!defined(result)) {
      return new Cartographic(longitude, latitude)
    }

    result.longitude = longitude
    result.latitude = latitude
    result.height = 0.0
    return result
  }

  /**
   * 经纬矩形相交（处理日界线）。
   *
   * @param rectangle 矩形
   * @param otherRectangle 另一矩形
   * @param result 可选结果对象
   */
  static intersection(
    rectangle: Rectangle,
    otherRectangle: Rectangle,
    result?: Rectangle,
  ): Rectangle | undefined {
    Check.typeOf.object("rectangle", rectangle)
    Check.typeOf.object("otherRectangle", otherRectangle)

    let rectangleEast = rectangle.east
    let rectangleWest = rectangle.west
    let otherRectangleEast = otherRectangle.east
    let otherRectangleWest = otherRectangle.west

    if (rectangleEast < rectangleWest && otherRectangleEast > 0.0) {
      rectangleEast += CesiumMath.TWO_PI
    } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0.0) {
      otherRectangleEast += CesiumMath.TWO_PI
    }

    if (rectangleEast < rectangleWest && otherRectangleWest < 0.0) {
      otherRectangleWest += CesiumMath.TWO_PI
    } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0.0) {
      rectangleWest += CesiumMath.TWO_PI
    }

    let west = CesiumMath.negativePiToPi(Math.max(rectangleWest, otherRectangleWest))
    const east = CesiumMath.negativePiToPi(Math.min(rectangleEast, otherRectangleEast))

    if (west === CesiumMath.PI && east < CesiumMath.PI) {
      west = -CesiumMath.PI
    }

    if (
      (rectangle.west < rectangle.east || otherRectangle.west < otherRectangle.east) &&
      east <= west
    ) {
      return undefined
    }

    const south = Math.max(rectangle.south, otherRectangle.south)
    const north = Math.min(rectangle.north, otherRectangle.north)

    if (south >= north) {
      return undefined
    }

    if (!defined(result)) {
      return new Rectangle(west, south, east, north)
    }
    result.west = west
    result.south = south
    result.east = east
    result.north = north
    return result
  }

  /**
   * 投影坐标的简单相交（不处理日界线）。
   *
   * @param rectangle 矩形
   * @param otherRectangle 另一矩形
   * @param result 可选结果对象
   */
  static simpleIntersection(
    rectangle: Rectangle,
    otherRectangle: Rectangle,
    result?: Rectangle,
  ): Rectangle | undefined {
    Check.typeOf.object("rectangle", rectangle)
    Check.typeOf.object("otherRectangle", otherRectangle)

    const west = Math.max(rectangle.west, otherRectangle.west)
    const south = Math.max(rectangle.south, otherRectangle.south)
    const east = Math.min(rectangle.east, otherRectangle.east)
    const north = Math.min(rectangle.north, otherRectangle.north)

    if (south >= north || west >= east) {
      return undefined
    }

    if (!defined(result)) {
      return new Rectangle(west, south, east, north)
    }

    result.west = west
    result.south = south
    result.east = east
    result.north = north
    return result
  }

  /**
   * 两矩形并集（处理日界线）。
   *
   * @param rectangle 矩形
   * @param otherRectangle 另一矩形
   * @param result 可选结果对象
   */
  static union(rectangle: Rectangle, otherRectangle: Rectangle, result?: Rectangle): Rectangle {
    Check.typeOf.object("rectangle", rectangle)
    Check.typeOf.object("otherRectangle", otherRectangle)

    if (!defined(result)) {
      result = new Rectangle()
    }

    let rectangleEast = rectangle.east
    let rectangleWest = rectangle.west
    let otherRectangleEast = otherRectangle.east
    let otherRectangleWest = otherRectangle.west

    if (rectangleEast < rectangleWest && otherRectangleEast > 0.0) {
      rectangleEast += CesiumMath.TWO_PI
    } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0.0) {
      otherRectangleEast += CesiumMath.TWO_PI
    }

    if (rectangleEast < rectangleWest && otherRectangleWest < 0.0) {
      otherRectangleWest += CesiumMath.TWO_PI
    } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0.0) {
      rectangleWest += CesiumMath.TWO_PI
    }

    const west = CesiumMath.negativePiToPi(Math.min(rectangleWest, otherRectangleWest))
    const east = CesiumMath.negativePiToPi(Math.max(rectangleEast, otherRectangleEast))

    result.west = west
    result.south = Math.min(rectangle.south, otherRectangle.south)
    result.east = east
    result.north = Math.max(rectangle.north, otherRectangle.north)
    return result
  }

  /**
   * 扩大矩形以包含经纬高。
   *
   * @param rectangle 矩形
   * @param cartographic 经纬高
   * @param result 可选结果对象
   */
  static expand(rectangle: Rectangle, cartographic: Cartographic, result?: Rectangle): Rectangle {
    Check.typeOf.object("rectangle", rectangle)
    Check.typeOf.object("cartographic", cartographic)

    if (!defined(result)) {
      result = new Rectangle()
    }

    result.west = Math.min(rectangle.west, cartographic.longitude)
    result.south = Math.min(rectangle.south, cartographic.latitude)
    result.east = Math.max(rectangle.east, cartographic.longitude)
    result.north = Math.max(rectangle.north, cartographic.latitude)
    return result
  }

  /**
   * 经纬高是否在矩形内（含日界线）。
   *
   * @param rectangle 矩形
   * @param cartographic 经纬高
   */
  static contains(rectangle: Rectangle, cartographic: Cartographic): boolean {
    Check.typeOf.object("rectangle", rectangle)
    Check.typeOf.object("cartographic", cartographic)

    let longitude = cartographic.longitude
    const latitude = cartographic.latitude

    const west = rectangle.west
    let east = rectangle.east

    if (east < west) {
      east += CesiumMath.TWO_PI
      if (longitude < 0.0) {
        longitude += CesiumMath.TWO_PI
      }
    }
    return (
      (longitude > west || CesiumMath.equalsEpsilon(longitude, west, CesiumMath.EPSILON14)) &&
      (longitude < east || CesiumMath.equalsEpsilon(longitude, east, CesiumMath.EPSILON14)) &&
      latitude >= rectangle.south &&
      latitude <= rectangle.north
    )
  }

  /**
   * 采样矩形角点与赤道/子午线交点，供包围球使用。
   *
   * @param rectangle 矩形
   * @param ellipsoid 椭球
   * @param surfaceHeight 表面高
   * @param result 可选结果数组
   */
  static subsample(
    rectangle: Rectangle,
    ellipsoid?: Ellipsoid,
    surfaceHeight?: number,
    result?: Cartesian3[],
  ): Cartesian3[] {
    Check.typeOf.object("rectangle", rectangle)

    const nextEllipsoid = ellipsoid ?? Ellipsoid.default
    const nextHeight = surfaceHeight ?? 0.0

    if (!defined(result)) {
      result = []
    }
    let length = 0

    const north = rectangle.north
    const south = rectangle.south
    const east = rectangle.east
    const west = rectangle.west

    const lla = subsampleLlaScratch
    lla.height = nextHeight

    lla.longitude = west
    lla.latitude = north
    result[length] = nextEllipsoid.cartographicToCartesian(lla, result[length])
    length++

    lla.longitude = east
    result[length] = nextEllipsoid.cartographicToCartesian(lla, result[length])
    length++

    lla.latitude = south
    result[length] = nextEllipsoid.cartographicToCartesian(lla, result[length])
    length++

    lla.longitude = west
    result[length] = nextEllipsoid.cartographicToCartesian(lla, result[length])
    length++

    if (north < 0.0) {
      lla.latitude = north
    } else if (south > 0.0) {
      lla.latitude = south
    } else {
      lla.latitude = 0.0
    }

    for (let i = 1; i < 8; ++i) {
      lla.longitude = -Math.PI + i * CesiumMath.PI_OVER_TWO
      if (Rectangle.contains(rectangle, lla)) {
        result[length] = nextEllipsoid.cartographicToCartesian(lla, result[length])
        length++
      }
    }

    if (lla.latitude === 0.0) {
      lla.longitude = west
      result[length] = nextEllipsoid.cartographicToCartesian(lla, result[length])
      length++
      lla.longitude = east
      result[length] = nextEllipsoid.cartographicToCartesian(lla, result[length])
      length++
    }
    result.length = length
    return result
  }

  /**
   * 按 [0,1] 归一化坐标取子矩形。
   *
   * @param rectangle 矩形
   * @param westLerp 西插值
   * @param southLerp 南插值
   * @param eastLerp 东插值
   * @param northLerp 北插值
   * @param result 可选结果对象
   */
  static subsection(
    rectangle: Rectangle,
    westLerp: number,
    southLerp: number,
    eastLerp: number,
    northLerp: number,
    result?: Rectangle,
  ): Rectangle {
    Check.typeOf.object("rectangle", rectangle)
    Check.typeOf.number.greaterThanOrEquals("westLerp", westLerp, 0.0)
    Check.typeOf.number.lessThanOrEquals("westLerp", westLerp, 1.0)
    Check.typeOf.number.greaterThanOrEquals("southLerp", southLerp, 0.0)
    Check.typeOf.number.lessThanOrEquals("southLerp", southLerp, 1.0)
    Check.typeOf.number.greaterThanOrEquals("eastLerp", eastLerp, 0.0)
    Check.typeOf.number.lessThanOrEquals("eastLerp", eastLerp, 1.0)
    Check.typeOf.number.greaterThanOrEquals("northLerp", northLerp, 0.0)
    Check.typeOf.number.lessThanOrEquals("northLerp", northLerp, 1.0)
    Check.typeOf.number.lessThanOrEquals("westLerp", westLerp, eastLerp)
    Check.typeOf.number.lessThanOrEquals("southLerp", southLerp, northLerp)

    if (!defined(result)) {
      result = new Rectangle()
    }

    if (rectangle.west <= rectangle.east) {
      const width = rectangle.east - rectangle.west
      result.west = rectangle.west + westLerp * width
      result.east = rectangle.west + eastLerp * width
    } else {
      const width = CesiumMath.TWO_PI + rectangle.east - rectangle.west
      result.west = CesiumMath.negativePiToPi(rectangle.west + westLerp * width)
      result.east = CesiumMath.negativePiToPi(rectangle.west + eastLerp * width)
    }
    const height = rectangle.north - rectangle.south
    result.south = rectangle.south + southLerp * height
    result.north = rectangle.south + northLerp * height

    if (westLerp === 1.0) {
      result.west = rectangle.east
    }
    if (eastLerp === 1.0) {
      result.east = rectangle.east
    }
    if (southLerp === 1.0) {
      result.south = rectangle.north
    }
    if (northLerp === 1.0) {
      result.north = rectangle.north
    }

    return result
  }

  /**
   * 复制本实例。
   *
   * @param result 可选结果对象
   */
  clone(result?: Rectangle): Rectangle {
    return Rectangle.clone(this, result)!
  }

  /**
   * 与本实例精确相等。
   *
   * @param other 另一矩形
   */
  equals(other?: Rectangle): boolean {
    return Rectangle.equals(this, other)
  }

  /**
   * 与本实例在 epsilon 内相等。
   *
   * @param other 另一矩形
   * @param epsilon 容差
   */
  equalsEpsilon(other?: Rectangle, epsilon?: number): boolean {
    return Rectangle.equalsEpsilon(this, other, epsilon)
  }
}
