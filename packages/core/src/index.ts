/**
 * @webgpu-cesium/core
 *
 * M1：数学 / 地理 / 时间 / 请求 / 事件等 Cesium Core 移植。
 * 公开 API 保留 Cesium 原名（ADR-0004）。
 */
export { RuntimeError } from "./RuntimeError"
export { DeveloperError } from "./DeveloperError"
export { defined } from "./defined"
export { Check, type CheckNamespace, type CheckTypeOf, type NumberCheck } from "./Check"
export { Frozen } from "./Frozen"
export { clone } from "./clone"
export { combine } from "./combine"
export { destroyObject } from "./destroyObject"
export { Event, type EventListener, type RemoveCallback } from "./Event"
export { EventHelper } from "./EventHelper"
export { defer, type Deferred } from "./defer"
export { deprecationWarning } from "./deprecationWarning"
export { oneTimeWarning } from "./oneTimeWarning"
export { formatError } from "./formatError"
export { assert } from "./assert"
export { wrapFunction } from "./wrapFunction"
export { FeatureDetection } from "./FeatureDetection"
export { CesiumMath, CesiumMath as Math, type SmoothDampResult } from "./CesiumMath"
export { CESIUM_PORT_NOTICE } from "./copyright"
export type { TypedArray, TypedArrayConstructor, Destroyable } from "./globalTypes"

export { TimeConstants } from "./TimeConstants"
export { TimeStandard, type TimeStandardValue } from "./TimeStandard"
export { isLeapYear } from "./isLeapYear"
export { LeapSecond } from "./LeapSecond"
export { GregorianDate } from "./GregorianDate"
export { getTimestamp } from "./getTimestamp"
export { ClockRange, type ClockRangeValue } from "./ClockRange"
export { ClockStep, type ClockStepValue } from "./ClockStep"
export { ExtrapolationType, type ExtrapolationTypeValue } from "./ExtrapolationType"
export { InterpolationType, type InterpolationTypeValue } from "./InterpolationType"

export { Intersect, type IntersectValue } from "./Intersect"
export { Visibility, type VisibilityValue } from "./Visibility"
export { Interval } from "./Interval"
export { HeadingPitchRange } from "./HeadingPitchRange"
export { ReferenceFrame, type ReferenceFrameValue } from "./ReferenceFrame"
export { TrackingReferenceFrame, type TrackingReferenceFrameValue } from "./TrackingReferenceFrame"

export { RequestType, type RequestTypeValue } from "./RequestType"
export { RequestState, type RequestStateValue } from "./RequestState"
export { KeyboardEventModifier, type KeyboardEventModifierValue } from "./KeyboardEventModifier"
export { ScreenSpaceEventType, type ScreenSpaceEventTypeValue } from "./ScreenSpaceEventType"

export { appendForwardSlash } from "./appendForwardSlash"
export { getAbsoluteUri } from "./getAbsoluteUri"
export { getBaseUri } from "./getBaseUri"
export { getExtensionFromUri } from "./getExtensionFromUri"
export { getFilenameFromUri } from "./getFilenameFromUri"
export { isBlobUri } from "./isBlobUri"
export { isDataUri } from "./isDataUri"
export { isCrossOriginUrl } from "./isCrossOriginUrl"
export { objectToQuery } from "./objectToQuery"
export { queryToObject } from "./queryToObject"

export { binarySearch, type BinarySearchComparator } from "./binarySearch"
export { srgbToLinear } from "./srgbToLinear"
export { PrimitiveType, type GpuPrimitiveTopology } from "./PrimitiveType"
export {
  ComponentDatatype,
  type GpuVertexFormatName,
  type ComponentDatatypeValue,
} from "./ComponentDatatype"
export { IndexDatatype, type GpuIndexFormatName } from "./IndexDatatype"
export { Color, type ColorCartesian4Like, type ColorRandomOptions } from "./Color"
export { AttributeCompression } from "./AttributeCompression"
export { VertexFormat } from "./VertexFormat"
export { NearFarScalar } from "./NearFarScalar"

