/**
 * 把 Cesium Core JS 机械转成 TypeScript 草稿：
 * - 保留算法与 JSDoc
 * - default import/export → named
 * - 去掉 .js 扩展名与 // @ts-check
 * - 根据紧邻 JSDoc 给函数参数补类型（草稿，需手修）
 * - 加 Apache-2.0 / Cesium 版权头
 */

export const COPYRIGHT_HEADER = `/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */
`

const JSDOC_TYPE_MAP = new Map([
  ["*", "unknown"],
  ["any", "unknown"],
  ["void", "void"],
  ["null", "null"],
  ["undefined", "undefined"],
  ["number", "number"],
  ["string", "string"],
  ["boolean", "boolean"],
  ["bigint", "bigint"],
  ["object", "object"],
  ["Object", "object"],
  ["function", "(...args: never[]) => unknown"],
  ["Function", "(...args: never[]) => unknown"],
  ["typedarray", "TypedArray"],
  ["TypedArray", "TypedArray"],
])

/**
 * @param {string} jsdocType
 * @returns {string}
 */
export function mapJsdocType(jsdocType) {
  if (!jsdocType) {
    return "unknown"
  }
  let t = jsdocType.trim()
  t = t.replace(/^\{|\}$/g, "").trim()
  if (t.startsWith("(") && t.endsWith(")")) {
    t = t.slice(1, -1)
  }
  if (t.includes("|")) {
    return t
      .split("|")
      .map((part) => mapJsdocType(part.trim()))
      .join(" | ")
  }
  const arrayOf = /^(?:Array\.?<([^>]+)>|([A-Za-z0-9_$.]+)\[\])$/.exec(t)
  if (arrayOf) {
    const inner = arrayOf[1] ?? arrayOf[2]
    return `${mapJsdocType(inner)}[]`
  }
  const promise = /^Promise\.?<([^>]+)>$/.exec(t)
  if (promise) {
    return `Promise<${mapJsdocType(promise[1])}>`
  }
  if (JSDOC_TYPE_MAP.has(t)) {
    return JSDOC_TYPE_MAP.get(t)
  }
  return t.replace(/\.js$/g, "")
}

/**
 * @param {string} block
 */
function parseJsdocParams(block) {
  /** @type {{ name: string, optional: boolean, type: string }[]} */
  const params = []
  const paramRe = /@param\s+(?:\{([^}]*)\}\s+)?(?:\[([^\]]+)\]|([A-Za-z_$][\w$]*))/g
  let match
  while ((match = paramRe.exec(block))) {
    const rawName = (match[2] ?? match[3] ?? "").split("=")[0].trim()
    const name = rawName.split(".")[0]
    if (!name || name === "this" || params.some((p) => p.name === name)) {
      continue
    }
    params.push({
      name,
      optional: Boolean(match[2]),
      type: mapJsdocType(match[1] ?? "*"),
    })
  }
  const ret = /@returns?\s+\{([^}]*)\}/.exec(block)
  return { params, returns: ret ? mapJsdocType(ret[1]) : undefined }
}

/**
 * @param {string} args
 * @param {{ name: string, optional: boolean, type: string }[]} params
 */
function annotateArgs(args, params) {
  if (!args.trim()) {
    return args
  }
  const parts = splitArgs(args)
  return parts
    .map((part) => {
      const trimmed = part.trim()
      if (!trimmed || trimmed.startsWith("...")) {
        const restName = trimmed
          .replace(/^\.\.\./, "")
          .split(/[=:]/)[0]
          .trim()
        return `...${restName}: unknown[]`
      }
      const name = trimmed.split(/[=:]/)[0].trim()
      const defaultMatch = /\s*=\s*(.+)$/.exec(trimmed)
      const info = params.find((p) => p.name === name)
      const type = info?.type ?? "unknown"
      const optional = !defaultMatch && (info?.optional ?? trimmed.includes("?"))
      const opt = optional ? "?" : ""
      const def = defaultMatch ? ` = ${defaultMatch[1]}` : ""
      return `${name}${opt}: ${type}${def}`
    })
    .join(", ")
}

/**
 * @param {string} args
 */
