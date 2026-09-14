/** 样式颜色混合。对标 Cesium `Cesium3DTileColorBlendMode`. */
export const Cesium3DTileColorBlendMode = {
  HIGHLIGHT: 0,
  REPLACE: 1,
  MIX: 2,
} as const

export type Cesium3DTileColorBlendModeValue =
  (typeof Cesium3DTileColorBlendMode)[keyof typeof Cesium3DTileColorBlendMode]
