# port-cesium

从只读参考仓库 `d:\code\cesium` 拷贝 M1 范围内的 CesiumJS Core 文件，做机械转换（扩展名、named export、版权头），并生成待手工补类型的 TODO。

**不修改** `d:\code\cesium`。脚本可复跑；已存在的手写 TypeScript 默认跳过，除非 `--force`。

## 用法

```bash
pnpm --filter @webgpu-cesium/port-cesium port -- --list
pnpm --filter @webgpu-cesium/port-cesium port -- --todo
pnpm --filter @webgpu-cesium/port-cesium port -- --emit --group foundation
pnpm --filter @webgpu-cesium/port-cesium port -- --emit --modules Cartesian3,Matrix4
```

默认 Cesium 根目录：`CESIUM_ROOT` 或 `d:\code\cesium`。
默认输出：`packages/core/src`。

机械输出只是起点：必须补 TypeScript 类型、去掉 WebGL 分支、对照 Specs 写单测。
