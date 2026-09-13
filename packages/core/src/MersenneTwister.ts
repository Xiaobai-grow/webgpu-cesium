/**
 * @license
 * Mersenne Twister implementation used by CesiumMath.nextRandomNumber.
 * Algorithm follows the `mersenne-twister` npm package (MIT),
 * which CesiumJS 1.144 depends on.
 *
 * Original mt19937ar.c:
 * Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura
 */

const N = 624
const M = 397
const MATRIX_A = 0x9908b0df
const UPPER_MASK = 0x80000000
const LOWER_MASK = 0x7fffffff

/**
 * MT19937，提供与 `mersenne-twister` 包相同的 `random()`（[0, 1)）。
 */
export class MersenneTwister {
  private readonly mt: number[] = Array.from({ length: N }, () => 0)
  private mti = N + 1

  /**
   * @param seed 整数种子；省略则用当前时间
   */
  constructor(seed?: number) {
    this.initSeed(seed ?? Date.now())
  }

  /**
   * 用 32-bit 种子初始化。
   *
   * @param seed 种子
   */
  initSeed(seed: number): void {
    const first = this.mt[0]
    if (first === undefined) {
      return
    }
    this.mt[0] = seed >>> 0
    for (this.mti = 1; this.mti < N; this.mti++) {
      const prev = this.mt[this.mti - 1]
      if (prev === undefined) {
        break
      }
      const s = prev ^ (prev >>> 30)
      this.mt[this.mti] =
        (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) +
          (s & 0x0000ffff) * 1812433253 +
          this.mti) >>>
        0
    }
  }

  /**
   * 生成 [0, 0xffffffff] 的 32-bit 整数。
   */
  genrandInt32(): number {
    const mag01 = [0x0, MATRIX_A]
    if (this.mti >= N) {
      let kk: number
      if (this.mti === N + 1) {
        this.initSeed(5489)
      }
      for (kk = 0; kk < N - M; kk++) {
        const a = this.mt[kk]
        const b = this.mt[kk + 1]
        if (a === undefined || b === undefined) {
          continue
        }
        const y = (a & UPPER_MASK) | (b & LOWER_MASK)
        const mag = mag01[y & 0x1]
        const far = this.mt[kk + M]
        if (mag === undefined || far === undefined) {
          continue
        }
        this.mt[kk] = far ^ (y >>> 1) ^ mag
      }
      for (; kk < N - 1; kk++) {
        const a = this.mt[kk]
        const b = this.mt[kk + 1]
        if (a === undefined || b === undefined) {
          continue
        }
        const y = (a & UPPER_MASK) | (b & LOWER_MASK)
        const mag = mag01[y & 0x1]
        const far = this.mt[kk + (M - N)]
        if (mag === undefined || far === undefined) {
          continue
        }
        this.mt[kk] = far ^ (y >>> 1) ^ mag
      }
      const last = this.mt[N - 1]
      const first = this.mt[0]
      const mid = this.mt[M - 1]
      if (last !== undefined && first !== undefined && mid !== undefined) {
        const y = (last & UPPER_MASK) | (first & LOWER_MASK)
        const mag = mag01[y & 0x1] ?? 0
        this.mt[N - 1] = mid ^ (y >>> 1) ^ mag
      }
      this.mti = 0
    }

    let y = this.mt[this.mti++]
    if (y === undefined) {
      return 0
    }
    y ^= y >>> 11
    y ^= (y << 7) & 0x9d2c5680
    y ^= (y << 15) & 0xefc60000
    y ^= y >>> 18
    return y >>> 0
  }

  /**
   * [0, 1) 的 53-bit 浮点随机数（`mersenne-twister`.random / genrand_res53）。
   */
  random(): number {
    const a = this.genrandInt32() >>> 5
    const b = this.genrandInt32() >>> 6
    return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0)
  }
}
