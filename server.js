"use strict";

// ===============================================
// Imports and Setup
// ===============================================
const express = require("express");
const cloudscraper = require("cloudscraper");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// ===============================================
// API Configuration
// ===============================================
// IMPORTANT: Ensure the date used is in the past and your token is authorized for that range.
// For example, "2025-02-20" is used here.
const API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicGFzcyIsInNjb3BlIjoiYWZmaWxpYXRlcyIsInVzZXJJZCI6OTQ5NDUsImlhdCI6MTczNzMyNDA1MCwiZXhwIjoxODk1MTEyMDUwfQ.8gmdCP5HKuVul-oA0hQqvzPVluEXUPyQUSeeycV9kJI";
const API_DATE = "2025-03-17";
const API_URL = `https://api.cases.gg/affiliates/detailed-summary/v2/${API_DATE}`;

// ===============================================
// Data Cache (Top 11 Wagerers)
// ===============================================
// We store the top 11 wagerers here as an array of objects.
let dataCache = [];

// ===============================================
// Helper Functions
// ===============================================

/**
 * Masks a given name so that only the first character is visible,
 * followed by exactly six asterisks.
 * For example, "DuggieLovesRed" becomes "D******".
 *
 * @param {string} name - The original name.
 * @returns {string} - The masked name.
 */
function maskName(name) {
  if (typeof name !== "string" || name.length === 0) return "";
  return name.charAt(0) + "******";
}

/**
 * Logs messages to the console with a standardized timestamp and level.
 *
 * @param {string} level - The log level (e.g., "info", "debug", "error").
 * @param {string} message - The message to log.
 */
function logMessage(level, message) {
  console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}]: ${message}`);
}

// ===============================================
// Fetch Data Function
// ===============================================
/**
 * Fetches API data from Cases.gg using cloudscraper.
 * It sorts the data by "wagered" (highest first), extracts the top 11 entries,
 * masks the names, converts wager amounts from cents to dollars,
 * and updates the data cache.
 */
async function fetchData() {
  logMessage("info", `Initiating API data fetch from ${API_URL}`);
  try {
    const options = {
      method: "GET",
      uri: API_URL,
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://cases.gg/",
        "Origin": "https://cases.gg"
      },
      json: true,
      resolveWithFullResponse: true,
      jar: true,
      simple: false
    };

    logMessage("debug", `Options for cloudscraper:\n${JSON.stringify(options, null, 2)}`);

    const response = await cloudscraper(options);
    logMessage("debug", `Cloudscraper response status: ${response.statusCode}`);
    logMessage("debug", `Cloudscraper response headers:\n${JSON.stringify(response.headers, null, 2)}`);

    if (response.statusCode === 200) {
      const apiResponse = response.body;
      logMessage("info", `Raw API response:\n${JSON.stringify(apiResponse, null, 2)}`);

      if (Array.isArray(apiResponse)) {
        // Sort the API data by "wagered" in descending order (highest wager first)
        const sortedData = apiResponse.sort((a, b) => (b.wagered || 0) - (a.wagered || 0));

        // Map the top 11 wagerers into our desired format.
        // We use the API "name" field (masked) and convert "wagered" from cents to dollars.
        const topWagerers = sortedData.slice(0, 11).map((user, index) => ({
          rank: index + 1,
          // Mask the name: only show the first letter, followed by six asterisks.
          name: maskName(user.name),
          // Convert wagered amount (assumed to be in cents) to dollars.
          wager: `$${(user.wagered / 100).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`
        }));

        dataCache = topWagerers;
        logMessage("info", `Data cache updated:\n${JSON.stringify(dataCache, null, 2)}`);
      } else {
        logMessage("warn", "Unexpected API response format.");
        dataCache = { error: "Unexpected API response format" };
      }
    } else {
      logMessage("error", `Non-200 response from cloudscraper: ${response.statusCode}`);
    }
  } catch (error) {
    logMessage("error", `Error during cloudscraper fetch: ${error.message}`);
    if (error.response) {
      logMessage("error", `Error response body:\n${JSON.stringify(error.response.body, null, 2)}`);
      logMessage("error", `Error response status: ${error.response.statusCode}`);
      logMessage("error", `Error response headers:\n${JSON.stringify(error.response.headers, null, 2)}`);
    }
    if (error.options) {
      logMessage("error", `Error options:\n${JSON.stringify(error.options, null, 2)}`);
    }
    logMessage("error", `Full error object:\n${JSON.stringify(error, null, 2)}`);
    dataCache = { error: error.message };
  }
}

// Immediately fetch data and then schedule fetches every 90 seconds.
fetchData();
setInterval(fetchData, 90 * 1000);

// ===============================================
// Middleware and Routes
// ===============================================

// Logging middleware for incoming requests.
app.use((req, res, next) => {
  logMessage("info", `REQUEST: ${req.method} ${req.url}`);
  next();
});

// Serve static assets from the "static" folder.
app.use("/static", express.static(path.join(__dirname, "static")));

// Serve index.html from the "templates" folder.
app.get("/", (req, res) => {
  logMessage("info", "Serving index.html");
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});

// Serve apidata.html from the "templates" folder for viewing raw API data.
app.get("/apidata", (req, res) => {
  logMessage("info", "Serving apidata.html");
  res.sendFile(path.join(__dirname, "templates", "apidata.html"));
});

// Endpoint to serve the cached API data as JSON.
app.get("/data", (req, res) => {
  logMessage("info", "Serving API data cache");
  res.json(dataCache);
});

// Catch-all 404 handler: serve 404.html from the "templates" folder.
app.use((req, res) => {
  logMessage("warn", `404 Not Found: ${req.originalUrl}`);
  res.status(404).sendFile(path.join(__dirname, "templates", "404.html"));
});

// ===============================================
// Start the Express Server
// ===============================================
app.listen(PORT, () => {
  logMessage("info", `Express server started on port ${PORT}`);
});
