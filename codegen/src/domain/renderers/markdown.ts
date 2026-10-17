import { isObject, type JsonSchema, type JsonValue } from "../json-schema.ts";
import { BUNDLE_REF_PREFIX, type SchemaBundle } from "../schema-bundle.ts";

/** Markdown helpers shared by the protocol reference renderers. */

export function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

export function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |`;
  return [head, ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)].join("\n");
}

export function typeLabel(schema: JsonValue | undefined): string {
  if (!isObject(schema)) return "any";
  if (typeof schema.$ref === "string") return schema.$ref.slice(BUNDLE_REF_PREFIX.length);
  if (Array.isArray(schema.anyOf)) {
    const nonNull = schema.anyOf.filter((s) => !(isObject(s) && s.type === "null"));
    const nullable = nonNull.length < schema.anyOf.length;
    return `${nullable ? "?" : ""}${nonNull.map(typeLabel).join(" or ")}`;
  }
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (Array.isArray(schema.enum)) return schema.enum.map((v) => JSON.stringify(v)).join(" or ");
  if (Array.isArray(schema.type)) {
    const types = schema.type.filter((t) => t !== "null");
    const prefix = types.length < schema.type.length ? "?" : "";
    return prefix + types.map((t) => typeLabel({ ...schema, type: t })).join(" or ");
  }
  if (schema.type === "array") return `array of ${typeLabel(schema.items)}`;
  if (schema.type === "object" && schema.additionalProperties !== undefined && !isObject(schema.properties)) return `map of ${typeLabel(schema.additionalProperties)}`;
  if (schema.type === "string" && typeof schema.format === "string") return `string (${schema.format})`;
  return typeof schema.type === "string" ? schema.type : "any";
}

/** A field table (Discord docs style: `field?` optional, `?type` nullable) or a one-line type for non-objects. */
export function schemaBody(schema: JsonSchema | undefined): string {
  if (!schema) return "_No payload._";
  if (!isObject(schema.properties)) return `Type: \`${typeLabel(schema as JsonValue)}\``;
  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  const rows = Object.entries(schema.properties).map(([name, prop]) => [
    `\`${name}${required.has(name) ? "" : "?"}\``,
    `\`${typeLabel(prop)}\``,
    isObject(prop) && typeof prop.description === "string" ? prop.description : "",
  ]);
  return table(["Field", "Type", "Description"], rows);
}

export function section(level: number, title: string, ...parts: string[]): string {
  return [`${"#".repeat(level)} ${title}`, ...parts.filter((p) => p.length > 0)].join("\n\n");
}

/** Renders a named schema from the bundle with its description and fields. */
export function schemaSection(level: number, title: string, bundle: SchemaBundle): string {
  const schema = bundle.$defs[title];
  return section(level, title, typeof schema?.description === "string" ? schema.description : "", schemaBody(schema));
}
