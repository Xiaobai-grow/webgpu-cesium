/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { defined } from "./defined"
import { DeveloperError } from "./DeveloperError"

const warnings: Record<string, boolean> = {}

/**
 * 按 identifier 只向 console.warn 一次。
 * 对标 Cesium `Core/oneTimeWarning.js`。
 *
 * @param identifier 去重键
 * @param message 文案，默认等于 identifier
 */
export function oneTimeWarning(identifier: string, message?: string): void {
  if (!defined(identifier)) {
    throw new DeveloperError("identifier is required.")
  }
  if (!defined(warnings[identifier])) {
    warnings[identifier] = true
    const host = globalThis as { console?: { warn: (msg: string) => void } }
    host.console?.warn(message ?? identifier)
  }
}

oneTimeWarning.geometryOutlines =
  "Entity geometry outlines are unsupported on terrain. Outlines will be disabled. To enable outlines, disable geometry terrain clamping by explicitly setting height to 0."
oneTimeWarning.geometryZIndex =
  "Entity geometry with zIndex are unsupported when height or extrudedHeight are defined.  zIndex will be ignored"
oneTimeWarning.geometryHeightReference =
  "Entity corridor, ellipse, polygon or rectangle with heightReference must also have a defined height.  heightReference will be ignored"
oneTimeWarning.geometryExtrudedHeightReference =
  "Entity corridor, ellipse, polygon or rectangle with extrudedHeightReference must also have a defined extrudedHeight.  extrudedHeightReference will be ignored"
