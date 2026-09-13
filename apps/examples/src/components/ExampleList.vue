<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import { EXAMPLES } from "../examples"

const route = useRoute()
const activeId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""))
</script>

<template>
  <nav class="example-list" aria-label="示例列表">
    <ul class="example-list__items">
      <li v-for="entry in EXAMPLES" :key="entry.id">
        <RouterLink
          class="example-list__item"
          :class="{ 'example-list__item--active': entry.id === activeId }"
          :to="
            entry.query
              ? { name: 'example', params: { id: entry.id }, query: entry.query }
              : { name: 'example', params: { id: entry.id } }
          "
          :data-example-id="entry.id"
        >
          <span class="example-list__title">{{ entry.title }}</span>
          <span class="example-list__milestone">{{ entry.milestone }}</span>
          <span class="example-list__description">{{ entry.description }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped lang="less">
.example-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.example-list__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.example-list__item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
  color: var(--color-text);

  &:hover {
    background: var(--color-bg-panel-hover);
  }

  &--active {
    background: var(--color-bg-active);
  }
}

.example-list__title {
  font-weight: 500;
}

.example-list__milestone {
  align-self: center;
  padding: 0 var(--space-2);
  border-radius: 999px;
  background: var(--color-border);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.example-list__description {
  grid-column: 1 / -1;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
