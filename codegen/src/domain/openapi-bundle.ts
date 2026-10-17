import path from "node:path";
import { isObject, mapObjects, sortKeys, type JsonSchema, type JsonValue } from "./json-schema.ts";
import { BUNDLE_REF_PREFIX, type SchemaBundle } from "./schema-bundle.ts";

const COMPONENT_PREFIX = "#/components/schemas/";
const SCHEMAS_DIR = "schemas/";

export type OpenApiDocument = Record<string, JsonValue>;

/**
 * Produces a self-contained OpenAPI document: refs into `schemas/` become `#/components/schemas/<Title>`
 * and every schema reachable from the document is embedded under `components.schemas`.
 */
export function bundleOpenApi(doc: OpenApiDocument, docPath: string, bundle: SchemaBundle, titleByPath: Map<string, string>): OpenApiDocument {
  const roots = new Set<string>();
  const rewritten = mapObjects(doc, (node) => {
    if (typeof node.$ref !== "string" || node.$ref.startsWith("#")) return node;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(docPath), node.$ref));
    const key = target.startsWith(SCHEMAS_DIR) ? target.slice(SCHEMAS_DIR.length) : target;
    const title = titleByPath.get(key);
    if (!title) throw new Error(`${docPath}: unresolved $ref ${node.$ref}`);
    roots.add(title);
    return { ...node, $ref: COMPONENT_PREFIX + title };
  }) as OpenApiDocument;

  const schemas: Record<string, JsonSchema> = {};
  for (const title of reachableTitles(roots, bundle)) {
    schemas[title] = mapObjects(bundle.$defs[title] as JsonValue, (node) =>
      typeof node.$ref === "string" ? { ...node, $ref: COMPONENT_PREFIX + node.$ref.slice(BUNDLE_REF_PREFIX.length) } : node,
    ) as JsonSchema;
  }

  const components = isObject(rewritten.components) ? rewritten.components : {};
  return { ...rewritten, components: { ...components, schemas: sortKeys(schemas) as Record<string, JsonValue> } };
}

/** Titles referenced (transitively) from `roots` within the bundle. */
export function reachableTitles(roots: Iterable<string>, bundle: SchemaBundle): Set<string> {
  const seen = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const title = queue.pop() as string;
    if (seen.has(title)) continue;
    seen.add(title);
    mapObjects(bundle.$defs[title] as JsonValue, (node) => {
      if (typeof node.$ref === "string") queue.push(node.$ref.slice(BUNDLE_REF_PREFIX.length));
      return node;
    });
  }
  return seen;
}
