/**
 * 窗口 ↔ 射线（Reverse-Z 下仍用透视拾取射线，不反投影深度）。
 */
import { type Cartesian2, type Ray } from "@webgpu-cesium/core"
import type { Camera } from "./Camera"

/**
 * 窗口坐标 → 世界射线。
 *
 * @param camera 相机
 * @param windowPosition 像素
 * @param result 射线
 */
export function worldToDrawingBufferCoordinates(): never {
  throw new Error("SceneTransforms.worldToDrawingBufferCoordinates 未在 M2 实现")
}

/**
 * 拾取射线。
 *
 * @param camera 相机
 * @param windowPosition 像素
 * @param result 射线
 */
export function getPickRay(camera: Camera, windowPosition: Cartesian2, result?: Ray): Ray {
  return camera.getPickRay(windowPosition, result)
}

export const SceneTransforms = {
  getPickRay,
}
