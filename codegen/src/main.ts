// Composition root: wires the infrastructure adapters into the use cases and runs the CLI.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateArtifacts } from "./application/generate-artifacts.ts";
import { loadContracts } from "./application/load-contracts.ts";
import { validateContracts } from "./application/validate-contracts.ts";
import { AjvSchemaValidator } from "./infrastructure/ajv-schema-validator.ts";
import { NodeRepositoryFiles } from "./infrastructure/node-repository-files.ts";
import { RedoclyLinter } from "./infrastructure/redocly-linter.ts";
import { CargoTypifyGenerator, ToolchainFormatter } from "./infrastructure/rust-tooling.ts";
import { NpmTypeScriptGenerator } from "./infrastructure/typescript-generator.ts";
import { runCli } from "./interface/cli.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const redoclyCli = createRequire(import.meta.url).resolve("@redocly/cli/bin/cli.js");
const files = new NodeRepositoryFiles(root);

const exitCode = await runCli(
  process.argv.slice(2),
  {
    load: () => loadContracts(files),
    validate: (contracts) => validateContracts(contracts, new AjvSchemaValidator(), new RedoclyLinter(root, redoclyCli)),
    generate: (contracts) =>
      generateArtifacts(contracts, files, {
        typescript: new NpmTypeScriptGenerator(),
        rust: new CargoTypifyGenerator(root),
        formatter: new ToolchainFormatter(root),
      }),
  },
  (line) => console.log(line),
);
process.exitCode = exitCode;
