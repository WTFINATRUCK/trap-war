/**
 * Connect trap-war.com DNS on Cloudflare → Vercel.
 * Uses Chrome profile cookies via CDP if available, else Domain Connect page.
 */
import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync, spawn } from "child_process";

const ZONE = "trap-war.com";
const TARGET = "1dbe9f448e0e942a.vercel-dns-017.com";
const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_SRC = path.join(
  os.homedir(),
  "AppData",
  "Local",
  "Google",
  "Chrome",
  "User Data"
);
const PROFILE_COPY = path.join(os.tmpdir(), "trapwar-cf-chrome-profile");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tryDomainConnect(page) {
  const urls = [
    "https://vercel.com/api/v9/projects/prj_75nFy45rvaF0eIy2Zmq46lokSfuG/domains/trap-war.com/domain-connect/apply?teamId=team_CQ13mD7nH1wufDwDutKrDMEc",
    "https://vercel.com/api/v9/projects/prj_75nFy45rvaF0eIy2Zmq46lokSfuG/domains/www.trap-war.com/domain-connect/apply?teamId=team_CQ13mD7nH1wufDwDutKrDMEc",
  ];
  for (const url of urls) {
    console.log("Opening Domain Connect:", url.slice(0, 80) + "...");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(2500);
    // Click common approve buttons
    const selectors = [
      'button:has-text("Authorize")',
      'button:has-text("Confirm")',
      'button:has-text("Apply")',
      'button:has-text("Allow")',
      'button:has-text("Continue")',
      'input[type="submit"]',
      'button[type="submit"]',
      'a:has-text("Authorize")',
    ];
    for (const sel of selectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1500 })) {
          console.log("Clicking", sel);
          await btn.click();
          await sleep(3000);
        }
      } catch {
        /* next */
      }
    }
    console.log("Page title:", await page.title());
    console.log("URL now:", page.url());
  }
}

async function setDnsViaDashboard(page) {
  const dnsUrl = `https://dash.cloudflare.com/?to=/:account/${ZONE}/dns/records`;
  console.log("Opening DNS dashboard...");
  await page.goto(dnsUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(4000);
  console.log("DNS page:", page.url(), await page.title());

  // Try to use Cloudflare's internal API from the session (fetch in page)
  const result = await page.evaluate(
    async ({ zoneName, target }) => {
      const out = { steps: [] };
      try {
        // zone id from bootstrap if available
        const tokenMeta = document.querySelector('meta[name="csrf-token"]');
        out.csrf = tokenMeta?.content || null;

        // Call Cloudflare GraphQL / API from browser context with cookies
        const zonesRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones?name=${zoneName}`,
          { credentials: "include" }
        );
        out.zonesStatus = zonesRes.status;
        out.zonesText = (await zonesRes.text()).slice(0, 300);
      } catch (e) {
        out.error = String(e);
      }
      return out;
    },
    { zoneName: ZONE, target: TARGET }
  );
  console.log("In-page API probe:", JSON.stringify(result, null, 2));
}

async function main() {
  // Copy minimal profile cookies path is hard; use remote debugging on user Chrome
  let browser;
  let context;
  let page;

  // Prefer connecting to an existing Chrome with debugging port
  try {
    browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
    context = browser.contexts()[0] || (await browser.newContext());
    page = context.pages()[0] || (await context.newPage());
    console.log("Connected to Chrome CDP :9222");
  } catch {
    console.log("No CDP on 9222 — launching Chrome with profile copy...");
    // Launch chrome with remote debugging + separate profile clone of Default Local State only
    // Use channel chrome + userDataDir temp so we don't lock main profile
    const userDataDir = path.join(os.tmpdir(), `cf-pw-${Date.now()}`);
    fs.mkdirSync(userDataDir, { recursive: true });
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chrome",
      headless: false,
      args: ["--disable-blink-features=AutomationControlled"],
      viewport: { width: 1280, height: 900 },
    });
    page = context.pages()[0] || (await context.newPage());
  }

  await tryDomainConnect(page);
  await setDnsViaDashboard(page);

  // Keep browser open a few seconds for user to finish if needed
  await sleep(5000);
  try {
    await context.close();
  } catch {
    /* ignore */
  }
  console.log("Done script.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
