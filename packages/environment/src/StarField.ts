/**
 * 简化星表：亮星（J2000 赤经赤纬）+ 程序星场（着色器）。
 * 目标压缩后远小于 200 KB。
 */
import { Cartesian3, CesiumMath, Matrix3, type JulianDate, Transforms } from "@webgpu-cesium/core"

/** 赤经小时、赤纬度、视星等 */
const BRIGHT_STARS: readonly [number, number, number][] = [
  [6.7525, -16.7161, -1.46],
  [6.3992, -52.6956, -0.74],
  [14.6608, -60.8339, -0.72],
  [14.261, 19.1824, -0.05],
  [18.6156, 38.7836, 0.03],
  [5.2782, 45.998, 0.08],
  [5.2423, -8.2016, 0.13],
  [7.655, 5.225, 0.34],
  [5.4188, 6.3497, 0.45],
  [13.4199, -11.1613, 0.98],
  [19.8464, 8.8683, 0.77],
  [12.9004, -59.6888, 1.25],
  [16.4901, -26.4319, 0.91],
  [7.7553, 28.0262, 1.14],
  [20.6905, 45.2803, 1.25],
  [4.5987, 16.5093, 0.85],
  [13.7923, 49.3133, 1.77],
  [2.5298, 89.2641, 1.97],
  [22.9608, -29.6222, 1.16],
  [11.0621, 61.751, 1.81],
  [17.5822, -37.1038, 1.62],
  [10.1395, 11.9672, 1.35],
  [5.9195, 7.407, 1.64],
  [0.7265, -17.9867, 2.04],
  [9.132, -43.4326, 1.86],
  [1.6285, 89.0155, 2.07],
  [23.6558, 77.6323, 2.07],
  [12.4433, -63.0991, 1.67],
  [6.3783, -17.9559, 1.98],
  [14.0724, -60.373, 1.86],
]

const teme = new Matrix3()
const inertial = new Cartesian3()

/**
 * 生成 storage buffer 用的 vec4（ECEF 方向 + 星等）。
 *
 * @param time 儒略日
 */
export function buildStarCatalog(time: JulianDate): Float32Array {
  Transforms.computeIcrfToCentralBodyFixedMatrix(time, teme)
  const out = new Float32Array(BRIGHT_STARS.length * 4)
  for (let i = 0; i < BRIGHT_STARS.length; i++) {
    const star = BRIGHT_STARS[i]!
    const ra = (star[0] / 24) * CesiumMath.TWO_PI
    const dec = star[1] * CesiumMath.RADIANS_PER_DEGREE
    inertial.x = Math.cos(dec) * Math.cos(ra)
    inertial.y = Math.cos(dec) * Math.sin(ra)
    inertial.z = Math.sin(dec)
    Matrix3.multiplyByVector(teme, inertial, inertial)
    Cartesian3.normalize(inertial, inertial)
    out[i * 4] = inertial.x
    out[i * 4 + 1] = inertial.y
    out[i * 4 + 2] = inertial.z
    out[i * 4 + 3] = star[2]
  }
  return out
}

export const STAR_CATALOG_COUNT = BRIGHT_STARS.length
