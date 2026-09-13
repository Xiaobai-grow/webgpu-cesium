/** 地表瓦片地形状态机。 */
export const TerrainState = Object.freeze({
  UNLOADED: 0,
  RECEIVING: 1,
  RECEIVED: 2,
  TRANSFORMING: 3,
  TRANSFORMED: 4,
  READY: 5,
  FAILED: 6,
})

export type TerrainStateValue = (typeof TerrainState)[keyof typeof TerrainState]
