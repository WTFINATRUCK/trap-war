import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BASELINE_AGENT_NAMES, type AgentName } from "./agents.js";
import { runCalibration } from "./calibration.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const runs = Number(argument("--runs") ?? 1_000);
const output = argument("--output");
const quiet = process.argv.includes("--quiet");
const agents = (argument("--agents")?.split(",") ?? BASELINE_AGENT_NAMES) as AgentName[];
const report = runCalibration(agents, runs);
const json = `${JSON.stringify(report, null, 2)}\n`;
if (output) writeFileSync(resolve(output), json, "utf8");
if (!quiet) process.stdout.write(json);