export { Cartesian2 } from "./Cartesian2"
export { Cartesian3 } from "./Cartesian3"
export { Cartesian4 } from "./Cartesian4"
export { Cartographic } from "./Cartographic"
export { Spherical } from "./Spherical"
export { Matrix2 } from "./Matrix2"
export { Matrix3, type EigenDecompositionResult } from "./Matrix3"
export {
  Matrix4,
  type CameraLike,
  type Viewport,
  type TranslationRotationScaleLike,
} from "./Matrix4"
export { Quaternion } from "./Quaternion"
export { HeadingPitchRoll } from "./HeadingPitchRoll"
export { scaleToGeodeticSurface } from "./scaleToGeodeticSurface"
export { Ellipsoid } from "./Ellipsoid"
export { EllipsoidGeodesic } from "./EllipsoidGeodesic"
export { EllipsoidRhumbLine } from "./EllipsoidRhumbLine"
export { EllipsoidTangentPlane } from "./EllipsoidTangentPlane"
export { Rectangle } from "./Rectangle"
export { MapProjection } from "./MapProjection"
export { GeographicProjection } from "./GeographicProjection"
export { WebMercatorProjection } from "./WebMercatorProjection"
export { Stereographic } from "./Stereographic"

export { BoundingRectangle } from "./BoundingRectangle"
export { BoundingSphere } from "./BoundingSphere"
export { AxisAlignedBoundingBox } from "./AxisAlignedBoundingBox"
export { OrientedBoundingBox } from "./OrientedBoundingBox"
export { Plane } from "./Plane"
export { Ray } from "./Ray"
export { IntersectionTests } from "./IntersectionTests"
export { Intersections2D } from "./Intersections2D"
export { CullingVolume } from "./CullingVolume"
export { Occluder } from "./Occluder"
export { EllipsoidalOccluder } from "./EllipsoidalOccluder"

export { PerspectiveFrustum } from "./PerspectiveFrustum"
export {
  PerspectiveOffCenterFrustum,
  computeReverseZPerspectiveOffCenter,
} from "./PerspectiveOffCenterFrustum"
export { OrthographicFrustum } from "./OrthographicFrustum"
export { OrthographicOffCenterFrustum } from "./OrthographicOffCenterFrustum"

export { EncodedCartesian3 } from "./EncodedCartesian3"
export { TranslationRotationScale } from "./TranslationRotationScale"
export { Transforms, type LocalAxisName, type LocalFrameToFixedFrame } from "./Transforms"

export { TilingScheme } from "./TilingScheme"
export { GeographicTilingScheme } from "./GeographicTilingScheme"
export { WebMercatorTilingScheme } from "./WebMercatorTilingScheme"

export { JulianDate } from "./JulianDate"
export { Iso8601 } from "./Iso8601"
export { TimeInterval, type TimeIntervalOptions } from "./TimeInterval"
export { TimeIntervalCollection } from "./TimeIntervalCollection"
export { Clock } from "./Clock"

export { Iau2006XysSample } from "./Iau2006XysSample"
export { IauOrientationParameters } from "./IauOrientationParameters"
export { Iau2000Orientation } from "./Iau2000Orientation"
export { IauOrientationAxes } from "./IauOrientationAxes"
export { EarthOrientationParametersSample } from "./EarthOrientationParametersSample"
export { EarthOrientationParameters } from "./EarthOrientationParameters"
export { Iau2006XysData } from "./Iau2006XysData"
export { Simon1994PlanetaryPositions } from "./Simon1994PlanetaryPositions"

export { Proxy } from "./Proxy"
export { DefaultProxy } from "./DefaultProxy"
export { TrustedServers } from "./TrustedServers"
export { RequestErrorEvent } from "./RequestErrorEvent"
export { Request } from "./Request"
export { RequestScheduler } from "./RequestScheduler"
export { Resource, type ResourceOptions, type FetchFn } from "./Resource"
export { buildModuleUrl } from "./buildModuleUrl"
export { parseResponseHeaders } from "./parseResponseHeaders"

