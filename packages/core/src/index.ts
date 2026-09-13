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
