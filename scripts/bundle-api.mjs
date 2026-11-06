// Bundles the Fastify API into a single CommonJS file that the Vercel functions in api/v1 load.
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["serverless/api-v1-entry.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "api/v1/api-v1-bundle.cjs",
  logLevel: "info",
});
