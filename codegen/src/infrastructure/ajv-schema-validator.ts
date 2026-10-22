import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import type { Problems, SchemaValidator } from "../application/ports.ts";
import type { JsonValue } from "../domain/json-schema.ts";
import type { SourceSchema } from "../domain/schema-bundle.ts";

export const SCHEMA_BASE_ID = "https://discordy.voics.nl/contracts/schemas/";

const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => Ajv2020;

/** JSON Schema 2020-12 validation with Ajv in strict mode. */
export class AjvSchemaValidator implements SchemaValidator {
  private readonly ajv = addFormats(new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true }));

  compile(schemas: SourceSchema[]): Problems {
    const problems: Problems = [];
    for (const { path, schema } of schemas) {
      if (schema.$id !== SCHEMA_BASE_ID + path) problems.push(`${path}: $id must be ${SCHEMA_BASE_ID + path}`);
      this.ajv.addSchema(schema as object);
    }
    for (const { path } of schemas) {
      try {
        this.ajv.getSchema(SCHEMA_BASE_ID + path);
      } catch (error) {
        problems.push(`${path}: ${(error as Error).message}`);
      }
    }
    return problems;
  }

  validate(path: string, data: JsonValue): Problems {
    const validate = this.ajv.getSchema(SCHEMA_BASE_ID + path);
    if (!validate) return [`unknown schema ${path}`];
    if (validate(data)) return [];
    return (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? "is invalid"} (${path})`);
  }
}
