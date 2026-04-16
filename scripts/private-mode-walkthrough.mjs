import { chromium, devices } from "playwright";

const baseUrl = "http://localhost:3000";
const artifactsDir = "/opt/cursor/artifacts";
const videoName = "private_mode_responsive_walkthrough.mp4";
const offScreenshot = `${artifactsDir}/private_mode_off_normal_media.png`;
const onScreenshot = `${artifactsDir}/private_mode_on_safe_media.png`;
const mobileScreenshot = `${artifactsDir}/private_mode_mobile_layout.png`;
const tempVideoDir = "/tmp/playwright-private-mode-video";

async function ensureSearchResults(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await setPrivateMode(page, false);
  const searchInput = page.getByPlaceholder("作品名・女優名で検索");
  await searchInput.fill("");
  await page.getByRole("button", { name: "検索" }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "VR", exact: true }).first().click();
  await page.waitForTimeout(1500);
  const cardThumb = page.locator("article").first();
  await cardThumb.waitFor({ state: "visible", timeout: 10000 });
}

async function setPrivateMode(page, enabled) {
  const toggle = page.getByRole("button", { name: "プライベートモード切り替え" });
  const label = enabled ? "プライベートモード: ON" : "プライベートモード: OFF";
  const currentText = await toggle.innerText();
  if (!currentText.includes(label)) {
    await toggle.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
  }
}

async function openFirstDetail(page) {
  const detailLinks = page.locator('a[href^="/items/"]');
  const count = await detailLinks.count();
  if (count === 0) {
    throw new Error("No item detail link found");
  }
  await detailLinks.first().click();
  await page.waitForLoadState("domcontentloaded");
}

async function captureDesktopFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: tempVideoDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  await ensureSearchResults(page);
  await setPrivateMode(page, false);
  await page.waitForTimeout(600);
  await page.screenshot({ path: offScreenshot, fullPage: true });

  await setPrivateMode(page, true);
  await page.waitForTimeout(800);
  await page.screenshot({ path: onScreenshot, fullPage: true });

  await openFirstDetail(page);
  await page.waitForTimeout(1000);
  await page.getByText("← 検索に戻る").waitFor({ timeout: 5000 });
  const hiddenVideoMessage = page.getByText("プライベートモード中のためサンプル動画は非表示です。");
  if ((await hiddenVideoMessage.count()) > 0) {
    await hiddenVideoMessage.first().waitFor({ timeout: 5000 });
  }

  await context.close();
  await browser.close();
}

async function captureMobileShot() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: mobileScreenshot, fullPage: true });
  await context.close();
  await browser.close();
}

async function moveVideo() {
  const { readdirSync, renameSync } = await import("node:fs");
  const { join } = await import("node:path");
  const files = readdirSync(tempVideoDir).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) {
    throw new Error("Playwright video not found");
  }
  const latest = files.sort().at(-1);
  renameSync(join(tempVideoDir, latest), `${artifactsDir}/${videoName}`);
}

async function main() {
  await captureDesktopFlow();
  await captureMobileShot();
  await moveVideo();
  console.log("Artifacts created:");
  console.log(offScreenshot);
  console.log(onScreenshot);
  console.log(mobileScreenshot);
  console.log(`${artifactsDir}/${videoName}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
