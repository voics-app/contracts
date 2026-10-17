import { spawn } from "node:child_process";

export interface ProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs a command to completion, capturing its output. */
export function run(command: string, args: string[], cwd: string): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    // Windows needs a shell to run .bat/.cmd tools (mix, pnpm); pass one pre-quoted command line then.
    const child =
      process.platform === "win32"
        ? spawn([command, ...args].map(quoteForCmd).join(" "), { cwd, shell: true })
        : spawn(command, args, { cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function quoteForCmd(arg: string): string {
  return /[\s"&|<>^]/.test(arg) ? `"${arg.replace(/"/g, '""')}"` : arg;
}

/** Runs a command and throws with its output when it fails. */
export async function runChecked(command: string, args: string[], cwd: string): Promise<string> {
  const result = await run(command, args, cwd);
  if (result.code !== 0) throw new Error(`${command} ${args.join(" ")} failed (${result.code}):\n${result.stderr || result.stdout}`);
  return result.stdout;
}
