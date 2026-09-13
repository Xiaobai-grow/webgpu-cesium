/**
 * 延迟光照 / 天空 / 色调映射全屏 pipeline。
 */
import { composeShader, SHADER_MODULES } from "@webgpu-cesium/shaders"
import { makeLabel, type GpuDevice } from "@webgpu-cesium/rhi"
import type { FrameUniformsBuffer } from "../FrameUniforms"
import { GBUFFER_FORMATS } from "./GBuffer"

const PACKAGE_LABEL = "renderer"

export interface FullscreenPipelines {
  lighting: GPURenderPipelineDescriptor
  lightingKey: string
  lightingLayout: GPUBindGroupLayout
  sky: GPURenderPipelineDescriptor
  skyKey: string
  skyLayout: GPUBindGroupLayout
  tonemap: GPURenderPipelineDescriptor
  tonemapKey: string
  tonemapLayout: GPUBindGroupLayout
}

/**
 * 创建三个全屏 pass 的 pipeline 描述。
 *
 * @param device 设备
 * @param frameUniforms group 0
 * @param canvasFormat 最终输出
 */
export function createFullscreenPipelines(
  device: GpuDevice,
  frameUniforms: FrameUniformsBuffer,
  canvasFormat: GPUTextureFormat,
): FullscreenPipelines {
  const lightingModule = composeAndModule(device, "lighting/deferred.wgsl")
  const skyModule = composeAndModule(device, "atmosphere/sky.wgsl")
  const toneModule = composeAndModule(device, "post/tonemap.wgsl")

  const lightingLayout = device.bindGroupLayouts.get({
    label: makeLabel("BindGroupLayout", "lighting-g1", PACKAGE_LABEL),
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "depth" } },
      { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      {
        binding: 6,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: "float", viewDimension: "3d" },
      },
      {
        binding: 7,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d-array" },
      },
      { binding: 8, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
    ],
  })
  const skyLayout = device.bindGroupLayouts.get({
    label: makeLabel("BindGroupLayout", "sky-g1", PACKAGE_LABEL),
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "depth" } },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  })
  const tonemapLayout = device.bindGroupLayouts.get({
    label: makeLabel("BindGroupLayout", "tonemap-g1", PACKAGE_LABEL),
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
    ],
  })

  const lightingPipelineLayout = device.bindGroupLayouts.getPipelineLayout(
    [frameUniforms.bindGroupLayout, lightingLayout],
    makeLabel("PipelineLayout", "lighting", PACKAGE_LABEL),
  )
  const skyPipelineLayout = device.bindGroupLayouts.getPipelineLayout(
    [frameUniforms.bindGroupLayout, skyLayout],
    makeLabel("PipelineLayout", "sky", PACKAGE_LABEL),
  )
  const tonePipelineLayout = device.bindGroupLayouts.getPipelineLayout(
    [frameUniforms.bindGroupLayout, tonemapLayout],
    makeLabel("PipelineLayout", "tonemap", PACKAGE_LABEL),
  )

  const lighting: GPURenderPipelineDescriptor = {
    layout: lightingPipelineLayout,
    vertex: { module: lightingModule, entryPoint: "vsLighting" },
    fragment: {
      module: lightingModule,
      entryPoint: "fsLighting",
      targets: [{ format: GBUFFER_FORMATS.hdr }],
    },
    primitive: { topology: "triangle-list" },
  }
  const sky: GPURenderPipelineDescriptor = {
    layout: skyPipelineLayout,
    vertex: { module: skyModule, entryPoint: "vsSky" },
    fragment: {
      module: skyModule,
      entryPoint: "fsSky",
      targets: [{ format: GBUFFER_FORMATS.hdr, blend: { color: addBlend(), alpha: addBlend() } }],
    },
    primitive: { topology: "triangle-list" },
  }
  const tonemap: GPURenderPipelineDescriptor = {
    layout: tonePipelineLayout,
    vertex: { module: toneModule, entryPoint: "vsTonemap" },
    fragment: {
      module: toneModule,
      entryPoint: "fsTonemap",
      targets: [{ format: canvasFormat }],
    },
    primitive: { topology: "triangle-list" },
  }
  return {
    lighting,
    lightingKey: device.pipelines.keyOf(lighting),
    lightingLayout,
    sky,
    skyKey: device.pipelines.keyOf(sky),
    skyLayout,
    tonemap,
    tonemapKey: device.pipelines.keyOf(tonemap),
    tonemapLayout,
  }
}

function composeAndModule(device: GpuDevice, entry: string): GPUShaderModule {
  const composed = composeShader({ entry, modules: SHADER_MODULES })
  return device.shaderModules.get(
    composed.code,
    composed.hash,
    makeLabel("ShaderModule", entry, PACKAGE_LABEL),
  )
}

function addBlend(): GPUBlendComponent {
  return { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
}

/**
 * 全屏三角形 RenderItem。
 *
 * @param pass pass 名
 * @param pipeline 描述
 * @param pipelineKey 键
 * @param bindGroups 绑定
 */
export function fullscreenItem(
  pass: string,
  pipeline: GPURenderPipelineDescriptor,
  pipelineKey: string,
  bindGroups: readonly (GPUBindGroup | undefined)[],
) {
  return {
    pass,
    sortKey: 0,
    pipelineKey,
    pipeline,
    bindGroups,
    draw: { vertexCount: 3 },
    label: pass,
  }
}
