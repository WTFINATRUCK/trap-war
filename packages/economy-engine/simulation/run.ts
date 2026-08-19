import { BASELINE_AGENT_NAMES } from "./agents.js";
import {
  runCalibration,
  type AgentCalibrationReport,
  type CalibrationReport,
  type FullDistribution,
} from "./calibration.js";

export type Distribution = FullDistribution;
export type AgentSimulationReport = AgentCalibrationReport;
export type SimulationReport = CalibrationReport;

export function runSimulation(runsPerAgent = 1_000): SimulationReport {
  return runCalibration(BASELINE_AGENT_NAMES, runsPerAgent);
}
