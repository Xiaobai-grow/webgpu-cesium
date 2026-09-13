/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { createTaskProcessorWorker } from "../createTaskProcessorWorker"
import {
  createVerticesFromQuantizedTerrainMesh,
  type CreateVerticesFromQuantizedTerrainMeshInput,
} from "../createVerticesFromQuantizedTerrainMesh"
import { serializeTerrainMesh } from "../createVerticesFromHeightmap"

createTaskProcessorWorker((parameters, transferableObjects) => {
  const input = parameters as CreateVerticesFromQuantizedTerrainMeshInput
  const mesh = createVerticesFromQuantizedTerrainMesh(input)
  const result = serializeTerrainMesh(mesh)
  transferableObjects.push(result.vertices.buffer, result.indices.buffer)
  return result
})
