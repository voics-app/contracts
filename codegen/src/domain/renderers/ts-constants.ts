import type { ConstantEntry, ConstantGroup } from "../constant-groups.ts";
import { GENERATED_NOTICE } from "../naming.ts";

function literal(group: ConstantGroup, entry: ConstantEntry): string {
  if (entry.bit !== undefined) return group.type === "u64" ? `1n << ${entry.bit}n` : `1 << ${entry.bit}`;
  if (typeof entry.value === "bigint") return `${entry.value}n`;
  return typeof entry.value === "string" ? JSON.stringify(entry.value) : String(entry.value);
}

const docComment = (doc: string | undefined, indent: string): string => (doc ? `${indent}/** ${doc.replace(/\*\//g, "*\\/")} */\n` : "");

export function renderTsConstants(groups: ConstantGroup[]): string {
  const blocks = groups.map((group) => {
    const body = group.entries.map((entry) => `${docComment(entry.doc, "  ")}  ${entry.name}: ${literal(group, entry)},`).join("\n");
    return `${docComment(group.doc, "")}export const ${group.name} = {\n${body}\n} as const;\nexport type ${group.name}Key = keyof typeof ${group.name};\n`;
  });
  return `// ${GENERATED_NOTICE}\n\n${blocks.join("\n")}`;
}
