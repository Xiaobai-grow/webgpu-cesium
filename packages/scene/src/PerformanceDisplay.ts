/**
 * CPU 帧时间与瓦片计数（widgets / 示例站展示）。
 */
export interface PerformanceSnapshot {
  cpuFrameTimeMs: number
  tilesSelected: number
  tilesRendered: number
  tilesLoaded: number
  tilesRequested: number
  renderItemCount: number
  pipelineCount: number
}

/**
 * 把统计写到 DOM。
 */
export class PerformanceDisplay {
  /**
   * @param container 目标
   */
  constructor(private readonly container: HTMLElement) {
    container.classList.add("webgpu-cesium-perf")
  }

  /**
   * 刷新文本。
   *
   * @param snapshot 统计
   */
  update(snapshot: PerformanceSnapshot): void {
    this.container.textContent = [
      `CPU ${snapshot.cpuFrameTimeMs.toFixed(2)} ms`,
      `tiles ${snapshot.tilesRendered}/${snapshot.tilesSelected}`,
      `load ${snapshot.tilesLoaded} req ${snapshot.tilesRequested}`,
      `items ${snapshot.renderItemCount}`,
      `pipelines ${snapshot.pipelineCount}`,
    ].join(" · ")
  }
}
