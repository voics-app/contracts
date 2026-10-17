import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RustTypeGenerator, SourceFormatter } from "../application/ports.ts";
import type { SchemaBundle } from "../domain/schema-bundle.ts";
import { runChecked } from "./process.ts";

/** Generates Rust types with typify via the `discordy-contracts-typify` workspace binary. */
export class CargoTypifyGenerator implements RustTypeGenerator {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async fromSchemaBundle(bundle: SchemaBundle): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), "discordy-typify-"));
    try {
      const input = path.join(dir, "bundle.json");
      const output = path.join(dir, "types.rs");
      await writeFile(input, JSON.stringify(bundle));
      await runChecked("cargo", ["run", "--quiet", "--locked", "-p", "discordy-contracts-typify", "--", input, output], this.root);
      return await readFile(output, "utf8");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

/** Canonicalises generated sources with rustfmt and mix format. */
export class ToolchainFormatter implements SourceFormatter {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async formatRust(): Promise<void> {
    await runChecked("cargo", ["fmt", "-p", "discordy-contracts"], this.root);
  }

  async formatElixir(): Promise<void> {
    await runChecked("mix", ["format"], path.join(this.root, "packages/elixir"));
  }
}
