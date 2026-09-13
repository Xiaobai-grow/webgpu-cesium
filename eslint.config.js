// ESLint flat config（ESLint 10 + typescript-eslint recommended-type-checked + eslint-plugin-vue）
import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import prettier from "eslint-config-prettier"
import vue from "eslint-plugin-vue"
import globals from "globals"
import tseslint from "typescript-eslint"
import vueParser from "vue-eslint-parser"

/**
 * 包间依赖边界（见 docs/10-architecture/02-packages.md「依赖只能向下」）。
 * 用内置 no-restricted-imports 按目录禁止反向导入，避免引入 eslint-plugin-import。
 * key 为包目录名，value 为该包不允许导入的 workspace 包名。
 */
const PACKAGE_BOUNDARIES = {
  core: [
    "@webgpu-cesium/rhi",
    "@webgpu-cesium/shaders",
    "@webgpu-cesium/renderer",
    "@webgpu-cesium/tiles",
    "@webgpu-cesium/environment",
    "@webgpu-cesium/scene",
    "@webgpu-cesium/widgets",
    "@webgpu-cesium/webgpu-cesium",
  ],
  rhi: [
    "@webgpu-cesium/shaders",
    "@webgpu-cesium/renderer",
    "@webgpu-cesium/tiles",
    "@webgpu-cesium/environment",
    "@webgpu-cesium/scene",
    "@webgpu-cesium/widgets",
    "@webgpu-cesium/webgpu-cesium",
  ],
  shaders: [
    "@webgpu-cesium/rhi",
    "@webgpu-cesium/renderer",
    "@webgpu-cesium/tiles",
    "@webgpu-cesium/environment",
    "@webgpu-cesium/scene",
    "@webgpu-cesium/widgets",
    "@webgpu-cesium/webgpu-cesium",
  ],
  renderer: [
    "@webgpu-cesium/tiles",
    "@webgpu-cesium/environment",
    "@webgpu-cesium/scene",
    "@webgpu-cesium/widgets",
    "@webgpu-cesium/webgpu-cesium",
  ],
  environment: [
    "@webgpu-cesium/tiles",
    "@webgpu-cesium/scene",
    "@webgpu-cesium/widgets",
    "@webgpu-cesium/webgpu-cesium",
  ],
  scene: ["@webgpu-cesium/widgets", "@webgpu-cesium/webgpu-cesium"],
}

const boundaryConfigs = Object.entries(PACKAGE_BOUNDARIES).map(([dir, forbidden]) => ({
  name: `boundary/${dir}`,
  files: [`packages/${dir}/src/**/*.ts`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: forbidden.map((name) => ({
          name,
          message: `包 ${dir} 不允许依赖 ${name}（依赖只能向下，见 docs/10-architecture/02-packages.md）`,
        })),
        patterns: forbidden.map((name) => `${name}/*`),
      },
    ],
  },
}))

export default defineConfig([
  globalIgnores([
    "**/node_modules/",
    "**/dist/",
    "**/coverage/",
    "**/test-results/",
    "**/playwright-report/",
    "**/.husky/",
    "**/*.snap",
    "packages/core/src/**/*.browser.test.ts",
  ]),

  // 基础 JS 规则
  js.configs.recommended,

  // TypeScript：类型感知规则
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    name: "ts/parser-options",
    files: ["**/*.ts", "**/*.mts", "**/*.vue"],
    languageOptions: {
      parserOptions: {
        // 每个被 lint 的 .ts 必须属于某个 tsconfig（根 / 包 / apps）
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".vue"],
      },
    },
  },
  {
    name: "ts/project-rules",
    files: ["**/*.ts", "**/*.mts", "**/*.vue"],
    rules: {
      // 禁止 any 外泄
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // 允许 Promise 在事件回调中不 await（渲染循环常见）
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
      // 允许 class 中的空构造等
      "@typescript-eslint/no-extraneous-class": "off",
      // 命名：camelCase / PascalCase / UPPER_SNAKE_CASE
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["camelCase"], leadingUnderscore: "allow" },
        {
          selector: "variable",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        { selector: "function", format: ["camelCase", "PascalCase"] },
        { selector: "parameter", format: ["camelCase", "PascalCase"], leadingUnderscore: "allow" },
        { selector: "objectLiteralMethod", format: ["camelCase", "PascalCase"] },
        { selector: "typeMethod", format: ["camelCase", "PascalCase"] },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "enumMember", format: ["PascalCase", "UPPER_CASE"] },
        { selector: "import", format: ["camelCase", "PascalCase", "UPPER_CASE"] },
        {
          selector: "classProperty",
          modifiers: ["static"],
          format: ["UPPER_CASE", "camelCase", "PascalCase"],
          leadingUnderscore: "allow",
        },
        // 对象字面量属性可能需要匹配外部键（例如 WGSL 名称、HTTP 头、Cesium 常量）
        { selector: "objectLiteralProperty", format: null },
        {
          selector: "typeProperty",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
      ],
    },
  },

  // 根目录与工具链的配置文件（Node 环境）
  {
    name: "node-config-files",
    files: [
      "*.js",
      "*.ts",
      "*.mts",
      "packages/*/tsdown.config.ts",
      "tools/*/tsdown.config.ts",
      "tools/*/src/**/*.{ts,mjs,js}",
      "tools/wgsl-plugin/src/**/*.ts",
      "apps/*/vite.config.ts",
      "apps/*/playwright.config.ts",
      "apps/*/e2e/**/*.ts",
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // 包间边界
  ...boundaryConfigs,

  // Vue 3 单文件组件
  ...vue.configs["flat/recommended"],
  {
    name: "vue/setup",
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".vue"],
        sourceType: "module",
      },
      globals: { ...globals.browser },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/component-name-in-template-casing": ["error", "PascalCase"],
      "vue/attribute-hyphenation": ["error", "always"],
      "vue/block-lang": ["error", { script: { lang: "ts" }, style: { lang: "less" } }],
      "vue/component-api-style": ["error", ["script-setup"]],
      "vue/define-macros-order": "error",
    },
  },

  // Cesium 数值常量保持双精度原文，避免为过 lint 改算法
  {
    name: "core-cesium-constants",
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-loss-of-precision": "off",
      "no-useless-assignment": "off",
      "no-useless-escape": "off",
      "@typescript-eslint/prefer-for-of": "off",
    },
  },

  // Cesium 机械移植：保留原算法，严格类型后续补齐
  {
    name: "core-mechanical-ports",
    files: [
      "packages/core/src/CubicRealPolynomial.ts",
      "packages/core/src/QuarticRealPolynomial.ts",
      "packages/core/src/Simon1994PlanetaryPositions.ts",
      "packages/core/src/IntersectionTests.ts",
    ],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/naming-convention": "off",
    },
  },

  // 测试文件放宽部分规则
  {
    name: "tests",
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },

  // 纯 JS 文件（eslint.config.js 本身等）不做类型检查
  {
    name: "js-files",
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
  },

  // 关闭与 Prettier 冲突的格式规则
  prettier,
])
