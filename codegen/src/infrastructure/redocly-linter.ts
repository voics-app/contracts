import path from "node:path";
import type { OpenApiLinter, Problems } from "../application/ports.ts";
import { run } from "./process.ts";

/** Lints OpenAPI documents with the Redocly CLI using the repository's redocly.yaml. */
export class RedoclyLinter implements OpenApiLinter {
  private readonly root: string;
  private readonly cli: string;

  constructor(root: string, cli: string) {
    this.root = root;
    this.cli = cli;
  }

  async lint(documentPaths: string[]): Promise<Problems> {
    const result = await run(process.execPath, [this.cli, "lint", ...documentPaths, "--config", path.join(this.root, "redocly.yaml"), "--format", "stylish", "--max-problems", "200"], this.root);
    const output = `${result.stdout}\n${result.stderr}`;
    const warnings = /You have (\d+) warning/.exec(output);
    if (result.code === 0 && !warnings) return [];
    return [`redocly lint reported problems:\n${output.trim()}`];
  }
}
