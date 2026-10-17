import { checkConsistency } from "../domain/consistency.ts";
import { bundleOpenApi } from "../domain/openapi-bundle.ts";
import { bundleSchemas } from "../domain/schema-bundle.ts";
import { OPENAPI_DOCUMENTS, payloadSchemas, REGISTRY_DIR, REGISTRY_FILES, type Contracts } from "./load-contracts.ts";
import type { OpenApiLinter, Problems, SchemaValidator } from "./ports.ts";

export interface ValidationReport {
  problems: Problems;
  counts: { schemas: number; operations: number; fixtures: number };
}

const DELIVERY_MODE_SCHEMA = "objects/delivery-mode.json";
const METHODS = new Set(["get", "put", "post", "patch", "delete"]);

/** Lints OpenAPI, compiles every schema, validates registries and fixtures, and checks cross-file rules. */
export async function validateContracts(contracts: Contracts, validator: SchemaValidator, linter: OpenApiLinter): Promise<ValidationReport> {
  const problems: Problems = [];
  problems.push(...(await linter.lint(Object.values(OPENAPI_DOCUMENTS))));
  problems.push(...validator.compile(contracts.schemas));

  for (const [name, file] of Object.entries(REGISTRY_FILES)) {
    const registrySchema = `${REGISTRY_DIR}${name}.schema.json`;
    problems.push(...validator.validate(registrySchema, contracts.rawRegistries[name as keyof typeof REGISTRY_FILES]).map((p) => `${file}: ${p}`));
  }

  for (const fixture of contracts.fixtures) {
    const result = validator.validate(fixture.schema, fixture.data);
    if (fixture.valid && result.length > 0) problems.push(...result.map((p) => `${fixture.file}: ${p}`));
    if (!fixture.valid && result.length === 0) problems.push(`${fixture.file}: expected to be invalid against ${fixture.schema}`);
  }

  const payloads = payloadSchemas(contracts);
  const deliveryModes = payloads.find((s) => s.path === DELIVERY_MODE_SCHEMA)?.schema.enum;
  problems.push(...checkConsistency(contracts.registries, new Set(payloads.map((s) => s.path)), Array.isArray(deliveryModes) ? deliveryModes.map(String) : []));

  try {
    const { bundle, titleByPath } = bundleSchemas(payloads);
    bundleOpenApi(contracts.openapi.public, OPENAPI_DOCUMENTS.public, bundle, titleByPath);
    bundleOpenApi(contracts.openapi.internal, OPENAPI_DOCUMENTS.internal, bundle, titleByPath);
  } catch (error) {
    problems.push(`bundling: ${(error as Error).message}`);
  }

  return { problems, counts: { schemas: contracts.schemas.length, operations: countOperations(contracts), fixtures: contracts.fixtures.length } };
}

function countOperations(contracts: Contracts): number {
  return [contracts.openapi.public, contracts.openapi.internal]
    .flatMap((doc) => Object.values((doc.paths ?? {}) as Record<string, Record<string, unknown>>))
    .reduce((sum, item) => sum + Object.keys(item).filter((m) => METHODS.has(m)).length, 0);
}
