/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

/** 键盘修饰键。对标 Cesium `Core/KeyboardEventModifier.js`。 */
export const KeyboardEventModifier = Object.freeze({
  SHIFT: 0,
  CTRL: 1,
  ALT: 2,
})

export type KeyboardEventModifierValue =
  (typeof KeyboardEventModifier)[keyof typeof KeyboardEventModifier]
