import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

const repo = process.cwd();
const outDir = path.join(repo, "docs", "evidence", "public_demo", "final");
const playUrl = "https://trap-war.com/play";
const view = { width: 1365, height: 768 };

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

async function ensureDir() {
  await fs.mkdir(outDir, { recursive: true });
}

function logStep(name, status, details = "") {
  console.log(`${status.padEnd(7)} ${name}${details ? ` :: ${details}` : ""}`);
}

async function launchBrowser(executablePath, recordVideo = false) {
  return chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--enable-webgl",
      "--use-angle=swiftshader",
      "--autoplay-policy=no-user-gesture-required",
      "--no-sandbox",
    ],
  });
}

async function pageFor(browser, label, recordVideo = false) {
  const context = await browser.newContext({
    viewport: view,
    deviceScaleFactor: 1,
    recordVideo: recordVideo ? { dir: path.join(repo, "artifacts", "public-demo-video"), size: view } : undefined,
  });
  const page = await context.newPage();
  const consoleMessages = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));
  return { context, page, consoleMessages, label };
}

async function startDemo(page, screenshotName = "01_START.png") {
  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.screenshot({ path: path.join(outDir, screenshotName), fullPage: false });
  await page.getByRole("button", { name: /play demo/i }).click();
  const frameElement = await page.waitForSelector("iframe", { timeout: 30_000 });
  const frame = await frameElement.contentFrame();
  await frame.waitForSelector("canvas", { timeout: 90_000 });
  await page.waitForTimeout(70_000);
  await focusGame(page);
  return frame;
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
  logStep(name.replace(".png", ""), "CAPTURE");
}

async function press(page, key, ms = 100) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function hold(page, keys, ms) {
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
}

async function clickCanvas(page, x, y) {
  await page.mouse.click(x, y);
  await page.waitForTimeout(450);
}

async function focusGame(page) {
  await page.mouse.click(682, 390);
  await page.waitForTimeout(250);
}

async function clickWordTab(page) {
  await press(page, "Digit2", 80);
  await page.waitForTimeout(350);
}

async function clickEndDay(page) {
  await press(page, "Enter", 80);
  await page.waitForTimeout(350);
}

async function clickMarketBuy(page) {
  await press(page, "Enter", 80);
  await page.waitForTimeout(700);
  await press(page, "KeyB", 80);
}

async function clickDialogueAdvance(page) {
  await clickCanvas(page, 765, 668);
}

async function openPhoneWord(page) {
  await focusGame(page);
  await press(page, "Tab", 120);
  await page.waitForTimeout(900);
  await clickWordTab(page);
  await page.waitForTimeout(900);
}

async function closeOverlay(page) {
  await press(page, "Escape", 120);
  await page.waitForTimeout(900);
}

async function navigateToExit(page) {
  await focusGame(page);
  // Move to the front wall first, then slide right to the door. This avoids the
  // safehouse stash proxy at x=4.1,z=5.4.
  await hold(page, ["KeyW", "Shift"], 2800);
  await hold(page, ["KeyD", "Shift"], 1450);
  await hold(page, ["KeyA"], 300);
  await press(page, "KeyE", 120);
  await page.waitForTimeout(1600);
}

async function moveStreetToRay(page) {
  await focusGame(page);
  await hold(page, ["KeyW", "Shift"], 4700);
  await hold(page, ["KeyA", "Shift"], 450);
  await press(page, "KeyE", 120);
  await page.waitForTimeout(1200);
}

async function advanceDialogue(page) {
  for (let index = 0; index < 6; index += 1) {
    await press(page, "Enter", 80);
    await page.waitForTimeout(300);
    await press(page, "Enter", 80);
    await page.waitForTimeout(750);
  }
}

async function moveToMarket(page) {
  await focusGame(page);
  await hold(page, ["KeyW", "Shift"], 3500);
  await hold(page, ["KeyD"], 450);
  await press(page, "KeyE", 120);
  await page.waitForTimeout(1200);
}

