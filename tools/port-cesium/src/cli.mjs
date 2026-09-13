#!/usr/bin/env node
/**
 * port-cesium CLI：列出 / 生成 TODO / 机械 emit TypeScript 草稿。
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { convertCesiumJs, COPYRIGHT_HEADER } from "./convert.mjs"
import { CESIUM_CORE, destName, M1_MODULES } from "./manifest.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, "../../..")

function parseArgs(argv) {
  const args = {
    list: false,
    todo: false,
    emit: false,
    force: false,
    group: undefined,
    modules: undefined,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--list") {
      args.list = true
    } else if (a === "--todo") {
      args.todo = true
    } else if (a === "--emit") {
      args.emit = true
    } else if (a === "--force") {
      args.force = true
    } else if (a === "--group") {
      args.group = argv[++i]
    } else if (a === "--modules") {
      args.modules = (argv[++i] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (a === "--help" || a === "-h") {
      args.help = true
    }
  }
  return args
}

function cesiumRoot() {
  return process.env.CESIUM_ROOT ?? "d:\\code\\cesium"
}

function coreSrc() {
  return path.join(repoRoot, "packages/core/src")
}

function resolveCesiumFile(mod) {
  const rel = mod.cesium.startsWith("../")
    ? path.join(CESIUM_CORE, mod.cesium)
    : path.join(CESIUM_CORE, `${mod.cesium}.js`)
  const normalized = rel.replace(/\\/g, "/")
  const withJs = normalized.endsWith(".js") ? normalized : `${normalized}.js`
  return path.join(cesiumRoot(), withJs)
}

function selectedModules(args) {
  return M1_MODULES.filter((mod) => {
    if (mod.skip) {
      return false
    }
    if (args.group && mod.group !== args.group) {
      return false
    }
    if (args.modules && !args.modules.includes(mod.id) && !args.modules.includes(mod.cesium)) {
      return false
    }
    return true
  })
}

function printList() {
  const groups = new Map()
  for (const mod of M1_MODULES) {
    const list = groups.get(mod.group) ?? []
    list.push(mod)
    groups.set(mod.group, list)
  }
  for (const [group, mods] of groups) {
    console.log(`\n[${group}]`)
    for (const mod of mods) {
      const flag = mod.skip ? ` SKIP ${mod.skip}` : ""
      const note = mod.notes ? ` — ${mod.notes}` : ""
      console.log(`  ${mod.id.padEnd(32)} ${mod.cesium}${flag}${note}`)
    }
  }
  console.log(
    `\n合计 ${M1_MODULES.length} 项，可 emit ${M1_MODULES.filter((m) => !m.skip).length} 项`,
  )
}

function renderTodo() {
  const lines = [
    "# port-cesium TODO",
    "",
    "由 `tools/port-cesium` 生成。机械拷贝不是完成；每项需：TS 类型、单测、对照 Cesium 行为。",
    "",
    "| 模块 | 组 | Cesium 源 | 目标 | 状态 | 备注 |",
    "| --- | --- | --- | --- | --- | --- |",
  ]
  for (const mod of M1_MODULES) {
    const dest = path.posix.join("packages/core/src", destName(mod))
    const exists = existsSync(path.join(coreSrc(), destName(mod)))
    const status = mod.skip ? "跳过" : exists ? "已有文件" : "未生成"
    lines.push(
      `| ${mod.id} | ${mod.group} | \`${CESIUM_CORE}/${mod.cesium}.js\` | \`${dest}\` | ${status} | ${mod.skip ?? mod.notes ?? ""} |`,
    )
  }
  lines.push("")
  return lines.join("\n")
}

async function emit(args) {
  const mods = selectedModules(args)
  const destDir = coreSrc()
  await mkdir(destDir, { recursive: true })
  let written = 0
  let skipped = 0
  let missing = 0
  for (const mod of mods) {
    const src = resolveCesiumFile(mod)
    const dest = path.join(destDir, destName(mod))
    if (!existsSync(src)) {
      console.warn(`missing: ${src}`)
      missing++
      continue
    }
    if (existsSync(dest) && !args.force) {
      skipped++
      continue
    }
    const js = await readFile(src, "utf8")
    const ts = convertCesiumJs(js, { moduleName: destName(mod).replace(/\.ts$/, "") })
    await writeFile(dest, ts, "utf8")
    written++
    console.log(`wrote ${path.relative(repoRoot, dest)}`)
  }
  const todoPath = path.join(here, "..", "TODO.md")
  await writeFile(todoPath, renderTodo(), "utf8")
  console.log(`done written=${written} skipped=${skipped} missing=${missing}`)
  console.log(`todo ${path.relative(repoRoot, todoPath)}`)
}

const rawArgv = process.argv.slice(2).filter((a) => a !== "--")
const args = parseArgs(rawArgv)
if (args.help || (!args.list && !args.todo && !args.emit)) {
  console.log(`port-cesium
  --list              打印 M1 模块清单
  --todo              写 tools/port-cesium/TODO.md
  --emit              机械生成 packages/core/src/*.ts（已存在则跳过）
  --force             覆盖已有文件
  --group <name>      只处理一组
  --modules a,b,c     只处理这些 id
`)
  process.exit(args.help ? 0 : 1)
}

if (args.list) {
  printList()
}
if (args.todo) {
  const todoPath = path.join(here, "..", "TODO.md")
  await writeFile(todoPath, renderTodo(), "utf8")
  console.log(`wrote ${todoPath}`)
}
if (args.emit) {
  await emit(args)
}

void COPYRIGHT_HEADER
