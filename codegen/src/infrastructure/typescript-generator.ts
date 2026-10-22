import { compile } from "json-schema-to-typescript";
import openapiTS, { astToString } from "openapi-typescript";
import type { TypeScriptGenerator } from "../application/ports.ts";
import type { JsonValue } from "../domain/json-schema.ts";
import { GENERATED_NOTICE } from "../domain/naming.ts";
import type { SchemaBundle } from "../domain/schema-bundle.ts";

const BANNER = `// ${GENERATED_NOTICE}\n/* eslint-disable */`;
const ROOT_NAME = "DiscordyContractsRoot";

/** Types from JSON Schema (json-schema-to-typescript) and from OpenAPI (openapi-typescript). */
export class NpmTypeScriptGenerator implements TypeScriptGenerator {
  async fromSchemaBundle(bundle: SchemaBundle): Promise<string> {
    const root = { title: ROOT_NAME, type: "object", additionalProperties: false, $defs: withoutRefSiblings(bundle.$defs as JsonValue) };
    const source = await compile(root as never, ROOT_NAME, {
      bannerComment: BANNER,
      additionalProperties: false,
      unreachableDefinitions: true,
      declareExternallyReferenced: true,
      format: true,
      strictIndexSignatures: true,
      style: { singleQuote: false, printWidth: 120 },
    });
    return normalizeDeclarations(source, Object.keys(bundle.$defs));
  }

  async fromOpenApi(document: Record<string, JsonValue>): Promise<string> {
    const ast = await openapiTS(document as never, { alphabetize: true });
    return `${BANNER}\n\n${astToString(ast)}`;
  }
}

/**
 * json-schema-to-typescript always emits the root schema and re-cases identifiers (`E2eeAckPayload` becomes
 * `E2EeAckPayload`). Our root only contains `$defs`, so it is removed, and every declaration gets its schema title back.
 */
function normalizeDeclarations(source: string, titles: string[]): string {
  const withoutRoot = source
    .replace(new RegExp(String.raw`export interface ${ROOT_NAME} \{\}\n\n?`), "")
    .replace(/\n \*\n \* This interface was referenced by `[^`]*`'s JSON-Schema\n \* via the `definition` "[^"]*"\./g, "");
  const declared = [...withoutRoot.matchAll(/^export (?:type|interface) (\w+)/gm)].map((match) => match[1] as string);
  return titles.reduce((text, title) => {
    const generated = declared.find((name) => name.toLowerCase() === title.toLowerCase());
    return generated && generated !== title ? text.replace(new RegExp(String.raw`\b${generated}\b`, "g"), title) : text;
  }, withoutRoot);
}

/**
 * A `$ref` with sibling annotations makes json-schema-to-typescript mint numbered aliases (`Snowflake1`, `Snowflake2`).
 * Dropping the siblings keeps one named type per definition.
 */
function withoutRefSiblings(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(withoutRefSiblings);
  if (typeof value !== "object" || value === null) return value;
  if (typeof value.$ref === "string") return { $ref: value.$ref };
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, withoutRefSiblings(child)]));
}
