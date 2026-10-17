import type { JsonSchema, JsonValue } from "../domain/json-schema.ts";
import type { OpenApiDocument } from "../domain/openapi-bundle.ts";
import type { IntentsRegistry, PermissionsRegistry, ProtocolRegistry, Registries } from "../domain/registry.ts";
import type { SourceSchema } from "../domain/schema-bundle.ts";
import type { RepositoryFiles } from "./ports.ts";

export const SCHEMAS_DIR = "schemas/";
export const REGISTRY_DIR = "registry/";
export const OPENAPI_DOCUMENTS = { public: "openapi/discordy.yaml", internal: "openapi/internal.yaml" } as const;
export const REGISTRY_FILES = { permissions: "permissions.json", intents: "intents.json", protocol: "protocol.json" } as const;

export interface Fixture {
  file: string;
  schema: string;
  valid: boolean;
  data: JsonValue;
}

export interface Contracts {
  /** Every schema under schemas/, including the registry schemas. */
  schemas: SourceSchema[];
  registries: Registries;
  rawRegistries: Record<keyof typeof REGISTRY_FILES, JsonValue>;
  openapi: { public: OpenApiDocument; internal: OpenApiDocument };
  fixtures: Fixture[];
}

/** Schemas that describe protocol payloads (everything except the registry schemas). */
export function payloadSchemas(contracts: Contracts): SourceSchema[] {
  return contracts.schemas.filter((s) => !s.path.startsWith(REGISTRY_DIR));
}

export async function loadContracts(files: RepositoryFiles): Promise<Contracts> {
  const schemaFiles = await files.list(SCHEMAS_DIR, ".json");
  const schemas = await Promise.all(
    schemaFiles.map(async (file) => ({ path: file.slice(SCHEMAS_DIR.length), schema: (await files.readJson(file)) as JsonSchema })),
  );
  const [permissions, intents, protocol] = await Promise.all([
    files.readJson(REGISTRY_FILES.permissions),
    files.readJson(REGISTRY_FILES.intents),
    files.readJson(REGISTRY_FILES.protocol),
  ]);
  const fixtureFiles = await files.list("fixtures/", ".json");
  const fixtures = await Promise.all(
    fixtureFiles.map(async (file) => {
      const raw = (await files.readJson(file)) as { schema: string; valid?: boolean; data: JsonValue };
      return { file, schema: raw.schema, valid: raw.valid ?? true, data: raw.data };
    }),
  );
  return {
    schemas,
    registries: {
      permissions: permissions as unknown as PermissionsRegistry,
      intents: intents as unknown as IntentsRegistry,
      protocol: protocol as unknown as ProtocolRegistry,
    },
    rawRegistries: { permissions, intents, protocol },
    openapi: {
      public: (await files.readYaml(OPENAPI_DOCUMENTS.public)) as OpenApiDocument,
      internal: (await files.readYaml(OPENAPI_DOCUMENTS.internal)) as OpenApiDocument,
    },
    fixtures,
  };
}
