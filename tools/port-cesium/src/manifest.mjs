/**
 * M1 移植清单：与 docs/30-roadmap/03-first-globe-checklist.md 1.2–1.15
 * 以及 02-cesium-module-inventory.md 的 M1 行对齐。
 *
 * 每个条目：Cesium Source/Core 相对路径（无扩展名）→ 目标文件名。
 */

export const CESIUM_CORE = "packages/engine/Source/Core"
export const CESIUM_WORKERS = "packages/engine/Source/Workers"
export const CESIUM_SPECS = "packages/engine/Specs/Core"

/** @typedef {{ id: string, group: string, cesium: string, dest?: string, notes?: string, skip?: string }} PortModule */

/** @type {PortModule[]} */
export const M1_MODULES = [
  // 1.2 基础工具
  { id: "defined", group: "foundation", cesium: "defined" },
  { id: "DeveloperError", group: "foundation", cesium: "DeveloperError" },
  { id: "RuntimeError", group: "foundation", cesium: "RuntimeError" },
  { id: "Check", group: "foundation", cesium: "Check" },
  { id: "Frozen", group: "foundation", cesium: "Frozen" },
  { id: "clone", group: "foundation", cesium: "clone" },
  { id: "combine", group: "foundation", cesium: "combine" },
  { id: "destroyObject", group: "foundation", cesium: "destroyObject" },
  { id: "Event", group: "foundation", cesium: "Event" },
  { id: "EventHelper", group: "foundation", cesium: "EventHelper" },
  { id: "defer", group: "foundation", cesium: "defer" },
  { id: "deprecationWarning", group: "foundation", cesium: "deprecationWarning" },
  { id: "oneTimeWarning", group: "foundation", cesium: "oneTimeWarning" },
  { id: "formatError", group: "foundation", cesium: "formatError" },
  { id: "assert", group: "foundation", cesium: "assert" },
  { id: "wrapFunction", group: "foundation", cesium: "wrapFunction" },
  {
    id: "Math",
    group: "foundation",
    cesium: "Math",
    dest: "CesiumMath",
    notes: "导出名 CesiumMath",
  },
  {
    id: "FeatureDetection",
    group: "foundation",
    cesium: "FeatureDetection",
    notes: "只留 endian / typed array 等纯 JS 探测；WebGL / WebGPU / Image 探测不移植",
  },

  // 1.3 向量与矩阵
  { id: "Cartesian2", group: "math", cesium: "Cartesian2" },
  { id: "Cartesian3", group: "math", cesium: "Cartesian3" },
  { id: "Cartesian4", group: "math", cesium: "Cartesian4" },
  { id: "Cartographic", group: "math", cesium: "Cartographic" },
  { id: "Spherical", group: "math", cesium: "Spherical" },
  { id: "Matrix2", group: "math", cesium: "Matrix2" },
  { id: "Matrix3", group: "math", cesium: "Matrix3" },
  { id: "Matrix4", group: "math", cesium: "Matrix4" },
  { id: "Quaternion", group: "math", cesium: "Quaternion" },
  { id: "HeadingPitchRoll", group: "math", cesium: "HeadingPitchRoll" },
  { id: "HeadingPitchRange", group: "math", cesium: "HeadingPitchRange" },

  // 1.4 椭球与投影
  { id: "scaleToGeodeticSurface", group: "geo", cesium: "scaleToGeodeticSurface" },
  { id: "Ellipsoid", group: "geo", cesium: "Ellipsoid" },
  { id: "EllipsoidGeodesic", group: "geo", cesium: "EllipsoidGeodesic" },
  { id: "EllipsoidRhumbLine", group: "geo", cesium: "EllipsoidRhumbLine" },
  { id: "EllipsoidTangentPlane", group: "geo", cesium: "EllipsoidTangentPlane" },
  { id: "Rectangle", group: "geo", cesium: "Rectangle" },
  { id: "MapProjection", group: "geo", cesium: "MapProjection" },
  { id: "GeographicProjection", group: "geo", cesium: "GeographicProjection" },
  { id: "WebMercatorProjection", group: "geo", cesium: "WebMercatorProjection" },
  { id: "Stereographic", group: "geo", cesium: "Stereographic" },

  // 1.5 包围体与相交
  { id: "BoundingRectangle", group: "bounds", cesium: "BoundingRectangle" },
  { id: "BoundingSphere", group: "bounds", cesium: "BoundingSphere" },
  { id: "AxisAlignedBoundingBox", group: "bounds", cesium: "AxisAlignedBoundingBox" },
  { id: "OrientedBoundingBox", group: "bounds", cesium: "OrientedBoundingBox" },
  { id: "Plane", group: "bounds", cesium: "Plane" },
  { id: "Ray", group: "bounds", cesium: "Ray" },
  { id: "Interval", group: "bounds", cesium: "Interval" },
  { id: "Intersect", group: "bounds", cesium: "Intersect" },
  { id: "Visibility", group: "bounds", cesium: "Visibility" },
  { id: "IntersectionTests", group: "bounds", cesium: "IntersectionTests" },
  { id: "Intersections2D", group: "bounds", cesium: "Intersections2D" },
  { id: "CullingVolume", group: "bounds", cesium: "CullingVolume" },
  { id: "Occluder", group: "bounds", cesium: "Occluder" },
  { id: "EllipsoidalOccluder", group: "bounds", cesium: "EllipsoidalOccluder" },

  // 1.6 视锥（改写 Reverse-Z）
  {
    id: "PerspectiveOffCenterFrustum",
    group: "frustum",
    cesium: "PerspectiveOffCenterFrustum",
    notes: "改写：0..1 深度 + Reverse-Z",
  },
  {
    id: "PerspectiveFrustum",
    group: "frustum",
    cesium: "PerspectiveFrustum",
    notes: "改写：0..1 深度 + Reverse-Z",
  },
  {
    id: "OrthographicOffCenterFrustum",
    group: "frustum",
    cesium: "OrthographicOffCenterFrustum",
    notes: "改写：0..1 深度 + Reverse-Z",
  },
  {
    id: "OrthographicFrustum",
    group: "frustum",
    cesium: "OrthographicFrustum",
    notes: "改写：0..1 深度 + Reverse-Z",
  },

  // 1.7 变换
  { id: "EncodedCartesian3", group: "transform", cesium: "EncodedCartesian3" },
  { id: "TranslationRotationScale", group: "transform", cesium: "TranslationRotationScale" },
  { id: "ReferenceFrame", group: "transform", cesium: "ReferenceFrame" },
  { id: "TrackingReferenceFrame", group: "transform", cesium: "TrackingReferenceFrame" },
  { id: "Transforms", group: "transform", cesium: "Transforms" },

  // 1.8 瓦片方案
  { id: "TilingScheme", group: "tiling", cesium: "TilingScheme" },
  { id: "GeographicTilingScheme", group: "tiling", cesium: "GeographicTilingScheme" },
  { id: "WebMercatorTilingScheme", group: "tiling", cesium: "WebMercatorTilingScheme" },

  // 1.9 时间
  { id: "TimeConstants", group: "time", cesium: "TimeConstants" },
  { id: "TimeStandard", group: "time", cesium: "TimeStandard" },
  { id: "LeapSecond", group: "time", cesium: "LeapSecond" },
  { id: "GregorianDate", group: "time", cesium: "GregorianDate" },
  { id: "isLeapYear", group: "time", cesium: "isLeapYear" },
  { id: "JulianDate", group: "time", cesium: "JulianDate" },
  { id: "Iso8601", group: "time", cesium: "Iso8601" },
  { id: "TimeInterval", group: "time", cesium: "TimeInterval" },
  { id: "TimeIntervalCollection", group: "time", cesium: "TimeIntervalCollection" },
  { id: "ExtrapolationType", group: "time", cesium: "ExtrapolationType" },
  { id: "InterpolationType", group: "time", cesium: "InterpolationType" },
  { id: "ClockRange", group: "time", cesium: "ClockRange" },
  { id: "ClockStep", group: "time", cesium: "ClockStep" },
  { id: "Clock", group: "time", cesium: "Clock" },
  { id: "getTimestamp", group: "time", cesium: "getTimestamp" },

  // 1.10 天体历表
  { id: "Iau2006XysSample", group: "celestial", cesium: "Iau2006XysSample" },
  { id: "IauOrientationParameters", group: "celestial", cesium: "IauOrientationParameters" },
  { id: "Iau2000Orientation", group: "celestial", cesium: "Iau2000Orientation" },
  { id: "IauOrientationAxes", group: "celestial", cesium: "IauOrientationAxes" },
  {
    id: "EarthOrientationParametersSample",
    group: "celestial",
    cesium: "EarthOrientationParametersSample",
  },
  { id: "EarthOrientationParameters", group: "celestial", cesium: "EarthOrientationParameters" },
  {
    id: "Iau2006XysData",
    group: "celestial",
    cesium: "Iau2006XysData",
    notes: "需要本地 XYS JSON",
  },
  { id: "Simon1994PlanetaryPositions", group: "celestial", cesium: "Simon1994PlanetaryPositions" },

  // 1.11 网络
  { id: "appendForwardSlash", group: "request", cesium: "appendForwardSlash" },
  { id: "getAbsoluteUri", group: "request", cesium: "getAbsoluteUri" },
  { id: "getBaseUri", group: "request", cesium: "getBaseUri" },
  { id: "getExtensionFromUri", group: "request", cesium: "getExtensionFromUri" },
  { id: "getFilenameFromUri", group: "request", cesium: "getFilenameFromUri" },
  { id: "isBlobUri", group: "request", cesium: "isBlobUri" },
  { id: "isDataUri", group: "request", cesium: "isDataUri" },
  { id: "isCrossOriginUrl", group: "request", cesium: "isCrossOriginUrl" },
  { id: "objectToQuery", group: "request", cesium: "objectToQuery" },
  { id: "queryToObject", group: "request", cesium: "queryToObject" },
  { id: "parseResponseHeaders", group: "request", cesium: "parseResponseHeaders" },
  { id: "Proxy", group: "request", cesium: "Proxy" },
  { id: "DefaultProxy", group: "request", cesium: "DefaultProxy" },
  {
    id: "TrustedServers",
    group: "request",
    cesium: "TrustedServers",
    notes: "去掉 urijs，改 URL API",
  },
  { id: "RequestType", group: "request", cesium: "RequestType" },
  { id: "RequestState", group: "request", cesium: "RequestState" },
  { id: "RequestErrorEvent", group: "request", cesium: "RequestErrorEvent" },
  { id: "Request", group: "request", cesium: "Request" },
  { id: "RequestScheduler", group: "request", cesium: "RequestScheduler" },
  { id: "buildModuleUrl", group: "request", cesium: "buildModuleUrl" },
  {
    id: "Resource",
    group: "request",
    cesium: "Resource",
    notes: "fetch 注入；fetchImage 返回 ImageBitmap；不用 XHR / urijs / JSONP",
  },
  {
    id: "loadAndExecuteScript",
    group: "request",
    cesium: "loadAndExecuteScript",
    skip: "JSONP，清单后置",
  },

  // 1.12 Worker
  {
    id: "TaskProcessor",
    group: "worker",
    cesium: "TaskProcessor",
    notes: "改写为 new Worker(new URL()) + 可注入 Worker 工厂",
  },
  {
    id: "createTaskProcessorWorker",
    group: "worker",
    cesium: "../Workers/createTaskProcessorWorker",
    dest: "createTaskProcessorWorker",
  },

  // 1.13 数据结构
  { id: "binarySearch", group: "struct", cesium: "binarySearch" },
  { id: "mergeSort", group: "struct", cesium: "mergeSort" },
  { id: "arrayRemoveDuplicates", group: "struct", cesium: "arrayRemoveDuplicates" },
  { id: "subdivideArray", group: "struct", cesium: "subdivideArray" },
  { id: "addAllToArray", group: "struct", cesium: "addAllToArray" },
  { id: "Heap", group: "struct", cesium: "Heap" },
  { id: "Queue", group: "struct", cesium: "Queue" },
  { id: "DoublyLinkedList", group: "struct", cesium: "DoublyLinkedList" },
  { id: "DoubleEndedPriorityQueue", group: "struct", cesium: "DoubleEndedPriorityQueue" },
  { id: "AssociativeArray", group: "struct", cesium: "AssociativeArray" },
  { id: "ManagedArray", group: "struct", cesium: "ManagedArray" },

  // 多项式（inventory M1）
  { id: "QuadraticRealPolynomial", group: "struct", cesium: "QuadraticRealPolynomial" },
  { id: "CubicRealPolynomial", group: "struct", cesium: "CubicRealPolynomial" },
  { id: "QuarticRealPolynomial", group: "struct", cesium: "QuarticRealPolynomial" },
  { id: "TridiagonalSystemSolver", group: "struct", cesium: "TridiagonalSystemSolver" },

  // 1.14 编码与类型
  { id: "Color", group: "encode", cesium: "Color" },
  { id: "srgbToLinear", group: "encode", cesium: "srgbToLinear" },
  { id: "NearFarScalar", group: "encode", cesium: "NearFarScalar" },
  {
    id: "ComponentDatatype",
    group: "encode",
    cesium: "ComponentDatatype",
    notes: "映射到 GPUVertexFormat 字符串",
  },
  { id: "IndexDatatype", group: "encode", cesium: "IndexDatatype" },
  { id: "PrimitiveType", group: "encode", cesium: "PrimitiveType" },
  { id: "VertexFormat", group: "encode", cesium: "VertexFormat" },
  { id: "AttributeCompression", group: "encode", cesium: "AttributeCompression" },

  // 1.15 输入（checklist M1*；inventory 写 M2）
  { id: "KeyboardEventModifier", group: "input", cesium: "KeyboardEventModifier" },
  { id: "ScreenSpaceEventType", group: "input", cesium: "ScreenSpaceEventType" },
  {
    id: "ScreenSpaceEventHandler",
    group: "input",
    cesium: "ScreenSpaceEventHandler",
    notes: "注入 EventTarget；core 不引入 DOM lib",
  },
]

export function destName(mod) {
  return `${mod.dest ?? mod.cesium.split("/").pop()}.ts`
}
