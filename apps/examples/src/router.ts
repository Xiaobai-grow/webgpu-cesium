import { createRouter, createWebHashHistory } from "vue-router"
import ExampleView from "./views/ExampleView.vue"
import { EXAMPLES } from "./examples"

/** 哈希路由：静态托管无需服务端回退 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: `/examples/${EXAMPLES[0]?.id ?? "hello-triangle"}` },
    { path: "/examples/:id", name: "example", component: ExampleView, props: true },
  ],
})
