/**
 * 3D Metadata 最小解析（3D Tiles 1.1 / EXT_structural_metadata）。
 */
export interface MetadataClassProperty {
  name: string
  type: string
  componentType?: string
  enumType?: string
  required?: boolean
  semantic?: string
}

export interface MetadataClass {
  name: string
  description?: string
  properties: Record<string, MetadataClassProperty>
}

export interface MetadataEnum {
  name: string
  values: { name: string; value: number }[]
}

export interface MetadataSchema {
  id?: string
  name?: string
  classes: Record<string, MetadataClass>
  enums: Record<string, MetadataEnum>
}

/**
 * 解析 schema JSON。
 *
 * @param json 3D Metadata schema
 */
export function parseMetadataSchema(json: Record<string, unknown> | undefined): MetadataSchema {
  const classes: Record<string, MetadataClass> = {}
  const rawClasses = (json?.classes ?? {}) as Record<string, Record<string, unknown>>
  for (const [name, cls] of Object.entries(rawClasses)) {
    const properties: Record<string, MetadataClassProperty> = {}
    const rawProps = (cls.properties ?? {}) as Record<string, Record<string, unknown>>
    for (const [propName, prop] of Object.entries(rawProps)) {
      properties[propName] = {
        name: propName,
        type: asString(prop.type, "STRING"),
        ...(prop.componentType !== undefined
          ? { componentType: asString(prop.componentType, "") }
          : {}),
        ...(prop.enumType !== undefined ? { enumType: asString(prop.enumType, "") } : {}),
        ...(prop.required !== undefined ? { required: Boolean(prop.required) } : {}),
        ...(prop.semantic !== undefined ? { semantic: asString(prop.semantic, "") } : {}),
      }
    }
    classes[name] = {
      name,
      ...(cls.description !== undefined ? { description: asString(cls.description, "") } : {}),
      properties,
    }
  }
  const enums: Record<string, MetadataEnum> = {}
  const rawEnums = (json?.enums ?? {}) as Record<
    string,
    { values?: { name: string; value: number }[] }
  >
  for (const [name, item] of Object.entries(rawEnums)) {
    enums[name] = { name, values: item.values ?? [] }
  }
  return {
    ...(json?.id !== undefined ? { id: asString(json.id, "") } : {}),
    ...(json?.name !== undefined ? { name: asString(json.name, "") } : {}),
    classes,
    enums,
  }
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

export class MetadataEntity {
  readonly className: string
  readonly properties: Record<string, unknown>

  /**
   * @param className 类名
   * @param properties 值
   */
  constructor(className: string, properties: Record<string, unknown> = {}) {
    this.className = className
    this.properties = properties
  }

  getProperty(name: string): unknown {
    return this.properties[name]
  }
}
