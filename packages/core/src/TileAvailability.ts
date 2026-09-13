/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { binarySearch } from "./binarySearch"
import { Cartographic } from "./Cartographic"
import { defined } from "./defined"
import { Rectangle } from "./Rectangle"
import type { TilingScheme } from "./TilingScheme"

class RectangleWithLevel {
  level: number
  west: number
  south: number
  east: number
  north: number

  /**
   * @param level LOD
   * @param west 西
   * @param south 南
   * @param east 东
   * @param north 北
   */
  constructor(level: number, west: number, south: number, east: number, north: number) {
    this.level = level
    this.west = west
    this.south = south
    this.east = east
    this.north = north
  }
}

class AvailabilityNode {
  tilingScheme: TilingScheme
  parent: AvailabilityNode | undefined
  level: number
  x: number
  y: number
  extent: Rectangle
  rectangles: RectangleWithLevel[] = []
  _nw: AvailabilityNode | undefined
  _ne: AvailabilityNode | undefined
  _sw: AvailabilityNode | undefined
  _se: AvailabilityNode | undefined

  /**
   * @param tilingScheme 方案
   * @param parent 父节点
   * @param level LOD
   * @param x 列
   * @param y 行
   */
  constructor(
    tilingScheme: TilingScheme,
    parent: AvailabilityNode | undefined,
    level: number,
    x: number,
    y: number,
  ) {
    this.tilingScheme = tilingScheme
    this.parent = parent
    this.level = level
    this.x = x
    this.y = y
    this.extent = tilingScheme.tileXYToRectangle(x, y, level)
  }

  get nw(): AvailabilityNode {
    this._nw ??= new AvailabilityNode(
      this.tilingScheme,
      this,
      this.level + 1,
      this.x * 2,
      this.y * 2,
    )
    return this._nw
  }

  get ne(): AvailabilityNode {
    this._ne ??= new AvailabilityNode(
      this.tilingScheme,
      this,
      this.level + 1,
      this.x * 2 + 1,
      this.y * 2,
    )
    return this._ne
  }

  get sw(): AvailabilityNode {
    this._sw ??= new AvailabilityNode(
      this.tilingScheme,
      this,
      this.level + 1,
      this.x * 2,
      this.y * 2 + 1,
    )
    return this._sw
  }

  get se(): AvailabilityNode {
    this._se ??= new AvailabilityNode(
      this.tilingScheme,
      this,
      this.level + 1,
      this.x * 2 + 1,
      this.y * 2 + 1,
    )
    return this._se
  }
}

const rectangleScratch = new Rectangle()
const cartographicScratch = new Cartographic()
const rectanglesScratch: Rectangle[] = []
const remainingToCoverByLevelScratch: Rectangle[][] = []
const westScratch = new Rectangle()
const eastScratch = new Rectangle()

function findNode(level: number, x: number, y: number, nodes: AvailabilityNode[]): boolean {
  for (const node of nodes) {
    if (node.x === x && node.y === y && node.level === level) {
      return true
    }
  }
  return false
}

function rectanglesOverlap(
  rectangle1: { west: number; south: number; east: number; north: number },
  rectangle2: { west: number; south: number; east: number; north: number },
): boolean {
  const west = Math.max(rectangle1.west, rectangle2.west)
  const south = Math.max(rectangle1.south, rectangle2.south)
  const east = Math.min(rectangle1.east, rectangle2.east)
  const north = Math.min(rectangle1.north, rectangle2.north)
  return south < north && west < east
}

function rectangleFullyContainsRectangle(
  potentialContainer: { west: number; south: number; east: number; north: number },
  rectangleToTest: { west: number; south: number; east: number; north: number },
): boolean {
  return (
    rectangleToTest.west >= potentialContainer.west &&
    rectangleToTest.east <= potentialContainer.east &&
    rectangleToTest.south >= potentialContainer.south &&
    rectangleToTest.north <= potentialContainer.north
  )
}

function rectangleContainsPosition(
  potentialContainer: { west: number; south: number; east: number; north: number },
  positionToTest: Cartographic,
): boolean {
  return (
    positionToTest.longitude >= potentialContainer.west &&
    positionToTest.longitude <= potentialContainer.east &&
    positionToTest.latitude >= potentialContainer.south &&
    positionToTest.latitude <= potentialContainer.north
  )
}

function rectangleLevelComparator(a: RectangleWithLevel, b: number): number {
  return a.level - b
}

function putRectangleInQuadtree(
  maxDepth: number,
  startNode: AvailabilityNode,
  rectangle: RectangleWithLevel,
): void {
  let node = startNode
  while (node.level < maxDepth) {
    if (rectangleFullyContainsRectangle(node.nw.extent, rectangle)) {
      node = node.nw
    } else if (rectangleFullyContainsRectangle(node.ne.extent, rectangle)) {
      node = node.ne
    } else if (rectangleFullyContainsRectangle(node.sw.extent, rectangle)) {
      node = node.sw
    } else if (rectangleFullyContainsRectangle(node.se.extent, rectangle)) {
      node = node.se
    } else {
      break
    }
  }

  if (
    node.rectangles.length === 0 ||
    (node.rectangles[node.rectangles.length - 1]?.level ?? 0) <= rectangle.level
  ) {
    node.rectangles.push(rectangle)
  } else {
    let index = binarySearch(node.rectangles, rectangle.level, rectangleLevelComparator)
    if (index < 0) {
      index = ~index
    }
    node.rectangles.splice(index, 0, rectangle)
  }
}

