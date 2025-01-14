const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { waitFor, sendData } = require("./utils");
require("dotenv").config();

let lastOrderIds = new Set();

async function scrapePositions(tabId, positionType) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Load credentials
    const { EMAIL, PASSWORD, LOGIN_URL, WEBSOCKET_URL } = process.env;

    // Login to the platform
    console.log("Navigating to login page...");
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });

    console.log("Logging in...");
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard page to fully load
    console.log("Waiting for dashboard...");
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // // Ensure dashboard is fully loaded
    await page.goto("https://platform.stellar-holdings.co/dashboard", {
      waitUntil: "networkidle2",
    });
    await page.waitForSelector(`#${tabId}`, { timeout: 60000 });
    console.log(`Tab "${tabId}" found and dashboard loaded.`);

    // Check if the tab is already active before clicking
    const isTabActive = await page.$eval(`#${tabId}`, (tab) => {
      return tab.classList.contains("engine-tab--active");
    });

    if (!isTabActive) {
      console.log(`Clicking on "${tabId}" to activate the tab...`);
      await page.click(`#${tabId} button`);
      await page.waitForSelector(`#${tabId}.engine-tab--active`, {
        timeout: 10000,
      });
    }

    await waitFor(4000);

    // Wait for the positions list to fully load
    console.log("Waiting for positions data...");
    await page.waitForSelector(".list-element__wrapper", { timeout: 60000 });

    // Scrape data
    console.log(`Scraping "${positionType}" positions...`);
    try {
      await page.waitForSelector(".list-element__wrapper", {
        timeout: 300,
      });
    } catch (error) {
      await browser.close();
      console.log("list element wrapper not found");
    }
    setInterval(async () => {
      const positions = await page.evaluate(() => {
        const rows = document.querySelectorAll(".list-element__wrapper");
        const data = [];

        rows.forEach((row) => {
          const cells = row.querySelectorAll(".bottom-section-table__element");
          if (cells.length < 12) return;

          const symbol = cells[1]?.textContent.trim();
          if (symbol === "US100") {
            const order_id = cells[0]?.textContent.split(" ")[1];
            const volume = cells[3]?.textContent.trim();
            const side = cells[4]?.textContent.trim();

            data.push({
              order_id,
              volume,
              side,
            });
          }
        });
        return data;
      });

      const newPositions = positions.filter(
        (position) => !lastOrderIds.has(position.order_id)
      );
      if (newPositions.length > 0) {
        console.log(
          `Found ${newPositions.length} new "${positionType}" positions.`
        );
        lastOrderIds = new Set(positions.map((position) => position.order_id));
        sendData(WEBSOCKET_URL, { closedPositions: newPositions });
        console.log("newPositions:", newPositions);
      } 
      if (positions.length === 0) {
        console.log(`No "${positionType}" positions found for US100.`);
      } else {
        console.log(
          `Found ${positions.length} "${positionType}" positions for US100.`
        );
      }

      // // Save data to a JSON file
      // const outputDir = path.resolve("./data");
      // if (!fs.existsSync(outputDir)) {
      //   fs.mkdirSync(outputDir, { recursive: true });
      // }

      // const fileName = path.join(outputDir, `${positionType}_positions.json`);
      // fs.writeFileSync(fileName, JSON.stringify(positions, null, 2));
      // console.log(
      //   `Saved ${positions.length} "${positionType}" positions to "${fileName}"`
      // );
    }, 100);
  } catch (error) {
    console.error("An error occurred during scraping:", error);
  }
}

(async () => {
  // await scrapePositions("openPositionsTab", "open");
  await scrapePositions("closedPositionsTab", "closed");
})();
