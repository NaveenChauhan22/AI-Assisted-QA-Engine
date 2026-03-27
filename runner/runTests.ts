import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = path.resolve(__dirname, "..");
const reportsDir = path.join(projectRoot, "reports");

type RunMode = "headless" | "headed";

function runPlaywright(mode: RunMode): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["playwright", "test", "tests/automated/approved.spec.ts"],
      {
        cwd: projectRoot,
        stdio: "inherit",
        env: {
          ...process.env,
          PLAYWRIGHT_HEADLESS: mode === "headless" ? "true" : "false"
        }
      }
    );

    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<void> {
  await mkdir(reportsDir, { recursive: true });

  const preferredMode = (process.env.PLAYWRIGHT_RUN_MODE === "headless" ? "headless" : "headed") as RunMode;
  const exitCode = await runPlaywright(preferredMode);

  console.log(JSON.stringify({
    runMode: preferredMode,
    exitCode,
    rawResults: path.relative(projectRoot, path.join(reportsDir, "playwright-raw.json"))
  }, null, 2));

  process.exitCode = exitCode;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Playwright runner error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
