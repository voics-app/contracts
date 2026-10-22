import type { JsonValue } from "../domain/json-schema.ts";
import type { SchemaBundle, SourceSchema } from "../domain/schema-bundle.ts";

/** Repository files, addressed by paths relative to the repository root with forward slashes. */
export interface RepositoryFiles {
  readJson(path: string): Promise<JsonValue>;
  readYaml(path: string): Promise<JsonValue>;
  /** Lists files under `dir` (recursively) with the given extension, sorted. */
  list(dir: string, extension: string): Promise<string[]>;
  /** Replaces the whole content of `dir` with `files` (paths relative to `dir`). */
  replaceDirectory(dir: string, files: Map<string, string>): Promise<void>;
  write(path: string, content: string): Promise<void>;
}

/** Problems found by a validator, as human-readable messages. An empty list means valid. */
export type Problems = string[];

export interface SchemaValidator {
  /** Compiles every schema (strict mode) and reports compilation errors. */
  compile(schemas: SourceSchema[]): Problems;
  /** Validates `data` against the compiled schema at `path` (relative to schemas/). */
  validate(path: string, data: JsonValue): Problems;
}

export interface OpenApiLinter {
  lint(documentPaths: string[]): Promise<Problems>;
}

export interface TypeScriptGenerator {
  fromSchemaBundle(bundle: SchemaBundle): Promise<string>;
  fromOpenApi(document: Record<string, JsonValue>): Promise<string>;
}

export interface RustTypeGenerator {
  fromSchemaBundle(bundle: SchemaBundle): Promise<string>;
}

/** Runs the language formatters over the generated packages so output is canonical. */
export interface SourceFormatter {
  formatRust(): Promise<void>;
  formatElixir(): Promise<void>;
}
