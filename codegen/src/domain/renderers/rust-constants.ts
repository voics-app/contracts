import type { ConstantEntry, ConstantGroup } from "../constant-groups.ts";
import { GENERATED_NOTICE, pascalToSnake } from "../naming.ts";

function rustType(group: ConstantGroup, entry: ConstantEntry): string {
  if (group.type !== "mixed") return group.type === "str" ? "&str" : group.type;
  return typeof entry.value === "string" ? "&str" : "u64";
}

function literal(entry: ConstantEntry): string {
  if (entry.bit !== undefined) return `1 << ${entry.bit}`;
  return typeof entry.value === "string" ? JSON.stringify(entry.value) : String(entry.value);
}

const docLines = (doc: string | undefined, indent: string): string => (doc ? `${indent}/// ${doc}\n` : "");

function renderGroup(group: ConstantGroup): string {
  const consts = group.entries.map((entry) => `${docLines(entry.doc, "    ")}    pub const ${entry.name}: ${rustType(group, entry)} = ${literal(entry)};`).join("\n");
  const listing =
    group.type === "mixed"
      ? ""
      : `\n\n    /// Every entry of this group as (name, value).\n    pub const ALL_ENTRIES: &[(&str, ${rustType(group, group.entries[0] as ConstantEntry)})] = &[${group.entries.map((e) => `("${e.name}", ${e.name})`).join(", ")}];`;
  return `${docLines(group.doc, "")}pub mod ${pascalToSnake(group.name)} {\n${consts}${listing}\n}\n`;
}

export function renderRustConstants(groups: ConstantGroup[]): string {
  return `// ${GENERATED_NOTICE}\n\n${groups.map(renderGroup).join("\n")}`;
}
