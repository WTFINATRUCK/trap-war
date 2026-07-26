import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["bot/webhook-entry.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "api/bot-bundle.cjs",
  sourcemap: false,
  logLevel: "info",
});

console.log("Bundled bot → api/bot-bundle.cjs");
