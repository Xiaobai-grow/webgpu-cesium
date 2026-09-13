<script setup lang="ts">
/**
 * 统一的错误面板：WebGPU 不可用 / 设备创建失败 / 示例运行异常。
 * 显示错误信息、浏览器建议与 adapter.info（若可得）。M9 迁入 @webgpu-cesium/widgets。
 */
import { computed } from "vue"
import type { GpuProbeResult } from "@webgpu-cesium/rhi"

const props = defineProps<{
  title: string
  message: string
  probe?: GpuProbeResult | undefined
}>()

const adapterRows = computed(() => {
  const info = props.probe?.adapterInfo
  if (!info) {
    return []
  }
  return [
    ["vendor", info.vendor],
    ["architecture", info.architecture],
    ["device", info.device],
    ["description", info.description],
  ].filter(([, value]) => typeof value === "string" && value.length > 0) as [string, string][]
})
</script>

<template>
  <section class="error-panel" role="alert" data-testid="error-panel">
    <h2 class="error-panel__title">{{ title }}</h2>
    <pre class="error-panel__message">{{ message }}</pre>
    <p class="error-panel__hint">
      本项目只支持 WebGPU（不回退 WebGL）。请使用最新稳定版 Chrome / Edge / Firefox 或 Safari 26+，
      并确认未禁用硬件加速；远程桌面与部分虚拟机可能没有可用的 GPU 适配器。
    </p>
    <dl v-if="adapterRows.length > 0" class="error-panel__adapter">
      <template v-for="[key, value] in adapterRows" :key="key">
        <dt>{{ key }}</dt>
        <dd>{{ value }}</dd>
      </template>
    </dl>
    <p v-if="probe && probe.isCompatibilityMode" class="error-panel__hint">
      当前适配器处于 Compatibility mode，本项目不支持（见 ADR-0002）。
    </p>
  </section>
</template>

<style scoped lang="less">
.error-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-6);
  color: var(--color-text);
}

.error-panel__title {
  margin: 0 0 var(--space-3);
  color: var(--color-danger);
  font-size: 20px;
}

.error-panel__message {
  margin: 0 0 var(--space-4);
  padding: var(--space-3);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius);
  background: var(--color-danger-bg);
  white-space: pre-wrap;
  word-break: break-word;
}

.error-panel__hint {
  margin: 0 0 var(--space-3);
  color: var(--color-text-muted);
}

.error-panel__adapter {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-1) var(--space-4);
  margin: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
  }
}
</style>