export { TaskProcessor } from "./TaskProcessor"
export { createTaskProcessorWorker } from "./createTaskProcessorWorker"
export { ScreenSpaceEventHandler } from "./ScreenSpaceEventHandler"
export { Credit } from "./Credit"
export {
  EasingFunction,
  type EasingFunctionCallback,
  type EasingFunctionName,
} from "./EasingFunction"
export { TileProviderError, type TileProviderLike } from "./TileProviderError"
export { TerrainQuantization, type TerrainQuantizationValue } from "./TerrainQuantization"
export { HeightmapEncoding, type HeightmapEncodingValue } from "./HeightmapEncoding"
export {
  TerrainEncoding,
  TERRAIN_VERTEX_FLOATS,
  TERRAIN_VERTEX_STRIDE_BYTES,
} from "./TerrainEncoding"
export { TerrainMesh } from "./TerrainMesh"
export { TerrainData, type TerrainDataCreateMeshOptions } from "./TerrainData"
export { HeightmapTessellator, type HeightmapTessellatorOptions } from "./HeightmapTessellator"
export { HeightmapTerrainData, type HeightmapTerrainDataOptions } from "./HeightmapTerrainData"
export { TerrainProvider } from "./TerrainProvider"
export {
  EllipsoidTerrainProvider,
  ELLIPSOID_TERRAIN_HEIGHTMAP_WIDTH,
  type EllipsoidTerrainProviderOptions,
} from "./EllipsoidTerrainProvider"
export {
  createVerticesFromHeightmap,
  deserializeTerrainMesh,
  serializeTerrainMesh,
  type CreateVerticesFromHeightmapInput,
  type CreateVerticesFromHeightmapOutput,
} from "./createVerticesFromHeightmap"
export { getJsonFromTypedArray } from "./getJsonFromTypedArray"
export { VerticalExaggeration } from "./VerticalExaggeration"
export { TileAvailability } from "./TileAvailability"
export {
  ApproximateTerrainHeights,
  type ApproximateTerrainHeightTable,
} from "./ApproximateTerrainHeights"
export {
  DEFAULT_HEIGHTMAP_STRUCTURE,
  interpolateHeightmapSample,
  resolveHeightmapStructure,
  type HeightmapStructure,
} from "./heightmapStructure"
export {
  QuantizedMeshExtensionIds,
  parseQuantizedMesh,
  encodeQuantizedMesh,
  type QuantizedMeshParseResult,
  type EncodeQuantizedMeshInput,
} from "./quantizedMesh"
export {
  QuantizedMeshTerrainData,
  type QuantizedMeshTerrainDataOptions,
} from "./QuantizedMeshTerrainData"
export {
  createVerticesFromQuantizedTerrainMesh,
  type CreateVerticesFromQuantizedTerrainMeshInput,
} from "./createVerticesFromQuantizedTerrainMesh"
export { upsampleQuantizedTerrainMesh } from "./upsampleQuantizedTerrainMesh"
export { sampleTerrain } from "./sampleTerrain"
export { sampleTerrainMostDetailed } from "./sampleTerrainMostDetailed"
export { TerrainPicker } from "./TerrainPicker"
export {
  CustomHeightmapTerrainProvider,
  type CustomHeightmapGeometryCallback,
  type CustomHeightmapTerrainProviderOptions,
} from "./CustomHeightmapTerrainProvider"
export { Ion } from "./Ion"
export {
  IonResource,
  type IonAssetEndpoint,
  type IonResourceFromAssetIdOptions,
} from "./IonResource"
export { CesiumTerrainProvider, type CesiumTerrainProviderOptions } from "./CesiumTerrainProvider"
export { createWorldTerrainAsync, CESIUM_WORLD_TERRAIN_ASSET_ID } from "./createWorldTerrainAsync"
export {
  createWorldBathymetryAsync,
  CESIUM_WORLD_BATHYMETRY_ASSET_ID,
} from "./createWorldBathymetryAsync"
export {
  ArcGISTiledElevationTerrainProvider,
  type ArcGISTiledElevationTerrainProviderOptions,
} from "./ArcGISTiledElevationTerrainProvider"
export {
  setTerrainTaskProcessors,
  getHeightmapTaskProcessor,
  getQuantizedMeshTaskProcessor,
} from "./terrainTaskProcessors"

export { Heap } from "./Heap"
export { Queue } from "./Queue"
export { DoublyLinkedList } from "./DoublyLinkedList"
export { DoubleEndedPriorityQueue } from "./DoubleEndedPriorityQueue"
export { AssociativeArray } from "./AssociativeArray"
export { ManagedArray } from "./ManagedArray"
export { mergeSort } from "./mergeSort"
export { arrayRemoveDuplicates } from "./arrayRemoveDuplicates"
export { subdivideArray } from "./subdivideArray"
export { addAllToArray } from "./addAllToArray"
export { QuadraticRealPolynomial } from "./QuadraticRealPolynomial"
export { CubicRealPolynomial } from "./CubicRealPolynomial"
export { QuarticRealPolynomial } from "./QuarticRealPolynomial"
export { TridiagonalSystemSolver } from "./TridiagonalSystemSolver"
