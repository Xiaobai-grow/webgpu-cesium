/** 3D Tiles refine。对标 Cesium `Cesium3DTileRefine`. */
export const Cesium3DTileRefine = {
  ADD: 0,
  REPLACE: 1,
} as const

export type Cesium3DTileRefineValue = (typeof Cesium3DTileRefine)[keyof typeof Cesium3DTileRefine]
