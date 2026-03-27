import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = path.resolve(__dirname, "..");
const reportsDir = path.join(projectRoot, "reports");

type RunMode = "headless" | "headed";

function runCommand(command: string, args: string[], env?: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      env: env ?? process.env
    });

    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function runPlaywright(mode: RunMode): Promise<number> {
  return runCommand("npx", ["playwright", "test"], {
    ...process.env,
    PLAYWRIGHT_HEADLESS: mode === "headless" ? "true" : "false"
  });
}

async function main(): Promise<void> {
  await mkdir(reportsDir, { recursive: true });

  const preferredMode = (process.env.PLAYWRIGHT_RUN_MODE === "headless" ? "headless" : "headed") as RunMode;
  const executionExitCode = await runPlaywright(preferredMode);
  const parseExitCode = await runCommand("npx", ["ts-node", "utils/parser.ts"]);
  const reportExitCode = await runCommand("npx", ["ts-node", "utils/generateReport.ts"]);
  const exitCode = executionExitCode !== 0 || parseExitCode !== 0 || reportExitCode !== 0 ? 1 : 0;

  console.log(JSON.stringify({
    runMode: preferredMode,
    exitCode,
    executionExitCode,
    parseExitCode,
    reportExitCode,
    rawResults: path.relative(projectRoot, path.join(reportsDir, "playwright-raw.json")),
    parsedResults: path.relative(projectRoot, path.join(reportsDir, "results.json")),
    htmlReport: path.relative(projectRoot, path.join(reportsDir, "summary.html"))
  }, null, 2));

  process.exitCode = exitCode;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Playwright runner error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
