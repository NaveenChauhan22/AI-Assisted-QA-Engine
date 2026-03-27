import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { type ParsedResults } from "../types/contracts";

const projectRoot = path.resolve(__dirname, "..");
const resultsPath = path.join(projectRoot, "reports", "results.json");
const htmlReportPath = path.join(projectRoot, "reports", "summary.html");

async function readResults(): Promise<ParsedResults> {
  const content = await readFile(resultsPath, "utf-8");
  return JSON.parse(content) as ParsedResults;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtmlSummary(results: ParsedResults): string {
  const passRate = results.total === 0 ? 0 : Math.round((results.passed / results.total) * 100);
  const decisionColor = results.releaseDecision === "GO" ? "#1f7a1f" : "#9f1d1d";
  const decisionBg = results.releaseDecision === "GO" ? "#e9f8ea" : "#fdecec";
  const failureItems = results.failures.length === 0
    ? `<p class="empty">No failures were detected.</p>`
    : `<ul class="failures">${results.failures.map((failure) => `
        <li>
          <strong>${escapeHtml(failure.test)}</strong>
          <div class="meta">Priority: ${escapeHtml(failure.priority ?? "unknown")}</div>
          <div class="meta">Location: ${escapeHtml(
            failure.file && failure.line
              ? `${failure.file}:${failure.line}:${failure.column ?? 1}`
              : failure.file ?? "unknown"
          )}</div>
          <div class="reason">${escapeHtml(failure.reason)}</div>
        </li>
      `).join("")}</ul>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Execution Summary</title>
  <style>
    :root {
      --bg: #f6f4ef;
      --card: #fffdf8;
      --text: #1d1d1b;
      --muted: #5b5b57;
      --border: #ddd8ca;
      --accent: #2456d3;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background: linear-gradient(180deg, #f6f4ef 0%, #ece7dc 100%);
      color: var(--text);
    }
    .wrap {
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }
    .hero, .section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 24px;
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.05);
    }
    .hero { margin-bottom: 20px; }
    .decision {
      display: inline-block;
      padding: 8px 14px;
      border-radius: 999px;
      font-weight: 700;
      color: ${decisionColor};
      background: ${decisionBg};
      border: 1px solid ${decisionColor}33;
      letter-spacing: 0.04em;
    }
    h1, h2 {
      margin: 0 0 12px;
      font-weight: 700;
    }
    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-top: 20px;
    }
    .stat {
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      background: #fff;
    }
    .label {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .value {
      font-size: 28px;
      font-weight: 700;
    }
    .section { margin-top: 20px; }
    .failures {
      margin: 0;
      padding-left: 20px;
    }
    .failures li {
      margin-bottom: 14px;
    }
    .meta, .reason {
      color: var(--muted);
      margin-top: 4px;
    }
    .empty {
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="decision">Release Decision: ${escapeHtml(results.releaseDecision)}</div>
      <h1>Execution Summary</h1>
      <p>${escapeHtml(results.releaseDecisionReason)}</p>
      <div class="stats">
        <div class="stat"><div class="label">Total Tests</div><div class="value">${results.total}</div></div>
        <div class="stat"><div class="label">Passed</div><div class="value">${results.passed}</div></div>
        <div class="stat"><div class="label">Failed</div><div class="value">${results.failed}</div></div>
        <div class="stat"><div class="label">Pass Rate</div><div class="value">${passRate}%</div></div>
        <div class="stat"><div class="label">High Priority Total</div><div class="value">${results.highPriorityTotal}</div></div>
        <div class="stat"><div class="label">High Priority Failed</div><div class="value">${results.highPriorityFailed}</div></div>
      </div>
    </section>
    <section class="section">
      <h2>Failures</h2>
      ${failureItems}
    </section>
  </div>
</body>
</html>
`;
}

async function main(): Promise<void> {
  const results = await readResults();
  const htmlContent = buildHtmlSummary(results);

  await writeFile(htmlReportPath, htmlContent, "utf-8");

  console.log(JSON.stringify({
    html: path.relative(projectRoot, htmlReportPath)
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown report generation error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
