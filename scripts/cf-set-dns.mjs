/**
 * Set trap-war.com DNS → Vercel using Cloudflare dashboard session (Chrome CDP).
 * 1) Starts/connects Chrome with remote debugging
 * 2) User must already be logged into Cloudflare in that browser
 * 3) Uses in-page fetch with session cookies + dashboard API
 */
import { chromium } from "playwright-core";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ZONE_NAME = "trap-war.com";
const ZONE_ID = "8e380c446ee65e5edb008b12b2cce276";
const ACCOUNT = "fd161c015ee2ed0e503dd654141d012b";
const VERCEL_CNAME = "1dbe9f448e0e942a.vercel-dns-017.com";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = "http://127.0.0.1:9222";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureChrome() {
  try {
    const res = await fetch(`${CDP}/json/version`);
    if (res.ok) return;
  } catch {
    /* start */
  }
  const userDataDir = path.join(os.tmpdir(), "trapwar-cf-dns-chrome");
  fs.mkdirSync(userDataDir, { recursive: true });
  spawn(
    CHROME,
    [
      `--remote-debugging-port=9222`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      `https://dash.cloudflare.com/${ACCOUNT}/${ZONE_NAME}/dns/records`,
    ],
    { detached: true, stdio: "ignore" }
  ).unref();
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${CDP}/json/version`);
      if (res.ok) return;
    } catch {
      /* wait */
    }
    await sleep(500);
  }
  throw new Error("Chrome CDP did not start");
}

async function main() {
  await ensureChrome();
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || (await context.newPage());

  console.log("Navigating to Cloudflare DNS...");
  await page.goto(`https://dash.cloudflare.com/${ACCOUNT}/${ZONE_NAME}/dns/records`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await sleep(3000);
  console.log("URL:", page.url());
  console.log("Title:", await page.title());

  // Extract any tokens from page / localStorage / cookies
  const session = await page.evaluate(() => {
    const cookies = document.cookie;
    const ls = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        ls[k] = localStorage.getItem(k)?.slice(0, 80);
      }
    } catch {
      /* */
    }
    return { cookies: cookies.slice(0, 200), lsKeys: Object.keys(ls), href: location.href };
  });
  console.log("Session probe:", JSON.stringify(session, null, 2));

  // Cloudflare dashboard uses cookie auth for graphql at dash.cloudflare.com/api
  const apiResult = await page.evaluate(
    async ({ zoneId, target, zoneName }) => {
      const log = [];
      async function cf(path, opts = {}) {
        const res = await fetch(`https://dash.cloudflare.com/api/v4${path}`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(opts.headers || {}),
          },
          ...opts,
        });
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          json = { raw: text.slice(0, 400) };
        }
        return { status: res.status, json };
      }

      // List records
      const list = await cf(`/zones/${zoneId}/dns_records?per_page=100`);
      log.push({ listStatus: list.status, success: list.json?.success, err: list.json?.errors });

      if (!list.json?.success) {
        // try client API host
        const list2 = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100`,
          { credentials: "include" }
        );
        const t = await list2.text();
        log.push({ list2: list2.status, body: t.slice(0, 300) });
        return { log, failed: true };
      }

      const records = list.json.result || [];
      log.push({
        records: records.map((r) => `${r.type} ${r.name} -> ${r.content} proxied=${r.proxied}`),
      });

      // Delete conflicting A/AAAA/CNAME on apex and www
      const apex = zoneName;
      const www = `www.${zoneName}`;
      for (const r of records) {
        const isApex = r.name === apex && ["A", "AAAA", "CNAME"].includes(r.type);
        const isWww = r.name === www && ["A", "AAAA", "CNAME"].includes(r.type);
        if (isApex || isWww) {
          const del = await cf(`/zones/${zoneId}/dns_records/${r.id}`, { method: "DELETE" });
          log.push({ deleted: `${r.type} ${r.name}`, ok: del.json?.success, status: del.status });
        }
      }

      // Create CNAME @ and www → Vercel (proxied false)
      for (const name of ["@", "www"]) {
        const body = {
          type: "CNAME",
          name,
          content: target,
          proxied: false,
          ttl: 1,
        };
        const created = await cf(`/zones/${zoneId}/dns_records`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        log.push({
          create: name,
          ok: created.json?.success,
          status: created.status,
          err: created.json?.errors,
          result: created.json?.result
            ? `${created.json.result.type} ${created.json.result.name} -> ${created.json.result.content}`
            : null,
        });
      }

      return { log, failed: false };
    },
    { zoneId: ZONE_ID, target: VERCEL_CNAME, zoneName: ZONE_NAME }
  );

  console.log("API result:", JSON.stringify(apiResult, null, 2));

  // Domain Connect fallback in same browser
  for (const kind of ["trap-war.com", "www.trap-war.com"]) {
    const url = `https://vercel.com/api/v9/projects/prj_75nFy45rvaF0eIy2Zmq46lokSfuG/domains/${kind}/domain-connect/apply?teamId=team_CQ13mD7nH1wufDwDutKrDMEc`;
    console.log("Domain Connect:", kind);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(2000);
    for (const text of ["Authorize", "Confirm", "Apply", "Allow", "Continue", "Approve"]) {
      try {
        const btn = page.getByRole("button", { name: new RegExp(text, "i") }).first();
        if (await btn.isVisible({ timeout: 1000 })) {
          await btn.click();
          console.log("Clicked", text);
          await sleep(2500);
        }
      } catch {
        /* */
      }
    }
    // also try links
    try {
      const link = page.getByRole("link", { name: /authorize|continue|cloudflare/i }).first();
      if (await link.isVisible({ timeout: 1000 })) {
        await link.click();
        await sleep(3000);
      }
    } catch {
      /* */
    }
    console.log("Now at", page.url());
  }

  console.log("Script finished — browser left open for inspection.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
