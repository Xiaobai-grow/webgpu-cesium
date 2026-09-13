/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { CesiumTerrainProvider, type CesiumTerrainProviderOptions } from "./CesiumTerrainProvider"
import { Ellipsoid } from "./Ellipsoid"
import { Frozen } from "./Frozen"

/** Cesium World Terrain ion 资产 ID */
export const CESIUM_WORLD_TERRAIN_ASSET_ID = 1

/**
 * 创建 Cesium World Terrain。对标 Cesium `Core/createWorldTerrainAsync.js`。
 *
 * @param options 法线 / 水面掩码
 */
export function createWorldTerrainAsync(
  options?: Pick<CesiumTerrainProviderOptions, "requestVertexNormals" | "requestWaterMask">,
): Promise<CesiumTerrainProvider> {
  const opts = options ?? Frozen.EMPTY_OBJECT
  return CesiumTerrainProvider.fromIonAssetId(CESIUM_WORLD_TERRAIN_ASSET_ID, {
    requestVertexNormals: opts.requestVertexNormals ?? false,
    requestWaterMask: opts.requestWaterMask ?? false,
    ellipsoid: Ellipsoid.WGS84,
  })
}