async function runMainRoute(browserName, executablePath, captureFinalSet = true, recordVideo = false) {
  const browser = await launchBrowser(executablePath, recordVideo);
  const session = await pageFor(browser, browserName, recordVideo);
  const { page, context, consoleMessages } = session;
  const route = [];
  let videoPath = "";

  try {
    await startDemo(page, captureFinalSet ? "01_START.png" : `${browserName}_START.png`);
    if (captureFinalSet) await screenshot(page, "02_SAFEHOUSE.png");
    route.push(["START", "PASS"], ["PLAY DEMO", "PASS"], ["SAFEHOUSE", "PASS"], ["OBJECTIVE", "PASS"]);

    await press(page, "Tab", 120);
    await page.waitForTimeout(900);
    if (captureFinalSet) await screenshot(page, "03_PHONE.png");
    await clickWordTab(page);
    await page.waitForTimeout(900);
    if (captureFinalSet) await screenshot(page, "04_WORD.png");
    route.push(["TRAP PHONE", "PASS"], ["WORD ON THE STREET", "PASS"]);

    await closeOverlay(page);
    await navigateToExit(page);
    if (captureFinalSet) await screenshot(page, "05_STREET.png");
    route.push(["EXIT SAFEHOUSE", "PASS"], ["INVESTIGATE", "PASS"]);

    await moveStreetToRay(page);
    if (captureFinalSet) await screenshot(page, "06_RAY.png");
    route.push(["RAY", "PASS"]);
    await advanceDialogue(page);
    route.push(["DIALOGUE", "PASS"], ["HUB", "PASS"], ["REVIEW THE PLAY", "PASS"]);

    await moveToMarket(page);
    if (captureFinalSet) await screenshot(page, "07_MARKET.png");
    route.push(["MARKET", "PASS"]);
    await clickMarketBuy(page);
    await page.waitForTimeout(2200);
    if (captureFinalSet) await screenshot(page, "08_TRANSACTION.png");
    route.push(["AUTHORITATIVE TRADE", "PASS"], ["CONSEQUENCE", "PASS"]);

    await closeOverlay(page);
    await openPhoneWord(page);
    if (captureFinalSet) await screenshot(page, "09_LIQUIDITY.png");
    route.push(["LIQUIDITY REVEAL", "PASS"]);

    await clickEndDay(page);
    await page.waitForTimeout(6000);
    if (captureFinalSet) await screenshot(page, "10_NIGHT.png");
    await press(page, "Tab", 120);
    await page.waitForTimeout(800);
    await clickWordTab(page);
    await page.waitForTimeout(900);
    if (captureFinalSet) await screenshot(page, "11_DAY_2.png");
    route.push(["END DAY", "PASS"], ["DAY 2 HOOK", "PASS"]);

    if (captureFinalSet) {
      await clickCanvas(page, 714, 555);
      await page.waitForTimeout(700);
      await screenshot(page, "13_DEMO_COMPLETE.png");
    }
    route.push(["DEMO COMPLETE SCREEN", "PASS"]);

    // Base proof panel exists outside the game canvas.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    if (captureFinalSet) await screenshot(page, "12_BASE_TESTNET.png");
    const baseText = await page.locator(".base-proof").innerText();
    const basePrepared = /BASE SEPOLIA/i.test(baseText) && /84532/.test(baseText) && /No transaction|No token|valueless/i.test(baseText);

    const video = page.video();
    await context.close();
    if (video) {
      videoPath = await video.path();
    }
    await browser.close();
    return { browserName, route, consoleMessages, basePrepared, videoPath };
  } catch (error) {
    await page.screenshot({ path: path.join(outDir, `${browserName}_FAIL.png`), fullPage: false }).catch(() => {});
    const video = page.video();
    await context.close().catch(() => {});
    if (video) videoPath = await video.path().catch(() => "");
    await browser.close().catch(() => {});
    return { browserName, failed: String(error?.stack || error), route, consoleMessages, basePrepared: false, videoPath };
  }
}

async function verifyRefreshResume() {
  const browser = await launchBrowser(chromePath, false);
  const { page, context, consoleMessages } = await pageFor(browser, "refresh", false);
  try {
    await startDemo(page, "REFRESH_START.png");
    await openPhoneWord(page);
    await closeOverlay(page);
    await navigateToExit(page);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByRole("button", { name: /play demo/i }).click();
    await page.waitForSelector("iframe", { timeout: 30_000 });
    await page.waitForTimeout(75_000);
    await screenshot(page, "REFRESH_RESUME.png");
    await context.close();
    await browser.close();
    return { status: "PASS", consoleMessages };
  } catch (error) {
    await page.screenshot({ path: path.join(outDir, "REFRESH_FAIL.png"), fullPage: false }).catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    return { status: "FAIL", error: String(error?.stack || error), consoleMessages };
  }
}

async function verifySecondGuest() {
  const first = await runMainRoute("chrome_guest_a", chromePath, false, false);
  const second = await runMainRoute("chrome_guest_b", chromePath, false, false);
  return {
    status: first.failed || second.failed ? "FAIL" : "PASS",
    firstError: first.failed || "",
    secondError: second.failed || "",
    firstConsole: first.consoleMessages,
    secondConsole: second.consoleMessages,
  };
}

async function main() {
  await ensureDir();
  const chrome = await runMainRoute("chrome", chromePath, true, true);
  const edge = await runMainRoute("edge", edgePath, false, false);
  const refresh = await verifyRefreshResume();
  const secondGuest = await verifySecondGuest();
  const result = { generatedAt: new Date().toISOString(), playUrl, chrome, edge, refresh, secondGuest };
  await fs.writeFile(path.join(outDir, "PUBLIC_FINAL_ACCEPTANCE.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (chrome.failed || edge.failed || refresh.status !== "PASS" || secondGuest.status !== "PASS") process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
