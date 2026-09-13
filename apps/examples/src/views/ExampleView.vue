<script setup lang="ts">
/**
 * 示例视图：右侧 canvas。按路由参数加载示例模块、调用 `run(canvas)`，切换或卸载时执行清理函数。
 */
import { onBeforeUnmount, onMounted, reactive, ref, toRefs, watch } from "vue"
import { GpuDevice, type GpuProbeResult } from "@webgpu-cesium/rhi"
import ErrorPanel from "../components/ErrorPanel.vue"
import { findExample, type ExampleCleanup } from "../examples"

const props = defineProps<{ id: string }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

type ExampleStatus = "idle" | "loading" | "running" | "error"

interface ExampleViewState {
  status: ExampleStatus
  errorTitle: string
  errorMessage: string
  probe: GpuProbeResult | undefined
}

const state = reactive<ExampleViewState>({
  status: "idle",
  errorTitle: "",
  errorMessage: "",
  probe: undefined,
})
const { status, errorTitle, errorMessage, probe } = toRefs(state)

let cleanup: ExampleCleanup | undefined
let runToken = 0

/** 停止当前示例并释放 GPU 资源 */
function stopCurrent(): void {
  if (cleanup) {
    try {
      cleanup()
    } catch (error) {
      console.error("[examples] cleanup failed", error)
    }
    cleanup = undefined
  }
}

async function start(id: string): Promise<void> {
  stopCurrent()
  const token = ++runToken
  const entry = findExample(id)
  const canvas = canvasRef.value
  if (!entry) {
    state.status = "error"
    state.errorTitle = "示例不存在"
    state.errorMessage = `没有找到 id 为 "${id}" 的示例`
    return
  }
  if (!canvas) {
    return
  }

  state.status = "loading"
  state.errorMessage = ""
  try {
    const module = await entry.load()
    if (token !== runToken) {
      return
    }
    const dispose = await module.run(canvas)
    if (token !== runToken) {
      dispose()
      return
    }
    cleanup = dispose
    state.status = "running"
  } catch (error) {
    if (token !== runToken) {
      return
    }
    state.status = "error"
    state.errorTitle = "无法运行示例"
    state.errorMessage = error instanceof Error ? error.message : String(error)
    // 附带 adapter.info（若可得），便于反馈
    state.probe = await GpuDevice.probe().catch(() => undefined)
    console.error(`[examples] ${entry.id} failed`, error)
  }
}

// immediate watch 会在挂载前触发（canvasRef 还是 null），所以首次启动放在 onMounted
onMounted(() => {
  void start(props.id)
})

watch(
  () => props.id,
  (id) => {
    void start(id)
  },
  { flush: "post" },
)

onBeforeUnmount(() => {
  runToken++
  stopCurrent()
})
</script>

<template>
  <div class="example-view" :data-status="status">
    <canvas ref="canvasRef" class="example-view__canvas" data-testid="example-canvas"></canvas>
    <div v-if="status === 'loading'" class="example-view__loading">加载中…</div>
    <ErrorPanel
      v-if="status === 'error'"
      :title="errorTitle"
      :message="errorMessage"
      :probe="probe"
    />
  </div>
</template>

<style scoped lang="less">
.example-view {
  position: absolute;
  inset: 0;
  background: var(--color-bg);
}

.example-view__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.example-view__loading {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius);
  background: var(--color-bg-panel);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
