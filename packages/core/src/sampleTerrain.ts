/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import type { Cartographic } from "./Cartographic"
import { Check } from "./Check"
import { defined } from "./defined"
import type { Rectangle } from "./Rectangle"
import type { TerrainData } from "./TerrainData"
import type { TerrainProvider } from "./TerrainProvider"

interface TileRequest {
  x: number
  y: number
  level: number
  terrainProvider: TerrainProvider
  positions: Cartographic[]
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = (globalThis as { setTimeout?: (fn: () => void, delay: number) => unknown })
      .setTimeout
    if (timer) {
      timer(resolve, ms)
      return
    }
    resolve()
  })
}

function interpolateAndAssignHeight(
  position: Cartographic,
  terrainData: TerrainData,
  rectangle: Rectangle,
): boolean {
  const height = terrainData.interpolateHeight(rectangle, position.longitude, position.latitude)
  if (height === undefined) {
    return false
  }
  position.height = height
  return true
}

function createInterpolateFunction(
  tileRequest: TileRequest,
): (terrainData: TerrainData) => Promise<void> {
  const tilePositions = tileRequest.positions
  const rectangle = tileRequest.terrainProvider.tilingScheme.tileXYToRectangle(
    tileRequest.x,
    tileRequest.y,
    tileRequest.level,
  )
  return async (terrainData: TerrainData) => {
    let isMeshRequired = false
    for (const position of tilePositions) {
      if (!interpolateAndAssignHeight(position, terrainData, rectangle)) {
        isMeshRequired = true
        break
      }
    }
    if (!isMeshRequired) {
      return
    }
    await terrainData.createMesh({
      tilingScheme: tileRequest.terrainProvider.tilingScheme,
      x: tileRequest.x,
      y: tileRequest.y,
      level: tileRequest.level,
      throttle: false,
    })
    for (const position of tilePositions) {
      interpolateAndAssignHeight(position, terrainData, rectangle)
    }
  }
}

function createMarkFailedFunction(tileRequest: TileRequest): () => void {
  return () => {
    for (const position of tileRequest.positions) {
      position.height = Number.NaN
    }
  }
}

function attemptConsumeNextQueueItem(
  tileRequests: TileRequest[],
  results: Promise<void>[],
  rejectOnTileFail: boolean,
): boolean {
  const tileRequest = tileRequests[0]
  if (tileRequest === undefined) {
    return true
  }
  const requestPromise = tileRequest.terrainProvider.requestTileGeometry(
    tileRequest.x,
    tileRequest.y,
    tileRequest.level,
  )
  if (!defined(requestPromise)) {
    return false
  }
  const interpolate = createInterpolateFunction(tileRequest)
  const promise = rejectOnTileFail
    ? requestPromise.then(interpolate)
    : requestPromise.then(interpolate).catch(createMarkFailedFunction(tileRequest))
  tileRequests.shift()
  results.push(promise)
  return true
}

async function drainTileRequestQueue(
  tileRequests: TileRequest[],
  results: Promise<void>[],
  rejectOnTileFail: boolean,
): Promise<void> {
  if (tileRequests.length === 0) {
    return
  }
  const success = attemptConsumeNextQueueItem(tileRequests, results, rejectOnTileFail)
  if (success) {
    return drainTileRequestQueue(tileRequests, results, rejectOnTileFail)
  }
  await delay(100)
  return drainTileRequestQueue(tileRequests, results, rejectOnTileFail)
}

/**
 * 在指定 LOD 采样地形高，就地写入 `positions[].height`。
 * 对标 Cesium `Core/sampleTerrain.js`。
 *
 * @param terrainProvider Provider
 * @param level LOD
 * @param positions 经纬点
 * @param rejectOnTileFail 失败是否拒绝
 */
export async function sampleTerrain(
  terrainProvider: TerrainProvider,
  level: number,
  positions: Cartographic[],
  rejectOnTileFail = false,
): Promise<Cartographic[]> {
  Check.typeOf.object("terrainProvider", terrainProvider)
  Check.typeOf.number("level", level)
  Check.defined("positions", positions)

  const tileRequests: TileRequest[] = []
  const tileRequestSet = new Map<string, TileRequest>()
  for (const position of positions) {
    const xy = terrainProvider.tilingScheme.positionToTileXY(position, level)
    if (!defined(xy)) {
      continue
    }
    const key = `${xy.x},${xy.y}`
    let request = tileRequestSet.get(key)
    if (!defined(request)) {
      request = {
        x: xy.x,
        y: xy.y,
        level,
        terrainProvider,
        positions: [],
      }
      tileRequestSet.set(key, request)
      tileRequests.push(request)
    }
    request.positions.push(position)
  }

  const tilePromises: Promise<void>[] = []
  await drainTileRequestQueue(tileRequests, tilePromises, rejectOnTileFail)
  await Promise.all(tilePromises)
  return positions
}
