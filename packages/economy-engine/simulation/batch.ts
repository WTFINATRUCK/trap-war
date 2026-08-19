import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";
import type { AgentName } from "./agents.js";
import type { CalibrationReport } from "./calibration.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const agents = (argument("--agents")?.split(",").filter(Boolean) ?? []) as AgentName[];
const runs = Number(argument("--runs") ?? 10_000);
const outputDirectory = resolve(argument("--output-dir") ?? "simulation/calibration-results/m5.6-batch");
const output = resolve(argument("--output") ?? `${outputDirectory}/combined.json`);
const workers = Math.max(1, Number(argument("--workers") ?? 4));
if (agents.length === 0 || !Number.isSafeInteger(runs) || runs <= 0) {
  throw new Error("Usage: batch.ts --agents a,b --runs 10000 --output-dir path --output report.json [--workers 4]");
}

mkdirSync(outputDirectory, { recursive: true });
const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");
const cli = resolve(import.meta.dirname, "cli.ts");
const startedAt = performance.now();
let nextIndex = 0;

async function runWorker(): Promise<void> {
  while (nextIndex < agents.length) {
    const agent = agents[nextIndex++]!;
    const agentOutput = resolve(outputDirectory, `${agent}.json`);
    await new Promise<void>((done, reject) => {
      const child = spawn(process.execPath, [tsxCli, cli, "--runs", String(runs), "--agents", agent, "--output", agentOutput, "--quiet"], {
        cwd: resolve(import.meta.dirname, ".."),
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => { stderr += chunk; });
      child.on("error", reject);
      child.on("exit", (code) => code === 0 ? done() : reject(new Error(`${agent} exited ${code}: ${stderr}`)));
    });
  }
}

await Promise.all(Array.from({ length: Math.min(workers, agents.length) }, () => runWorker()));
const reports = agents.map((agent) => JSON.parse(readFileSync(resolve(outputDirectory, `${agent}.json`), "utf8")) as CalibrationReport);
const combined: CalibrationReport = {
  generatedAt: new Date().toISOString(),
  versions: reports[0]!.versions,
  runsPerAgent: runs,
  totalRuns: reports.reduce((sum, report) => sum + report.totalRuns, 0),
  agents: reports.flatMap((report) => report.agents),
};
writeFileSync(output, `${JSON.stringify(combined, null, 2)}\n`, "utf8");
writeFileSync(resolve(outputDirectory, "batch-performance.json"), `${JSON.stringify({
  agents,
  runsPerAgent: runs,
  workers: Math.min(workers, agents.length),
  wallDurationMs: Math.round((performance.now() - startedAt) * 100) / 100,
  output: basename(output),
}, null, 2)}\n`, "utf8");
