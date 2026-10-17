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
    const root = { title: ROOT_NAME, $defs: bundle.$defs };
    const source = await compile(root as never, ROOT_NAME, {
      bannerComment: BANNER,
      additionalProperties: false,
      unreachableDefinitions: true,
      declareExternallyReferenced: true,
      format: true,
      strictIndexSignatures: true,
      style: { singleQuote: false, printWidth: 120 },
    });
    return removeRootDeclaration(source);
  }

  async fromOpenApi(document: Record<string, JsonValue>): Promise<string> {
    const ast = await openapiTS(document as never, { alphabetize: true });
    return `${BANNER}\n\n${astToString(ast)}`;
  }
}

/** json-schema-to-typescript always emits the root schema; ours is only a container for $defs. */
function removeRootDeclaration(source: string): string {
  return source.replace(new RegExp(`export (interface|type) ${ROOT_NAME}[^\\n]*\\n(?:[^\\n]*\\n)*?(?:\\}|[^\\n]*;)\\n\\n?`), "");
}
