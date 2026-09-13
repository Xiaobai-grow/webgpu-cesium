/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Cartesian2 } from "./Cartesian2"
import type { Cartographic } from "./Cartographic"
import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"
import { sampleTerrain } from "./sampleTerrain"
import type { TerrainProvider } from "./TerrainProvider"

const scratchCartesian2 = new Cartesian2()

/**
 * 在最细可用 LOD 采样。需要 `terrainProvider.availability`。
 * 对标 Cesium `Core/sampleTerrainMostDetailed.js`。
 *
 * @param terrainProvider Provider
 * @param positions 经纬点
 * @param rejectOnTileFail 失败是否拒绝
 */
export async function sampleTerrainMostDetailed(
  terrainProvider: TerrainProvider,
  positions: Cartographic[],
  rejectOnTileFail = false,
): Promise<Cartographic[]> {
  if (!defined(terrainProvider)) {
    throw new DeveloperError("terrainProvider is required.")
  }
  if (!defined(positions)) {
    throw new DeveloperError("positions is required.")
  }
  const availability = terrainProvider.availability
  if (!defined(availability)) {
    throw new DeveloperError(
      "sampleTerrainMostDetailed requires a terrain provider that has tile availability.",
    )
  }

  const byLevel: Cartographic[][] = []
  const maxLevels: number[] = []
  const promises: Promise<unknown>[] = []

  for (const position of positions) {
    const maxLevel = availability.computeMaximumLevelAtPosition(position)
    maxLevels.push(maxLevel)
    if (maxLevel === 0) {
      const xy = terrainProvider.tilingScheme.positionToTileXY(position, 1, scratchCartesian2)
      if (defined(xy)) {
        const availabilityPromise = terrainProvider.loadTileDataAvailability(xy.x, xy.y, 1)
        if (defined(availabilityPromise)) {
          promises.push(availabilityPromise)
        }
      }
    }
    const atLevel = byLevel[maxLevel] ?? []
    atLevel.push(position)
    byLevel[maxLevel] = atLevel
  }

  await Promise.all(promises)
  const sampling: Promise<Cartographic[]>[] = []
  for (let index = 0; index < byLevel.length; index++) {
    const positionsAtLevel = byLevel[index]
    if (defined(positionsAtLevel) && positionsAtLevel.length > 0) {
      sampling.push(sampleTerrain(terrainProvider, index, positionsAtLevel, rejectOnTileFail))
    }
  }
  await Promise.all(sampling)

  const changedPositions: Cartographic[] = []
  for (let i = 0; i < positions.length; ++i) {
    const position = positions[i]
    if (position === undefined) {
      continue
    }
    const maxLevel = availability.computeMaximumLevelAtPosition(position)
    if (maxLevel !== maxLevels[i]) {
      changedPositions.push(position)
    }
  }
  if (changedPositions.length > 0) {
    await sampleTerrainMostDetailed(terrainProvider, changedPositions, rejectOnTileFail)
  }
  return positions
}
