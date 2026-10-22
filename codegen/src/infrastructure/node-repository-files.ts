import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { RepositoryFiles } from "../application/ports.ts";
import type { JsonValue } from "../domain/json-schema.ts";

/** RepositoryFiles backed by the local file system, rooted at the repository directory. */
export class NodeRepositoryFiles implements RepositoryFiles {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async readJson(file: string): Promise<JsonValue> {
    return JSON.parse(await readFile(this.resolve(file), "utf8")) as JsonValue;
  }

  async readYaml(file: string): Promise<JsonValue> {
    return YAML.parse(await readFile(this.resolve(file), "utf8")) as JsonValue;
  }

  async list(dir: string, extension: string): Promise<string[]> {
    const entries = await readdir(this.resolve(dir), { recursive: true, withFileTypes: true }).catch(() => []);
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => path.relative(this.root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
      .sort();
  }

  async replaceDirectory(dir: string, files: Map<string, string>): Promise<void> {
    await rm(this.resolve(dir), { recursive: true, force: true });
    for (const [file, content] of files) await this.write(`${dir}/${file}`, content);
  }

  async write(file: string, content: string): Promise<void> {
    const target = this.resolve(file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }

  private resolve(file: string): string {
    return path.join(this.root, file);
  }
}
