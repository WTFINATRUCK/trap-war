import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CalibrationReport } from "./calibration.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputs = argument("--inputs")?.split(",").filter(Boolean) ?? [];
const output = argument("--output");
if (inputs.length === 0 || !output) {
  throw new Error("Usage: combine.ts --inputs first.json,second.json --output combined.json");
}

const reports = inputs.map((input) =>
  JSON.parse(readFileSync(resolve(input), "utf8")) as CalibrationReport,
);
const versions = JSON.stringify(reports[0]!.versions);
if (reports.some((report) => JSON.stringify(report.versions) !== versions)) {
  throw new Error("Cannot combine reports with different version identifiers");
}

const agents = reports.flatMap((report) => report.agents);
const names = new Set<string>();
for (const agent of agents) {
  if (names.has(agent.agent)) throw new Error(`Duplicate agent report: ${agent.agent}`);
  names.add(agent.agent);
}

const combined: CalibrationReport = {
  generatedAt: new Date().toISOString(),
  versions: reports[0]!.versions,
  runsPerAgent: reports.every((report) => report.runsPerAgent === reports[0]!.runsPerAgent)
    ? reports[0]!.runsPerAgent
    : 0,
  totalRuns: agents.reduce((sum, agent) => sum + agent.runs, 0),
  agents,
};
writeFileSync(resolve(output), `${JSON.stringify(combined, null, 2)}\n`, "utf8");
