import type { Contracts } from "../application/load-contracts.ts";
import type { ValidationReport } from "../application/validate-contracts.ts";

export type Command = "validate" | "codegen";

export interface CliActions {
  load(): Promise<Contracts>;
  validate(contracts: Contracts): Promise<ValidationReport>;
  generate(contracts: Contracts): Promise<Map<string, number>>;
}

export function parseCommand(argv: string[]): Command {
  const [command] = argv;
  if (command === "validate" || command === "codegen") return command;
  throw new Error(`Usage: main.ts <validate|codegen> (got "${command ?? ""}")`);
}

/** Runs a command and returns the process exit code. `codegen` validates first and refuses invalid sources. */
export async function runCli(argv: string[], actions: CliActions, log: (line: string) => void): Promise<number> {
  const command = parseCommand(argv);
  const contracts = await actions.load();
  const report = await actions.validate(contracts);
  if (report.problems.length > 0) {
    report.problems.forEach((problem) => log(`✗ ${problem}`));
    log(`Validation failed with ${report.problems.length} problem(s).`);
    return 1;
  }
  log(`✓ ${report.counts.schemas} schemas, ${report.counts.operations} operations and ${report.counts.fixtures} fixtures are valid.`);
  if (command === "validate") return 0;

  const written = await actions.generate(contracts);
  for (const [dir, count] of written) log(`✓ ${dir}: ${count} file(s)`);
  return 0;
}
