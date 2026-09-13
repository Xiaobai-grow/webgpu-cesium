/// <reference types="vite/client" />

interface Window {
  helloGlobeSetView?: (name: string) => void
  helloTerrainSetView?: (name: string) => void
}

declare module "*.vue" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