function splitArgs(args) {
  const parts = []
  let current = ""
  let depth = 0
  for (const ch of args) {
    if (ch === "(" || ch === "<" || ch === "{" || ch === "[") {
      depth++
    } else if (ch === ")" || ch === ">" || ch === "}" || ch === "]") {
      depth--
    }
    if (ch === "," && depth === 0) {
      parts.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  if (current.trim()) {
    parts.push(current)
  }
  return parts
}

/**
 * @param {string} source
 * @param {{ moduleName?: string }} [options]
 */
export function convertCesiumJs(source, options = {}) {
  let text = source.replace(/\r\n/g, "\n")
  text = text.replace(/^\/\/ @ts-check\s*\n+/m, "")
  text = text.replace(
    /^\/\*\* @import \{([^}]+)\} from ["']([^"']+)["'];? \*\/\s*$/gm,
    (_m, names, spec) => {
      return `import type { ${names} } from "${stripJs(spec)}"`
    },
  )
  text = text.replace(
    /^\/\*\* @import ([A-Za-z_$][\w$]*) from ["']([^"']+)["'];? \*\/\s*$/gm,
    (_m, name, spec) => {
      return `import type { ${name} } from "${stripJs(spec)}"`
    },
  )

  text = text.replace(
    /^import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["'];?\s*$/gm,
    (_m, name, spec) => {
      if (spec === "mersenne-twister") {
        return `import { MersenneTwister } from "./MersenneTwister"`
      }
      if (spec === "urijs") {
        return `import { Uri } from "./Uri"`
      }
      return `import { ${name} } from "${stripJs(spec)}"`
    },
  )
  text = text.replace(
    /^import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?\s*$/gm,
    (_m, names, spec) => `import { ${names.trim()} } from "${stripJs(spec)}"`,
  )

  text = text.replace(/from ["'](\.[^"']+)\.js["']/g, (_m, spec) => `from "${spec}"`)

  text = annotateFunctions(text)

  const exportName = options.moduleName
  text = text.replace(/^export default ([A-Za-z_$][\w$]*);?\s*$/m, (_m, name) => {
    if (exportName && exportName !== name) {
      return `export { ${name} as ${exportName} }\nexport { ${name} }`
    }
    return `export { ${name} }`
  })

  if (!text.startsWith("/**\n * @license")) {
    text = `${COPYRIGHT_HEADER}\n${text}`
  }
  if (!text.endsWith("\n")) {
    text += "\n"
  }
  return text
}

function stripJs(spec) {
  return spec.replace(/\.js$/i, "")
}

/**
 * 给紧跟 JSDoc 的 function / class method 补类型（尽量不破坏多行签名）。
 * @param {string} text
 */
function annotateFunctions(text) {
  const lines = text.split("\n")
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ""
    if (line.trimStart().startsWith("/**")) {
      const blockLines = [line]
      if (!line.includes("*/")) {
        i++
        while (i < lines.length) {
          blockLines.push(lines[i] ?? "")
          if ((lines[i] ?? "").includes("*/")) {
            break
          }
          i++
        }
      }
      const block = blockLines.join("\n")
      const { params, returns } = parseJsdocParams(block)
      out.push(...blockLines)
      i++
      // 跳过空行与 pragma
      while (i < lines.length && (lines[i] ?? "").trim() === "") {
        out.push(lines[i] ?? "")
        i++
      }
      const sig = collectSignature(lines, i)
      if (sig && params.length + (returns ? 1 : 0) > 0) {
        out.push(applySignatureTypes(sig.text, params, returns))
        i = sig.next
        continue
      }
      continue
    }
    out.push(line)
    i++
  }
  return out.join("\n")
}

/**
 * @param {string[]} lines
 * @param {number} start
 */
function collectSignature(lines, start) {
  const first = lines[start] ?? ""
  const isSig =
    /^\s*(export\s+)?(async\s+)?function[\s*]/.test(first) ||
    /^\s*(static\s+)?(async\s+)?(get|set)?\s*[A-Za-z_$][\w$]*\s*\(/.test(first) ||
    /^\s*constructor\s*\(/.test(first) ||
    /=\s*(async\s+)?function\s*\(/.test(first)
  if (!isSig) {
    return undefined
  }
  let text = first
  let i = start
  let depth = (first.match(/\(/g) ?? []).length - (first.match(/\)/g) ?? []).length
  while (depth > 0 && i + 1 < lines.length) {
    i++
    text += `\n${lines[i]}`
    depth += (lines[i]?.match(/\(/g) ?? []).length
    depth -= (lines[i]?.match(/\)/g) ?? []).length
  }
  return { text, next: i + 1 }
}

/**
 * @param {string} sig
 * @param {{ name: string, optional: boolean, type: string }[]} params
 * @param {string | undefined} returns
 */
function applySignatureTypes(sig, params, returns) {
  const alreadyTyped = /:\s*[A-Za-z_$]/.test(sig.split("(")[1] ?? "")
  if (alreadyTyped) {
    return sig
  }
  const open = sig.indexOf("(")
  const close = sig.lastIndexOf(")")
  if (open < 0 || close < 0) {
    return sig
  }
  const head = sig.slice(0, open + 1)
  const args = sig.slice(open + 1, close)
  const tail = sig.slice(close + 1)
  const annotated = annotateArgs(args, params)
  let newTail = tail
  if (
    returns &&
    !/\)\s*:/.test(sig) &&
    !/constructor\s*\(/.test(sig) &&
    !/\bset\s+\w+\s*\(/.test(sig)
  ) {
    newTail = tail.replace(/^(\s*)/, `: ${returns}$1`)
    if (!newTail.includes(returns)) {
      newTail = `: ${returns}${tail}`
    }
  }
  return `${head}${annotated})${newTail}`
}
