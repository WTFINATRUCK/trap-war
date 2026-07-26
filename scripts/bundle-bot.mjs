import * as esbuild from "esbuild";
import fs from "fs";

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

await esbuild.build({
  entryPoints: ["bot/public-api-entry.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "api/public-api-bundle.cjs",
  sourcemap: false,
  logLevel: "info",
});

for (const dir of ["api/telegram", "api/setup-webhook"]) {
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync("api/bot-bundle.cjs", `${dir}/bot-bundle.cjs`);
}
console.log("Bundled bot → api/bot-bundle.cjs + public-api-bundle.cjs + function dirs");
