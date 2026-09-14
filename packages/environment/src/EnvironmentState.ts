/**
 * 每帧环境状态：日月方向、相位、曝光。写入 FrameUniforms。
 */
import {
  Cartesian3,
  Cartographic,
  type Ellipsoid,
  type JulianDate,
  Matrix3,
  Simon1994PlanetaryPositions,
  Transforms,
} from "@webgpu-cesium/core"
import { SunLight, type DirectionalLight } from "@webgpu-cesium/renderer"

const sunInertial = new Cartesian3()
const moonInertial = new Cartesian3()
const teme = new Matrix3()
const sunEcef = new Cartesian3()
const moonEcef = new Cartesian3()
const cameraCart = new Cartographic()
const upScratch = new Cartesian3()
const viewDir = new Cartesian3()

export interface EnvironmentStateSnapshot {
  sunDirectionECEF: Cartesian3
  sunDirectionView: Cartesian3
  sunIrradiance: Cartesian3
  moonDirectionECEF: Cartesian3
  moonPhase: number
  moonIntensity: number
  cameraHeight: number
  planetRadius: number
  atmosphereRadius: number
  exposure: number
}

/**
 * 时间驱动的环境。
 */
export class EnvironmentState {
  readonly sunDirectionECEF = new Cartesian3(0, 0, 1)
  readonly sunDirectionView = new Cartesian3(0, 0, 1)
  readonly sunIrradiance = new Cartesian3(1, 1, 1)
  readonly moonDirectionECEF = new Cartesian3(0, 0, 1)
  moonPhase = 0.5
  moonIntensity = 0
  cameraHeight = 0
  planetRadius = 6378137
  atmosphereRadius = 6478137
  exposure = 1
  private smoothedExposure = 1

  /**
   * 根据历表与相机更新。
   *
   * @param time 儒略日
   * @param cameraPosition ECEF
   * @param viewMatrix 列主序，用于视空间太阳方向
   * @param ellipsoid 椭球
   * @param light SunLight 或 DirectionalLight
   * @param delta 秒
   */
  update(
    time: JulianDate,
    cameraPosition: Cartesian3,
    viewMatrix: ArrayLike<number>,
    ellipsoid: Ellipsoid,
    light: SunLight | DirectionalLight,
    delta: number,
  ): void {
    this.planetRadius = ellipsoid.maximumRadius
    this.atmosphereRadius = this.planetRadius + 100_000
    ellipsoid.cartesianToCartographic(cameraPosition, cameraCart)
    this.cameraHeight = cameraCart.height

    if (light instanceof SunLight) {
      Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(time, sunInertial)
      Simon1994PlanetaryPositions.computeMoonPositionInEarthInertialFrame(time, moonInertial)
      Transforms.computeIcrfToCentralBodyFixedMatrix(time, teme)
      Matrix3.multiplyByVector(teme, sunInertial, sunEcef)
      Matrix3.multiplyByVector(teme, moonInertial, moonEcef)
      Cartesian3.normalize(sunEcef, this.sunDirectionECEF)
      Cartesian3.normalize(moonEcef, this.moonDirectionECEF)
      const moonToSun = Cartesian3.normalize(sunEcef, viewDir)
      this.moonPhase = 0.5 * (1 + Cartesian3.dot(this.moonDirectionECEF, moonToSun))
    } else {
      Cartesian3.normalize(light.direction, this.sunDirectionECEF)
      this.moonDirectionECEF.x = -this.sunDirectionECEF.x
      this.moonDirectionECEF.y = -this.sunDirectionECEF.y
      this.moonDirectionECEF.z = -this.sunDirectionECEF.z
      this.moonPhase = 0.5
    }

    const up =
      ellipsoid.geodeticSurfaceNormal(cameraPosition, upScratch) ??
      Cartesian3.normalize(cameraPosition, upScratch)
    const sunAlt = Cartesian3.dot(this.sunDirectionECEF, up)
    const day = smoothstep(-0.12, 0.18, sunAlt)
    const targetExposure = 0.45 + (0.85 - 0.45) * day
    const tau = 1 - Math.exp(-Math.max(delta, 1 / 60) / 0.6)
    this.smoothedExposure += (targetExposure - this.smoothedExposure) * tau
    this.exposure = this.smoothedExposure

    const sunColor = 0.55 + 0.45 * day
    const intensity = light.intensity
    const r = (1.05 + 0.2 * day) * light.color.red
    const g = (0.9 + 0.15 * day) * light.color.green
    const b = (0.7 + 0.35 * day) * light.color.blue
    this.sunIrradiance.x = r * sunColor * intensity
    this.sunIrradiance.y = g * sunColor * intensity
    this.sunIrradiance.z = b * sunColor * intensity
    this.moonIntensity = (0.04 + 0.22 * this.moonPhase) * (1 - day) * light.intensity

    const view = viewMatrix
    this.sunDirectionView.x =
      view[0]! * this.sunDirectionECEF.x +
      view[4]! * this.sunDirectionECEF.y +
      view[8]! * this.sunDirectionECEF.z
    this.sunDirectionView.y =
      view[1]! * this.sunDirectionECEF.x +
      view[5]! * this.sunDirectionECEF.y +
      view[9]! * this.sunDirectionECEF.z
    this.sunDirectionView.z =
      view[2]! * this.sunDirectionECEF.x +
      view[6]! * this.sunDirectionECEF.y +
      view[10]! * this.sunDirectionECEF.z
    Cartesian3.normalize(this.sunDirectionView, this.sunDirectionView)
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
