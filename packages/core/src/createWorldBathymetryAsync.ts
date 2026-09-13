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
import { Frozen } from "./Frozen"

/** Cesium World Bathymetry ion 资产 ID */
export const CESIUM_WORLD_BATHYMETRY_ASSET_ID = 2426648

/**
 * 创建 Cesium World Bathymetry。对标 Cesium `Core/createWorldBathymetryAsync.js`。
 *
 * @param options 法线
 */
export function createWorldBathymetryAsync(
  options?: Pick<CesiumTerrainProviderOptions, "requestVertexNormals">,
): Promise<CesiumTerrainProvider> {
  const opts = options ?? Frozen.EMPTY_OBJECT
  return CesiumTerrainProvider.fromIonAssetId(CESIUM_WORLD_BATHYMETRY_ASSET_ID, {
    requestVertexNormals: opts.requestVertexNormals ?? false,
  })
}
