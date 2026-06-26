import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:80/status");
await page.waitForLoadState("networkidle");

// Take a screenshot focusing on the table headers
const tableLocator = page.locator("table");
await tableLocator.screenshot({ path: "/tmp/status_table.png", maxHeight: 250 });

console.log("Screenshot saved to /tmp/status_table.png");
await browser.close();