function findMaxLevelFromNode(
  stopNode: AvailabilityNode | undefined,
  startNode: AvailabilityNode,
  position: Cartographic,
): number {
  let maxLevel = 0
  let node: AvailabilityNode = startNode
  let found = false
  while (!found) {
    const nw = node._nw !== undefined && rectangleContainsPosition(node._nw.extent, position)
    const ne = node._ne !== undefined && rectangleContainsPosition(node._ne.extent, position)
    const sw = node._sw !== undefined && rectangleContainsPosition(node._sw.extent, position)
    const se = node._se !== undefined && rectangleContainsPosition(node._se.extent, position)
    const hits = Number(nw) + Number(ne) + Number(sw) + Number(se)
    if (hits > 1) {
      if (nw && node._nw) {
        maxLevel = Math.max(maxLevel, findMaxLevelFromNode(node, node._nw, position))
      }
      if (ne && node._ne) {
        maxLevel = Math.max(maxLevel, findMaxLevelFromNode(node, node._ne, position))
      }
      if (sw && node._sw) {
        maxLevel = Math.max(maxLevel, findMaxLevelFromNode(node, node._sw, position))
      }
      if (se && node._se) {
        maxLevel = Math.max(maxLevel, findMaxLevelFromNode(node, node._se, position))
      }
      break
    } else if (nw && node._nw) {
      node = node._nw
    } else if (ne && node._ne) {
      node = node._ne
    } else if (sw && node._sw) {
      node = node._sw
    } else if (se && node._se) {
      node = node._se
    } else {
      found = true
    }
  }

  let walk: AvailabilityNode | undefined = node
  while (walk !== undefined && walk !== stopNode) {
    const rectangles = walk.rectangles
    for (let i = rectangles.length - 1; i >= 0; --i) {
      const rectangle = rectangles[i]
      if (rectangle === undefined || rectangle.level <= maxLevel) {
        continue
      }
      if (rectangleContainsPosition(rectangle, position)) {
        maxLevel = rectangle.level
      }
    }
    walk = walk.parent
  }
  return maxLevel
}

function subtractRectangle(
  rectangleList: Rectangle[],
  rectangleToSubtract: { west: number; south: number; east: number; north: number },
): Rectangle[] {
  const result: Rectangle[] = []
  for (const rectangle of rectangleList) {
    if (!rectanglesOverlap(rectangle, rectangleToSubtract)) {
      result.push(rectangle)
      continue
    }
    if (rectangle.west < rectangleToSubtract.west) {
      result.push(
        new Rectangle(rectangle.west, rectangle.south, rectangleToSubtract.west, rectangle.north),
      )
    }
    if (rectangle.east > rectangleToSubtract.east) {
      result.push(
        new Rectangle(rectangleToSubtract.east, rectangle.south, rectangle.east, rectangle.north),
      )
    }
    if (rectangle.south < rectangleToSubtract.south) {
      result.push(
        new Rectangle(
          Math.max(rectangleToSubtract.west, rectangle.west),
          rectangle.south,
          Math.min(rectangleToSubtract.east, rectangle.east),
          rectangleToSubtract.south,
        ),
      )
    }
    if (rectangle.north > rectangleToSubtract.north) {
      result.push(
        new Rectangle(
          Math.max(rectangleToSubtract.west, rectangle.west),
          rectangleToSubtract.north,
          Math.min(rectangleToSubtract.east, rectangle.east),
          rectangle.north,
        ),
      )
    }
  }
  return result
}

function updateCoverageWithNode(
  remainingToCoverByLevel: Rectangle[][],
  node: AvailabilityNode | undefined,
  rectanglesToCover: Rectangle[],
): void {
  if (node === undefined) {
    return
  }
  let anyOverlap = false
  for (const cover of rectanglesToCover) {
    anyOverlap = anyOverlap || rectanglesOverlap(node.extent, cover)
  }
  if (!anyOverlap) {
    return
  }
  for (const rectangle of node.rectangles) {
    remainingToCoverByLevel[rectangle.level] ??= rectanglesToCover
    remainingToCoverByLevel[rectangle.level] = subtractRectangle(
      remainingToCoverByLevel[rectangle.level] ?? rectanglesToCover,
      rectangle,
    )
  }
  updateCoverageWithNode(remainingToCoverByLevel, node._nw, rectanglesToCover)
  updateCoverageWithNode(remainingToCoverByLevel, node._ne, rectanglesToCover)
  updateCoverageWithNode(remainingToCoverByLevel, node._sw, rectanglesToCover)
  updateCoverageWithNode(remainingToCoverByLevel, node._se, rectanglesToCover)
}

