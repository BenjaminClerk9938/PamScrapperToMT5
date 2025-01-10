const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function scrapePositions(tabId, positionType) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Load credentials
    const { EMAIL, PASSWORD, LOGIN_URL } = process.env;

    // Login
    console.log("Navigating to login page...");
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });

    console.log("Logging in...");
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for the dashboard to load
    console.log("Waiting for dashboard...");
    try {
      await page.waitForSelector(`#${tabId}`, { timeout: 30000 });
      console.log(`${tabId} found.`);
    } catch (error) {
      console.error("Tab ID not found:", error);
      return [];
    }

    // Navigate to the correct tab
    console.log(`Navigating to ${positionType} tab...`);
    await page.click(`#${tabId}`);
    await page.waitForSelector(".list-element__wrapper", { timeout: 30000 });

    // Scrape data
    console.log(`Scraping ${positionType} positions...`);
    const positions = await page.evaluate(() => {
      const rows = document.querySelectorAll(".list-element__wrapper");
      const data = [];

      rows.forEach((row) => {
        const symbol = row
          .querySelector(".bottom-section-table__element:nth-child(2)")
          ?.textContent.trim();
        if (symbol === "US100") {
          data.push({
            order_id: row
              .querySelector(".bottom-section-table__element:first-child")
              ?.textContent.trim(),
            symbol: symbol,
            volume: row
              .querySelector(".bottom-section-table__element:nth-child(4)")
              ?.textContent.trim(),
            open_price: row
              .querySelector(".bottom-section-table__element:nth-child(7)")
              ?.textContent.trim(),
            close_price:
              row
                .querySelector(".bottom-section-table__element:nth-child(8)")
                ?.textContent.trim() || null,
            profit:
              row
                .querySelector(".bottom-section-table__element:nth-child(12)")
                ?.textContent.trim() || null,
          });
        }
      });
      return data;
    });

    if (positions.length === 0) {
      console.log(`No ${positionType} positions found.`);
    }

    // Ensure output directory exists
    const outputDir = path.resolve("./data");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save data to a JSON file
    const fileName = path.join(outputDir, `${positionType}_positions.json`);
    fs.writeFileSync(fileName, JSON.stringify(positions, null, 2));
    console.log(
      `Saved ${positions.length} ${positionType} positions to ${fileName}`
    );
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await browser.close();
  }
}

(async () => {
  await scrapePositions("openPositionsTab", "open");
  await scrapePositions("closedPositionsTab", "closed");
})();
