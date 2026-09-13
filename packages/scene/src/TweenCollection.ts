/**
 * 最小 Tween 集合，供 Camera.flyTo 使用（不移植完整 Cesium TweenCollection）。
 */
import { EasingFunction, type EasingFunctionCallback } from "@webgpu-cesium/core"

export interface TweenOptions {
  duration: number
  easingFunction?: EasingFunctionCallback
  update: (time: number) => void
  complete?: () => void
  cancel?: () => void
}

interface ActiveTween {
  duration: number
  elapsed: number
  easing: EasingFunctionCallback
  update: (time: number) => void
  complete?: () => void
  cancel?: () => void
}

/**
 * 每帧推进的缓动队列。
 */
export class TweenCollection {
  private readonly _tweens: ActiveTween[] = []

  get length(): number {
    return this._tweens.length
  }

  /**
   * 添加一条缓动。
   *
   * @param options 时长与回调
   */
  add(options: TweenOptions): ActiveTween {
    const tween: ActiveTween = {
      duration: Math.max(options.duration, 0),
      elapsed: 0,
      easing: options.easingFunction ?? EasingFunction.CUBIC_IN_OUT,
      update: options.update,
    }
    if (options.complete !== undefined) {
      tween.complete = options.complete
    }
    if (options.cancel !== undefined) {
      tween.cancel = options.cancel
    }
    this._tweens.push(tween)
    if (tween.duration <= 0) {
      tween.update(1)
      tween.complete?.()
      this._tweens.pop()
    }
    return tween
  }

  /**
   * 推进所有缓动。
   *
   * @param deltaSeconds 帧间隔
   */
  update(deltaSeconds: number): void {
    for (let i = this._tweens.length - 1; i >= 0; i--) {
      const tween = this._tweens[i]!
      tween.elapsed += deltaSeconds
      const t = tween.duration <= 0 ? 1 : Math.min(1, tween.elapsed / tween.duration)
      tween.update(tween.easing(t))
      if (t >= 1) {
        tween.complete?.()
        this._tweens.splice(i, 1)
      }
    }
  }

  /**
   * 取消全部（触发 cancel）。
   */
  removeAll(): void {
    const list = this._tweens.splice(0, this._tweens.length)
    for (const tween of list) {
      tween.cancel?.()
    }
  }
}