/**
 * 瓦片可用性四叉树。对标 Cesium `Core/TileAvailability.js`。
 */
export class TileAvailability {
  private readonly _tilingScheme: TilingScheme
  private readonly _maximumLevel: number
  private readonly _rootNodes: AvailabilityNode[] = []

  /**
   * @param tilingScheme 瓦片方案
   * @param maximumLevel 可能存在的最大 LOD
   */
  constructor(tilingScheme: TilingScheme, maximumLevel: number) {
    this._tilingScheme = tilingScheme
    this._maximumLevel = maximumLevel
  }

  get maximumLevel(): number {
    return this._maximumLevel
  }

  /**
   * 标记某级矩形范围内的瓦片可用。
   *
   * @param level LOD
   * @param startX 起始列
   * @param startY 起始行
   * @param endX 结束列
   * @param endY 结束行
   */
  addAvailableTileRange(
    level: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): void {
    const tilingScheme = this._tilingScheme
    const rootNodes = this._rootNodes
    if (level === 0) {
      for (let y = startY; y <= endY; ++y) {
        for (let x = startX; x <= endX; ++x) {
          if (!findNode(level, x, y, rootNodes)) {
            rootNodes.push(new AvailabilityNode(tilingScheme, undefined, 0, x, y))
          }
        }
      }
    }

    tilingScheme.tileXYToRectangle(startX, startY, level, rectangleScratch)
    const west = rectangleScratch.west
    const north = rectangleScratch.north
    tilingScheme.tileXYToRectangle(endX, endY, level, rectangleScratch)
    const east = rectangleScratch.east
    const south = rectangleScratch.south
    const rectangleWithLevel = new RectangleWithLevel(level, west, south, east, north)
    for (const rootNode of rootNodes) {
      if (rectanglesOverlap(rootNode.extent, rectangleWithLevel)) {
        putRectangleInQuadtree(this._maximumLevel, rootNode, rectangleWithLevel)
      }
    }
  }

  /**
   * 覆盖该点的最细可用 LOD；不在任何瓦片内返回 -1。
   *
   * @param position 经纬（高度忽略）
   */
  computeMaximumLevelAtPosition(position: Cartographic): number {
    let node: AvailabilityNode | undefined
    for (const rootNode of this._rootNodes) {
      if (rectangleContainsPosition(rootNode.extent, position)) {
        node = rootNode
        break
      }
    }
    if (!defined(node)) {
      return -1
    }
    return findMaxLevelFromNode(undefined, node, position)
  }

  /**
   * 矩形内处处都可用的最细 LOD。
   *
   * @param rectangle 查询矩形
   */
  computeBestAvailableLevelOverRectangle(rectangle: Rectangle): number {
    const rectangles = rectanglesScratch
    rectangles.length = 0
    if (rectangle.east < rectangle.west) {
      rectangles.push(
        Rectangle.fromRadians(
          -Math.PI,
          rectangle.south,
          rectangle.east,
          rectangle.north,
          westScratch,
        ),
      )
      rectangles.push(
        Rectangle.fromRadians(
          rectangle.west,
          rectangle.south,
          Math.PI,
          rectangle.north,
          eastScratch,
        ),
      )
    } else {
      rectangles.push(rectangle)
    }

    const remainingToCoverByLevel = remainingToCoverByLevelScratch
    remainingToCoverByLevel.length = 0
    for (const rootNode of this._rootNodes) {
      updateCoverageWithNode(remainingToCoverByLevel, rootNode, rectangles)
    }
    for (let i = remainingToCoverByLevel.length - 1; i >= 0; --i) {
      const remaining = remainingToCoverByLevel[i]
      if (defined(remaining) && remaining.length === 0) {
        return i
      }
    }
    return 0
  }

  /**
   * 指定瓦片是否可用。
   *
   * @param level LOD
   * @param x 列
   * @param y 行
   */
  isTileAvailable(level: number, x: number, y: number): boolean {
    const rectangle = this._tilingScheme.tileXYToRectangle(x, y, level, rectangleScratch)
    Rectangle.center(rectangle, cartographicScratch)
    return this.computeMaximumLevelAtPosition(cartographicScratch) >= level
  }

  /**
   * 四个子瓦片可用性掩码：SW=1 SE=2 NW=4 NE=8。
   *
   * @param level 父 LOD
   * @param x 父列
   * @param y 父行
   */
  computeChildMaskForTile(level: number, x: number, y: number): number {
    const childLevel = level + 1
    if (childLevel >= this._maximumLevel) {
      return 0
    }
    let mask = 0
    mask |= this.isTileAvailable(childLevel, 2 * x, 2 * y + 1) ? 1 : 0
    mask |= this.isTileAvailable(childLevel, 2 * x + 1, 2 * y + 1) ? 2 : 0
    mask |= this.isTileAvailable(childLevel, 2 * x, 2 * y) ? 4 : 0
    mask |= this.isTileAvailable(childLevel, 2 * x + 1, 2 * y) ? 8 : 0
    return mask
  }
}
