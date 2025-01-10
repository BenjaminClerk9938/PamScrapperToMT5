const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function scrapePositions(tabId, positionType) {
  const browser = await puppeteer.launch({ headless: false }); // Set to true for headless
  const page = await browser.newPage();

  try {
    // Load credentials
    const { EMAIL, PASSWORD, LOGIN_URL } = process.env;

    // Login
    console.log("Navigating to login page...");
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });

    console.log("Logging in...");
    await page.type('input[name="email"]', EMAIL); // Added delay for realism
    await page.type('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for the dashboard to load
    console.log("Waiting for dashboard...");
    try {
      await page.waitForSelector(`#${tabId}`, { timeout: 30000 });
      console.log(`Tab "${tabId}" found.`);
    } catch (error) {
      console.error(`Tab "${tabId}" not found:`, error);
      return;
    }

    // Navigate to the correct tab
    console.log(`Navigating to "${positionType}" tab...`);
    await page.click(`#${tabId} button`); // Ensure this selector is correct
    await page.waitForSelector(".list-element__wrapper", { timeout: 30000 });

    // Scrape data
    console.log(`Scraping "${positionType}" positions...`);
    const positions = await page.evaluate(() => {
      const rows = document.querySelectorAll(".list-element__wrapper");
      const data = [];

      rows.forEach((row) => {
        const cells = row.querySelectorAll(".bottom-section-table__element");
        if (cells.length < 14) { // Updated to 14 cells
          return;
        }

        const symbol = cells[1]?.textContent.trim();
        if (symbol === "US100") {
          const order_id = cells[0]?.textContent.trim();
          const open_time_date = cells[2]?.querySelector(".bottom-section-table__date")?.textContent.trim();
          const open_time_time = cells[2]?.querySelector(".bottom-section-table__time")?.textContent.trim();
          const open_time = `${open_time_date} ${open_time_time}`;
          const volume = cells[3]?.textContent.trim();
          const side = cells[4]?.textContent.trim();
          const close_time_date = cells[5]?.querySelector(".bottom-section-table__date")?.textContent.trim();
          const close_time_time = cells[5]?.querySelector(".bottom-section-table__time")?.textContent.trim();
          const close_time = `${close_time_date} ${close_time_time}`;
          const open_price = cells[6]?.textContent.trim();
          const close_price = cells[7]?.textContent.trim() || null;
          const stop_loss = cells[8]?.textContent.trim() || null;
          const take_profit = cells[9]?.textContent.trim() || null;
          const swap = cells[10]?.textContent.trim() || null;
          const commission = cells[11]?.textContent.trim() || null;
          const profit = cells[12]?.textContent.trim() || null;
          const reason = cells[13]?.textContent.trim() || null;

          data.push({
            order_id,
            symbol,
            open_time,
            volume,
            side,
            close_time,
            open_price,
            close_price,
            stop_loss,
            take_profit,
            swap,
            commission,
            profit,
            reason,
          });
        }
      });

      return data;
    });

    if (positions.length === 0) {
      console.log(`No "${positionType}" positions found for US100.`);
    } else {
      console.log(`Found ${positions.length} "${positionType}" positions for US100.`);
    }

    // Ensure output directory exists
    const outputDir = path.resolve("./data");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created directory: ${outputDir}`);
    }

    // Save data to a JSON file
    const fileName = path.join(outputDir, `${positionType}_positions.json`);
    fs.writeFileSync(fileName, JSON.stringify(positions, null, 2));
    console.log(`Saved ${positions.length} "${positionType}" positions to "${fileName}"`);
  } catch (error) {
    console.error("An error occurred during scraping:", error);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

(async () => {
  // Scrape Open Positions
  // await scrapePositions("openPositionsTab", "open");

  // Scrape Closed Positions
  await scrapePositions("closedPositionsTab", "closed");
})();
