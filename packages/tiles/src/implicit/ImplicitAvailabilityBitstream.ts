/**
 * 隐式可用性位流。对标 Cesium `ImplicitAvailabilityBitstream`。
 */

/**
 * 按 Morton 下标查询 bit。
 */
export class ImplicitAvailabilityBitstream {
  readonly length: number
  private readonly _bytes: Uint8Array
  readonly constant: boolean | undefined

  /**
   * @param options bitstream 或常数
   */
  constructor(options: { bitstream?: Uint8Array; length: number; constant?: boolean }) {
    this.length = options.length
    this._bytes = options.bitstream ?? new Uint8Array()
    this.constant = options.constant
  }

  /**
   * 下标是否可用。
   *
   * @param index Morton
   */
  getBit(index: number): boolean {
    if (this.constant !== undefined) {
      return this.constant
    }
    const byte = this._bytes[index >> 3] ?? 0
    return ((byte >> (index & 7)) & 1) === 1
  }
}

/**
 * 解析 subtree JSON + 二进制里的 availability。
 *
 * @param json subtree JSON
 * @param binary 缓冲
 */
export function parseAvailability(
  json: { bitstream?: number; constant?: number; availableCount?: number } | undefined,
  binary: Uint8Array,
  length: number,
): ImplicitAvailabilityBitstream {
  if (!json) {
    return new ImplicitAvailabilityBitstream({ length, constant: true })
  }
  if (json.constant !== undefined) {
    return new ImplicitAvailabilityBitstream({ length, constant: json.constant === 1 })
  }
  if (json.bitstream !== undefined) {
    const view = binary.subarray(json.bitstream)
    return new ImplicitAvailabilityBitstream({ bitstream: view, length })
  }
  return new ImplicitAvailabilityBitstream({ length, constant: false })
}
