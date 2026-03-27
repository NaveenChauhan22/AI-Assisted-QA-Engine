import { readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(__dirname, "..");
const seedPath = path.join(projectRoot, "input", "seed.json");
const urlsPath = path.join(projectRoot, "input", "urls.json");
const discoveredPagesPath = path.join(projectRoot, "reports", "discovered-pages.json");
const resultsPath = path.join(projectRoot, "reports", "results.json");
const manualTestsJsonPath = path.join(projectRoot, "tests", "manual", "manual-testcases.json");
const manualTestsExcelPath = path.join(projectRoot, "tests", "manual", "manual-testcases.xlsx");
const automatedTestsDir = path.join(projectRoot, "tests", "automated");

const defaultSeed = {
  seedUrl: "https://example.com/",
  browserMode: "auto",
  maxUrls: 15,
  excludePathKeywords: [
    "login",
    "signin",
    "signup",
    "cart",
    "checkout",
    "order",
    "orders",
    "account",
    "profile",
    "wishlist",
    "help",
    "contact",
    "support",
    "faq",
    "privacy",
    "terms",
    "policy",
    "giftcard"
  ]
};

async function removeGeneratedSpecs(): Promise<void> {
  const entries = await readdir(automatedTestsDir, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (entry.name === ".gitkeep") {
      continue;
    }

    await rm(path.join(automatedTestsDir, entry.name), {
      recursive: true,
      force: true
    });
  }
}

async function main(): Promise<void> {
  await writeFile(seedPath, `${JSON.stringify(defaultSeed, null, 2)}\n`, "utf-8");
  await writeFile(urlsPath, `${JSON.stringify({ mode: "urls", urls: [] }, null, 2)}\n`, "utf-8");
  await writeFile(discoveredPagesPath, `${JSON.stringify({ seedUrl: "", total: 0, pages: [] }, null, 2)}\n`, "utf-8");
  await writeFile(resultsPath, `${JSON.stringify({ total: 0, passed: 0, failed: 0, failures: [] }, null, 2)}\n`, "utf-8");
  await writeFile(manualTestsJsonPath, `${JSON.stringify({
    seedUrl: "",
    generatedAt: "",
    generationMode: "template",
    total: 0,
    tests: []
  }, null, 2)}\n`, "utf-8");
  await rm(manualTestsExcelPath, { force: true });
  await removeGeneratedSpecs();

  console.log(JSON.stringify({
    reset: true,
    outputs: {
      seed: path.relative(projectRoot, seedPath),
      urls: path.relative(projectRoot, urlsPath),
      manualTests: path.relative(projectRoot, manualTestsJsonPath),
      automatedTestsDir: path.relative(projectRoot, automatedTestsDir)
    }
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown reset error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
