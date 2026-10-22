import { buildConstantGroups } from "../domain/constant-groups.ts";
import { GENERATED_NOTICE } from "../domain/naming.ts";
import { bundleOpenApi } from "../domain/openapi-bundle.ts";
import { renderElixirConstants } from "../domain/renderers/elixir-constants.ts";
import { renderReferenceDocs } from "../domain/renderers/reference-docs.ts";
import { renderRustConstants } from "../domain/renderers/rust-constants.ts";
import { renderRustEvents } from "../domain/renderers/rust-events.ts";
import { renderTsConstants } from "../domain/renderers/ts-constants.ts";
import { renderTsEvents } from "../domain/renderers/ts-events.ts";
import { bundleSchemas } from "../domain/schema-bundle.ts";
import { OPENAPI_DOCUMENTS, payloadSchemas, REGISTRY_FILES, type Contracts } from "./load-contracts.ts";
import type { RepositoryFiles, RustTypeGenerator, SourceFormatter, TypeScriptGenerator } from "./ports.ts";

export interface Generators {
  typescript: TypeScriptGenerator;
  rust: RustTypeGenerator;
  formatter: SourceFormatter;
}

/** Directories fully owned by codegen; their content is replaced on every run. */
export const GENERATED_DIRECTORIES = {
  dist: "dist",
  tsSource: "packages/ts/src/generated",
  tsSchemas: "packages/ts/schemas",
  rust: "packages/rust/src/generated",
  elixirSource: "packages/elixir/lib/discordy/contracts",
  elixirPriv: "packages/elixir/priv",
  reference: "reference",
} as const;

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/** Generates every derived artifact and writes it into the generated directories. */
export async function generateArtifacts(contracts: Contracts, files: RepositoryFiles, generators: Generators): Promise<Map<string, number>> {
  const { bundle, titleByPath } = bundleSchemas(payloadSchemas(contracts));
  const titleOf = (path: string): string => {
    const title = titleByPath.get(path);
    if (!title) throw new Error(`No schema for ${path}`);
    return title;
  };
  const pathByTitle = new Map([...titleByPath].map(([path, title]) => [title, path]));
  const sourceOf = (title: string): string => pathByTitle.get(title) ?? "";

  const openapi = bundleOpenApi(contracts.openapi.public, OPENAPI_DOCUMENTS.public, bundle, titleByPath);
  const internalOpenapi = bundleOpenApi(contracts.openapi.internal, OPENAPI_DOCUMENTS.internal, bundle, titleByPath);
  const groups = buildConstantGroups(contracts.registries);

  const distributables = new Map<string, string>([
    ["schemas.bundle.json", json(bundle)],
    ["openapi.json", json(openapi)],
    ["internal-openapi.json", json(internalOpenapi)],
    ...Object.entries(REGISTRY_FILES).map(([key, file]) => [file, json(contracts.rawRegistries[key as keyof typeof REGISTRY_FILES])] as [string, string]),
  ]);

  const outputs = new Map<string, Map<string, string>>([
    [GENERATED_DIRECTORIES.dist, distributables],
    [GENERATED_DIRECTORIES.tsSchemas, distributables],
    [GENERATED_DIRECTORIES.elixirPriv, distributables],
    [
      GENERATED_DIRECTORIES.tsSource,
      new Map([
        ["models.ts", await generators.typescript.fromSchemaBundle(bundle)],
        ["openapi.ts", await generators.typescript.fromOpenApi(openapi)],
        ["internal-openapi.ts", await generators.typescript.fromOpenApi(internalOpenapi)],
        ["constants.ts", renderTsConstants(groups)],
        ["events.ts", renderTsEvents(contracts.registries.protocol, titleOf)],
      ]),
    ],
    [
      GENERATED_DIRECTORIES.rust,
      new Map([
        ["mod.rs", `// ${GENERATED_NOTICE}\n\npub mod constants;\npub mod events;\npub mod types;\n`],
        ["types.rs", await generators.rust.fromSchemaBundle(bundle)],
        ["constants.rs", renderRustConstants(groups)],
        ["events.rs", renderRustEvents(contracts.registries.protocol, titleOf)],
      ]),
    ],
    [GENERATED_DIRECTORIES.elixirSource, new Map(renderElixirConstants(groups).map((f) => [f.path, f.source]))],
    [GENERATED_DIRECTORIES.reference, new Map(Object.entries(renderReferenceDocs({ registries: contracts.registries, bundle, titleOf, sourceOf, openapi })))],
  ]);

  const written = new Map<string, number>();
  for (const [dir, content] of outputs) {
    await files.replaceDirectory(dir, content);
    written.set(dir, content.size);
  }
  await generators.formatter.formatRust();
  await generators.formatter.formatElixir();
  return written;
}
