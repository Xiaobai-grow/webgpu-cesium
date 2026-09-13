/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { Cartesian3 } from "./Cartesian3"
import { defined } from "./defined"
import { Quaternion } from "./Quaternion"

const defaultScale = new Cartesian3(1.0, 1.0, 1.0)
const defaultTranslation = Cartesian3.ZERO
const defaultRotation = Quaternion.IDENTITY

/**
 * 平移 / 旋转 / 缩放。对标 Cesium `Core/TranslationRotationScale.js`。
 */
export class TranslationRotationScale {
  translation: Cartesian3
  rotation: Quaternion
  scale: Cartesian3

  /**
   * @param translation 平移
   * @param rotation 旋转
   * @param scale 缩放
   */
  constructor(translation?: Cartesian3, rotation?: Quaternion, scale?: Cartesian3) {
    this.translation = Cartesian3.clone(translation ?? defaultTranslation)
    this.rotation = Quaternion.clone(rotation ?? defaultRotation)
    this.scale = Cartesian3.clone(scale ?? defaultScale)
  }

  equals(right?: TranslationRotationScale): boolean {
    return (
      this === right ||
      (defined(right) &&
        Cartesian3.equals(this.translation, right.translation) &&
        Quaternion.equals(this.rotation, right.rotation) &&
        Cartesian3.equals(this.scale, right.scale))
    )
  }
}
