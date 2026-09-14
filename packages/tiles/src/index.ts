/**
 * @webgpu-cesium/tiles
 *
 * glTF 2.0、Model、3D Tiles 1.0 / 1.1。
 */
export type { FrameContext, TilesetCamera, TilesetCreditDisplay } from "./FrameContext"
export { bytesToDataUri, decodeDataUri, loadUriBytes } from "./uri"

export type { GltfJson, GltfMaterial, GltfNode, GltfPrimitive } from "./gltf/types"
export { hasExtension, usesExtension, getExtension } from "./gltf/hasExtension"
export { parseGlb, encodeGlb, isGlb } from "./gltf/parseGlb"
export { addDefaults } from "./gltf/addDefaults"
export { updateVersion } from "./gltf/updateVersion"
export { getAccessorData } from "./gltf/getAccessorData"
export { ResourceCache, defaultResourceCache } from "./gltf/ResourceCache"
export { GltfLoader, type GltfLoaderOptions, type LoadedGltf } from "./gltf/GltfLoader"
export {
  mapGltfMaterial,
  applyTextureTransform,
  specularGlossinessToMetallic,
} from "./gltf/mapGltfMaterial"
export {
  AttributeType,
  VertexAttributeSemantic,
  AlphaMode,
  Axis,
  type ModelComponents,
  type ModelPrimitive,
  type ModelNodeComponent,
} from "./gltf/ModelComponents"
export {
  createBoxGltfJson,
  createBoxGlb,
  createBoxB3dm,
  createCityTilesetJson,
  type BoxGltfOptions,
  type CityTilesetOptions,
} from "./gltf/createBoxGltf"

export { Model, type ModelFromGltfOptions, type ModelNodeHandle } from "./model/Model"
export { GpuMeshPrimitive } from "./model/GpuMeshPrimitive"

export {
  Cesium3DTileset,
  type Cesium3DTilesetOptions,
  type TilesetJson,
  type MaterialOverride,
  type MaterialOverrideInfo,
} from "./tileset/Cesium3DTileset"
export { Cesium3DTile, type TilesetTileJson } from "./tileset/Cesium3DTile"
export { Cesium3DTileRefine, type Cesium3DTileRefineValue } from "./tileset/Cesium3DTileRefine"
export {
  Cesium3DTileContentState,
  Empty3DTileContent,
  type Cesium3DTileContent,
} from "./tileset/Cesium3DTileContent"
export { Cesium3DTilesetCache } from "./tileset/Cesium3DTilesetCache"
export { Cesium3DTilesetStatistics } from "./tileset/Cesium3DTilesetStatistics"
export { computeScreenSpaceError, selectTiles } from "./tileset/Cesium3DTilesetTraversal"
export {
  TileBoundingSphere,
  TileOrientedBoundingBox,
  TileBoundingRegion as TilesetTileBoundingRegion,
  createTileBoundingVolume,
  boundingVolumeVisible,
  type TileBoundingVolume,
} from "./tileset/TileBoundingVolume"

export { parseB3dm, encodeB3dm } from "./content/B3dmParser"
export { parseI3dm } from "./content/I3dmParser"
export { parsePnts } from "./content/PntsParser"
export { parseComposite } from "./content/CompositeParser"
export { detectTileContentType, readMagic } from "./content/tileHeader"

export { MortonOrder } from "./implicit/MortonOrder"
export { HilbertOrder } from "./implicit/HilbertOrder"
export {
  ImplicitTileCoordinates,
  ImplicitSubdivisionScheme,
} from "./implicit/ImplicitTileCoordinates"
export {
  ImplicitAvailabilityBitstream,
  parseAvailability,
} from "./implicit/ImplicitAvailabilityBitstream"
export { ImplicitTileset } from "./implicit/ImplicitTileset"

export { parseMetadataSchema, MetadataEntity, type MetadataSchema } from "./metadata/MetadataSchema"
export { Cesium3DTileStyle, type Cesium3DTileStyleJson } from "./style/Cesium3DTileStyle"
export { Expression, ConditionsExpression } from "./style/Expression"
export { Cesium3DTileColorBlendMode } from "./style/Cesium3DTileColorBlendMode"
export { Cesium3DTileFeature, Cesium3DTilePointFeature } from "./feature/Cesium3DTileFeature"
export { featuresFromBatchTable } from "./feature/Cesium3DTileFeatureTable"

export {
  createGooglePhotorealistic3DTileset,
  GOOGLE_PHOTOREALISTIC_ION_ASSET_ID,
} from "./services/createGooglePhotorealistic3DTileset"
export {
  createOsmBuildingsAsync,
  OSM_BUILDINGS_ION_ASSET_ID,
} from "./services/createOsmBuildingsAsync"
