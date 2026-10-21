import type { ConstantEntry, ConstantGroup } from "../constant-groups.ts";
import { GENERATED_NOTICE, pascalToSnake, screamingToSnake } from "../naming.ts";

export interface ElixirModuleFile {
  module: string;
  /** File name relative to lib/discordy/contracts/. */
  path: string;
  source: string;
}

/** Elixir style (and credo) wants underscores in integers above 9999. */
const integerLiteral = (value: number | bigint): string => (value > 9999 ? String(value).replace(/\B(?=(\d{3})+$)/g, "_") : String(value));
const literal = (entry: ConstantEntry): string => (typeof entry.value === "string" ? JSON.stringify(entry.value) : integerLiteral(entry.value));
const heredoc = (text: string, indent: string): string => `${indent}@doc ~S"""\n${indent}${text}\n${indent}"""\n`;

function renderModule(group: ConstantGroup): ElixirModuleFile {
  const module = `Discordy.Contracts.${group.name}`;
  const functions = group.entries
    .map((entry) => `${entry.doc ? heredoc(entry.doc, "  ") : ""}  @spec ${screamingToSnake(entry.name)}() :: ${typeof entry.value === "string" ? "String.t()" : "non_neg_integer()"}\n  def ${screamingToSnake(entry.name)}, do: ${literal(entry)}\n`)
    .join("\n");
  const pairs = group.entries.map((entry) => `      ${screamingToSnake(entry.name)}: ${literal(entry)}`).join(",\n");
  // Flag names such as IS_SPOILER mirror the wire constants, so credo's predicate naming rule does not apply.
  const credoNote = group.entries.some((entry) => screamingToSnake(entry.name).startsWith("is_")) ? "# credo:disable-for-this-file Credo.Check.Readability.PredicateFunctionNames\n" : "";
  const source = `# ${GENERATED_NOTICE}
${credoNote}defmodule ${module} do
  @moduledoc ~S"""
  ${group.doc}
  """

${functions}
  @doc "Every entry of this group, keyed by atom."
  @spec entries() :: %{atom() => ${group.type === "str" ? "String.t()" : group.type === "mixed" ? "non_neg_integer() | String.t()" : "non_neg_integer()"}}
  def entries do
    %{
${pairs}
    }
  end

  @doc "Looks up an entry by atom name."
  @spec fetch(atom()) :: {:ok, term()} | :error
  def fetch(name) when is_atom(name), do: Map.fetch(entries(), name)
end
`;
  return { module, path: `${pascalToSnake(group.name)}.ex`, source };
}

export function renderElixirConstants(groups: ConstantGroup[]): ElixirModuleFile[] {
  return groups.map(renderModule);
}
