<script setup lang="ts">
import ExampleList from "./components/ExampleList.vue"
</script>

<template>
  <div class="app">
    <aside class="app__sidebar">
      <header class="app__header">
        <span class="app__title">webgpu-cesium</span>
        <span class="app__subtitle">示例</span>
      </header>
      <ExampleList />
    </aside>
    <main class="app__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped lang="less">
.app {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  height: 100%;
}

.app__sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  overflow: hidden;
}

.app__header {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  height: var(--header-height);
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.app__title {
  font-weight: 600;
}

.app__subtitle {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.app__main {
  position: relative;
  min-width: 0;
  min-height: 0;
}
</style>
