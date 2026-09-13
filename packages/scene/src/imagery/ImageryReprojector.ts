/**
 * Geographic ↔ Mercator 影像重投影。优先 `reproject.wgsl` compute，失败回退 CPU。
 */
import type { Rectangle } from "@webgpu-cesium/core"
import { composeShader, SHADER_MODULES } from "@webgpu-cesium/shaders"
import { makeLabel, type GpuDevice } from "@webgpu-cesium/rhi"

const PACKAGE_LABEL = "scene"
const MAX_MERCATOR_LAT = 1.4844222297453324

/**
 * 与 `reproject.wgsl` 一致的 Mercator V。
 *
 * @param latitude 纬度（弧度）
 */
export function geographicToMercatorV(latitude: number): number {
  const s = Math.min(Math.max(latitude, -MAX_MERCATOR_LAT), MAX_MERCATOR_LAT)
  return 0.5 - Math.log(Math.tan(0.7853981633974483 + s * 0.5)) / 6.283185307179586
}

/**
 * 目标地理像素对应的源 UV（Mercator 瓦片）。
 *
 * @param destU 目标 u
 * @param destV 目标 v（0 北）
 * @param dest 目标矩形
 * @param src 源矩形
 */
export function reprojectSourceUv(
  destU: number,
  destV: number,
  dest: Rectangle,
  src: Rectangle,
): { u: number; v: number } {
  const lon = dest.west + dest.width * destU
  const lat = dest.north - dest.height * destV
  const mercU = (lon - src.west) / Math.max(src.east - src.west, 1e-12)
  const mercV =
    (geographicToMercatorV(lat) - geographicToMercatorV(src.north)) /
    Math.max(geographicToMercatorV(src.south) - geographicToMercatorV(src.north), 1e-12)
  return { u: mercU, v: mercV }
}

function sampleRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): [number, number, number, number] {
  if (u < 0 || u > 1 || v < 0 || v > 1) {
    return [0, 0, 0, 0]
  }
  const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)))
  const y = Math.min(height - 1, Math.max(0, Math.floor(v * height)))
  const i = (y * width + x) * 4
  return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0, data[i + 3] ?? 255]
}

/**
 * CPU 把一张源图重投影到目标地理矩形。
 *
 * @param source 源 ImageBitmap
 * @param dest 目标地理矩形
 * @param src 源瓦片矩形
 * @param destSize 输出边长
 */
export function reprojectImageCpu(
  source: ImageBitmap,
  dest: Rectangle,
  src: Rectangle,
  destSize: number,
): ImageData {
  const canvas = new OffscreenCanvas(source.width, source.height)
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("OffscreenCanvas 2d unavailable")
  }
  ctx.drawImage(source, 0, 0)
  const srcData = ctx.getImageData(0, 0, source.width, source.height)
  const destData = new ImageData(destSize, destSize)
  for (let y = 0; y < destSize; y++) {
    for (let x = 0; x < destSize; x++) {
      const uv = reprojectSourceUv((x + 0.5) / destSize, (y + 0.5) / destSize, dest, src)
      const rgba = sampleRgba(srcData.data, source.width, source.height, uv.u, uv.v)
      const o = (y * destSize + x) * 4
      destData.data[o] = rgba[0]
      destData.data[o + 1] = rgba[1]
      destData.data[o + 2] = rgba[2]
      destData.data[o + 3] = rgba[3]
    }
  }
  return destData
}

/**
 * GPU compute 重投影并拷进图集一层。
 *
 * @param device GpuDevice
 * @param source 源图
 * @param destTexture 图集
 * @param destLayer 层
 * @param dest 目标矩形
 * @param src 源矩形
 */
