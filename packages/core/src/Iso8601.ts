/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { JulianDate } from "./JulianDate"
import { TimeInterval } from "./TimeInterval"

const MINIMUM_VALUE = Object.freeze(JulianDate.fromIso8601("0000-01-01T00:00:00Z"))
const MAXIMUM_VALUE = Object.freeze(JulianDate.fromIso8601("9999-12-31T24:00:00Z"))
const MAXIMUM_INTERVAL = Object.freeze(
  new TimeInterval({
    start: MINIMUM_VALUE,
    stop: MAXIMUM_VALUE,
  }),
)

/**
 * ISO8601 可表示的时间上下界。对标 Cesium `Core/Iso8601.js`。
 */
export const Iso8601 = {
  MINIMUM_VALUE,
  MAXIMUM_VALUE,
  MAXIMUM_INTERVAL,
}
