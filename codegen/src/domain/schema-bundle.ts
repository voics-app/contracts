import path from "node:path";
import { isObject, mapObjects, sortKeys, type JsonSchema, type JsonValue } from "./json-schema.ts";

/** One source schema file, `path` being relative to `schemas/` with forward slashes. */
export interface SourceSchema {
  path: string;
  schema: JsonSchema;
}

/** All schemas merged into one document whose `$defs` are keyed by schema title. */
export interface SchemaBundle {
  $schema: string;
  $defs: Record<string, JsonSchema>;
}

export interface BundleResult {
  bundle: SchemaBundle;
  /** Maps a source path (optionally with a `#/$defs/...` fragment) to its title in the bundle. */
  titleByPath: Map<string, string>;
}

export const BUNDLE_REF_PREFIX = "#/$defs/";
const DRAFT = "https://json-schema.org/draft/2020-12/schema";

export function bundleSchemas(sources: SourceSchema[]): BundleResult {
  const titleByPath = indexTitles(sources);
  const defs: Record<string, JsonSchema> = {};

  for (const { path: file, schema } of sources) {
    const { $defs: nested, ...rest } = schema;
    const body: JsonSchema = { ...rest };
    delete body.$schema;
    delete body.$id;
    defs[titleOf(titleByPath, file)] = rewriteRefs(body, file, titleByPath);
    for (const def of Object.values(isObject(nested) ? nested : {})) {
      const nestedDef = def as JsonSchema;
      defs[nestedDef.title as string] = rewriteRefs(nestedDef, file, titleByPath);
    }
  }

  const flattened = flattenAllOf(defs);
  return { bundle: { $schema: DRAFT, $defs: sortKeys(flattened) }, titleByPath };
}

function indexTitles(sources: SourceSchema[]): Map<string, string> {
  const titleByPath = new Map<string, string>();
  const seen = new Set<string>();
  const register = (key: string, title: unknown) => {
    if (typeof title !== "string" || title.length === 0) throw new Error(`Schema ${key} has no title`);
    if (seen.has(title)) throw new Error(`Duplicate title "${title}" (${key})`);
    seen.add(title);
    titleByPath.set(key, title);
  };
  for (const { path: file, schema } of sources) {
    register(file, schema.title);
    const nested = schema.$defs;
    if (isObject(nested)) {
      for (const [name, def] of Object.entries(nested)) register(`${file}#/$defs/${name}`, isObject(def) ? def.title : undefined);
    }
  }
  return titleByPath;
}

function titleOf(titleByPath: Map<string, string>, key: string): string {
  const title = titleByPath.get(key);
  if (!title) throw new Error(`Unresolved $ref target ${key}`);
  return title;
}

/** Resolves a `$ref` written in `file` to the key used in `titleByPath`. */
export function resolveRefKey(ref: string, file: string): string {
  const [target = "", fragment] = ref.split("#");
  const resolved = target === "" ? file : path.posix.normalize(path.posix.join(path.posix.dirname(file), target));
  return fragment ? `${resolved}#${fragment}` : resolved;
}

function rewriteRefs(schema: JsonSchema, file: string, titleByPath: Map<string, string>): JsonSchema {
  return mapObjects(schema as JsonValue, (node) => {
    if (typeof node.$ref !== "string") return node;
    return { ...node, $ref: BUNDLE_REF_PREFIX + titleOf(titleByPath, resolveRefKey(node.$ref, file)) };
  }) as JsonSchema;
}

function flattenAllOf(defs: Record<string, JsonSchema>): Record<string, JsonSchema> {
  const done = new Map<string, JsonSchema>();
  const flatten = (title: string): JsonSchema => {
    const cached = done.get(title);
    if (cached) return cached;
    const def = defs[title];
    if (!def) throw new Error(`Unknown schema ${title}`);
    const result = Array.isArray(def.allOf) ? mergeAllOf(def, flatten) : def;
    done.set(title, result);
    return result;
  };
  return Object.fromEntries(Object.keys(defs).map((title) => [title, flatten(title)]));
}

function mergeAllOf(def: JsonSchema, flatten: (title: string) => JsonSchema): JsonSchema {
  const { allOf, ...outer } = def;
  const members = (allOf as JsonValue[]).map((member) =>
    isObject(member) && typeof member.$ref === "string" ? flatten(member.$ref.slice(BUNDLE_REF_PREFIX.length)) : member);
  const mergeable = new Set(["title", "description", "type", "properties", "required", "if", "then", "else"]);
  if (members.some((member) => !isObject(member) || (member.type !== undefined && member.type !== "object")
    || Object.keys(member).some((key) => !mergeable.has(key)))) return def;
  const properties: Record<string, JsonValue> = isObject(outer.properties) ? { ...outer.properties } : {};
  const required = (Array.isArray(outer.required) ? outer.required : []).filter((name): name is string => typeof name === "string");
  const constraints: JsonValue[] = [];
  for (const resolved of members as JsonSchema[]) {
    if (isObject(resolved.properties)) Object.assign(properties, resolved.properties);
    for (const name of Array.isArray(resolved.required) ? resolved.required : []) {
      if (typeof name === "string" && !required.includes(name)) required.push(name);
    }
    // Keep conditional validation separate from the merged object shape.
    const conditional: Record<string, JsonValue> = {};
    for (const key of ["if", "then", "else"]) {
      const value = resolved[key];
      if (value !== undefined) conditional[key] = value;
    }
    if (Object.keys(conditional).length) constraints.push(conditional);
  }
  return { ...outer, type: "object", ...(required.length ? { required } : {}), properties, ...(constraints.length ? { allOf: constraints } : {}) };
}