export function reprojectImageGpu(
  device: GpuDevice,
  source: ImageBitmap,
  destTexture: GPUTexture,
  destLayer: number,
  dest: Rectangle,
  src: Rectangle,
): void {
  const gpu = device.device
  const composed = composeShader({
    entry: "globe/reproject.wgsl",
    modules: SHADER_MODULES,
    defines: { REPROJECT_MERCATOR: 1 },
  })
  const module = device.shaderModules.get(
    composed.code,
    composed.hash,
    makeLabel("ShaderModule", "globe/reproject", PACKAGE_LABEL),
  )
  const sourceTexture = gpu.createTexture({
    label: makeLabel("Texture", "reproject-src", PACKAGE_LABEL),
    size: { width: source.width, height: source.height },
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  })
  gpu.queue.copyExternalImageToTexture(
    { source, flipY: false },
    { texture: sourceTexture },
    {
      width: source.width,
      height: source.height,
    },
  )
  const destStorage = gpu.createTexture({
    label: makeLabel("Texture", "reproject-dest", PACKAGE_LABEL),
    size: { width: destTexture.width, height: destTexture.height, depthOrArrayLayers: 1 },
    format: "rgba8unorm",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
  })
  const uniformBuffer = gpu.createBuffer({
    label: makeLabel("Buffer", "reproject-uniforms", PACKAGE_LABEL),
    size: 48,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  const values = new ArrayBuffer(48)
  const f32 = new Float32Array(values)
  const u32 = new Uint32Array(values)
  f32[0] = dest.west
  f32[1] = dest.south
  f32[2] = dest.east
  f32[3] = dest.north
  f32[4] = src.west
  f32[5] = src.south
  f32[6] = src.east
  f32[7] = src.north
  u32[8] = 0
  gpu.queue.writeBuffer(uniformBuffer, 0, values)
  const sampler = device.samplers.get({
    label: makeLabel("Sampler", "reproject", PACKAGE_LABEL),
    magFilter: "linear",
    minFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  })
  const bindGroupLayout = device.bindGroupLayouts.get({
    label: makeLabel("BindGroupLayout", "reproject", PACKAGE_LABEL),
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "float" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, sampler: { type: "filtering" } },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: "write-only",
          format: "rgba8unorm",
          viewDimension: "2d-array",
        },
      },
    ],
  })
  const pipelineLayout = device.bindGroupLayouts.getPipelineLayout(
    [bindGroupLayout],
    makeLabel("PipelineLayout", "reproject", PACKAGE_LABEL),
  )
  const pipeline = device.pipelines.getComputePipeline({
    label: makeLabel("ComputePipeline", "reproject", PACKAGE_LABEL),
    layout: pipelineLayout,
    compute: { module, entryPoint: "csReproject" },
  })
  const bindGroup = gpu.createBindGroup({
    label: makeLabel("BindGroup", "reproject", PACKAGE_LABEL),
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: sourceTexture.createView() },
      { binding: 2, resource: sampler },
      { binding: 3, resource: destStorage.createView({ dimension: "2d-array" }) },
    ],
  })
  const encoder = gpu.createCommandEncoder({
    label: makeLabel("CommandEncoder", "reproject", PACKAGE_LABEL),
  })
  const pass = encoder.beginComputePass({
    label: makeLabel("ComputePass", "reproject", PACKAGE_LABEL),
  })
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, bindGroup)
  pass.dispatchWorkgroups(Math.ceil(destTexture.width / 8), Math.ceil(destTexture.height / 8))
  pass.end()
  encoder.copyTextureToTexture(
    { texture: destStorage, origin: { x: 0, y: 0, z: 0 } },
    { texture: destTexture, origin: { x: 0, y: 0, z: destLayer } },
    { width: destTexture.width, height: destTexture.height },
  )
  gpu.queue.submit([encoder.finish()])
  sourceTexture.destroy()
  destStorage.destroy()
  uniformBuffer.destroy()
}

/**
 * 多张源图 CPU 合成到目标地理矩形。
 *
 * @param sources 源图与矩形
 * @param dest 目标矩形
 * @param destSize 输出边长
 */
export function reprojectImagesCpu(
  sources: readonly { image: ImageBitmap; rectangle: Rectangle }[],
  dest: Rectangle,
  destSize: number,
): ImageData {
  if (sources.length === 1 && sources[0]) {
    return reprojectImageCpu(sources[0].image, dest, sources[0].rectangle, destSize)
  }
  const destData = new ImageData(destSize, destSize)
  const decoded = sources.map((source) => {
    const canvas = new OffscreenCanvas(source.image.width, source.image.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("OffscreenCanvas 2d unavailable")
    }
    ctx.drawImage(source.image, 0, 0)
    return {
      rectangle: source.rectangle,
      width: source.image.width,
      height: source.image.height,
      data: ctx.getImageData(0, 0, source.image.width, source.image.height).data,
    }
  })
  for (let y = 0; y < destSize; y++) {
    for (let x = 0; x < destSize; x++) {
      const destU = (x + 0.5) / destSize
      const destV = (y + 0.5) / destSize
      let rgba: [number, number, number, number] = [0, 0, 0, 0]
      for (const source of decoded) {
        const uv = reprojectSourceUv(destU, destV, dest, source.rectangle)
        if (uv.u < 0 || uv.u > 1 || uv.v < 0 || uv.v > 1) {
          continue
        }
        rgba = sampleRgba(source.data, source.width, source.height, uv.u, uv.v)
        break
      }
      const o = (y * destSize + x) * 4
      destData.data[o] = rgba[0]
      destData.data[o + 1] = rgba[1]
      destData.data[o + 2] = rgba[2]
      destData.data[o + 3] = rgba[3]
    }
  }
  return destData
}

/**
 * 尝试 GPU，失败则 CPU 后上传图集。
 *
 * @param device GpuDevice
 * @param source 源图
 * @param destTexture 图集
 * @param destLayer 层
 * @param dest 目标矩形
 * @param src 源矩形
 */
export async function reprojectIntoAtlas(
  device: GpuDevice,
  source: ImageBitmap,
  destTexture: GPUTexture,
  destLayer: number,
  dest: Rectangle,
  src: Rectangle,
): Promise<void> {
  try {
    reprojectImageGpu(device, source, destTexture, destLayer, dest, src)
  } catch {
    const image = reprojectImageCpu(source, dest, src, destTexture.width)
    const bitmap = await createImageBitmap(image)
    device.device.queue.copyExternalImageToTexture(
      { source: bitmap, flipY: false },
      { texture: destTexture, origin: { x: 0, y: 0, z: destLayer } },
      { width: destTexture.width, height: destTexture.height },
    )
  }
}
