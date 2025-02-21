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
// IMPORTANT: Use a valid past date that your token is authorized for.
// Using a future date may trigger a 403 error.
const API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicGFzcyIsInNjb3BlIjoiYWZmaWxpYXRlcyIsInVzZXJJZCI6OTQ5NDUsImlhdCI6MTczNzMyNDA1MCwiZXhwIjoxODk1MTEyMDUwfQ.8gmdCP5HKuVul-oA0hQqvzPVluEXUPyQUSeeycV9kJI";
const API_DATE = "2025-02-16"; // Change if needed (must be in the past)
const API_URL = `https://api.cases.gg/affiliates/detailed-summary/v2/${API_DATE}`;

// ===============================================
// Data Cache (Top 11 Wagerers)
// ===============================================
let dataCache = [];

// ===============================================
// Fetch Data Function
// ===============================================
async function fetchData() {
  console.log(
    `[${new Date().toISOString()}] INFO: Initiating API data fetch from ${API_URL}`
  );

  try {
    // Build options for cloudscraper.
    const options = {
      method: "GET",
      uri: API_URL,
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://cases.gg/",
        Origin: "https://cases.gg"
      },
      jar: true, // Enable cookie jar support
      json: true, // Automatically parse JSON response
      resolveWithFullResponse: true,
      simple: false,
      followAllRedirects: true // Follow all redirects (may help with Cloudflare challenges)
    };

    console.log(
      `[${new Date().toISOString()}] DEBUG: Options for cloudscraper:\n${JSON.stringify(
        options,
        null,
        2
      )}`
    );

    // Execute the API request using cloudscraper.
    const response = await cloudscraper(options);
    console.log(
      `[${new Date().toISOString()}] DEBUG: Cloudscraper response status: ${response.statusCode}`
    );
    console.log(
      `[${new Date().toISOString()}] DEBUG: Cloudscraper response headers:\n${JSON.stringify(
        response.headers,
        null,
        2
      )}`
    );

    if (response.statusCode === 200) {
      const apiResponse = response.body;
      console.log(
        `[${new Date().toISOString()}] INFO: Raw API response:\n${JSON.stringify(
          apiResponse,
          null,
          2
        )}`
      );

      if (Array.isArray(apiResponse)) {
        // Sort the API data by "wagered" (highest wager first)
        const sortedData = apiResponse.sort(
          (a, b) => (b.wagered || 0) - (a.wagered || 0)
        );

        // Map the top 11 wagerers into an array.
        // For each user, we use the API "name" field for the player's name,
        // and "wagered" (converted from cents to dollars) for the wager amount.
        const topWagerers = sortedData.slice(0, 11).map((user, index) => {
          return {
            rank: index + 1,
            name: user.name || "Unknown",
            wager: `$${(user.wagered / 100).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`
          };
        });

        dataCache = topWagerers;
        console.log(
          `[${new Date().toISOString()}] INFO: Data cache updated:\n${JSON.stringify(
            dataCache,
            null,
            2
          )}`
        );
      } else {
        console.warn(
          `[${new Date().toISOString()}] WARNING: Unexpected API response format.`
        );
        dataCache = { error: "Unexpected API response format" };
      }
    } else {
      console.error(
        `[${new Date().toISOString()}] ERROR: Non-200 response from cloudscraper: ${response.statusCode}`
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ERROR: Error during cloudscraper fetch: ${error.message}`
    );
    if (error.response) {
      console.error(
        `[${new Date().toISOString()}] ERROR: Error response body:\n${JSON.stringify(
          error.response.body,
          null,
          2
        )}`
      );
      console.error(
        `[${new Date().toISOString()}] ERROR: Error response status: ${error.response.statusCode}`
      );
      console.error(
        `[${new Date().toISOString()}] ERROR: Error response headers:\n${JSON.stringify(
          error.response.headers,
          null,
          2
        )}`
      );
    }
    if (error.options) {
      console.error(
        `[${new Date().toISOString()}] ERROR: Error options:\n${JSON.stringify(
          error.options,
          null,
          2
        )}`
      );
    }
    console.error(
      `[${new Date().toISOString()}] ERROR: Full error object:\n${JSON.stringify(
        error,
        null,
        2
      )}`
    );
    dataCache = { error: error.message };
  }
}

// Fetch data immediately and then every 90 seconds
fetchData();
setInterval(fetchData, 90 * 1000);

// ===============================================
// Logging Middleware for Incoming Requests
// ===============================================
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] REQUEST: ${req.method} ${req.url}`
  );
  next();
});

// ===============================================
// Serve Static Files and HTML Templates
// ===============================================
// Serve static assets from the "static" folder
app.use("/static", express.static(path.join(__dirname, "static")));

// Serve index.html from the "templates" folder
app.get("/", (req, res) => {
  console.log(`[${new Date().toISOString()}] INFO: Serving index.html`);
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});

// Endpoint to serve cached API data
app.get("/data", (req, res) => {
  console.log(`[${new Date().toISOString()}] INFO: Serving API data cache`);
  res.json(dataCache);
});

// Catch-all for undefined paths: serve 404.html from the "templates" folder
app.use((req, res) => {
  console.warn(
    `[${new Date().toISOString()}] WARNING: 404 Not Found for ${req.url}`
  );
  res.status(404).sendFile(path.join(__dirname, "templates", "404.html"));
});

// ===============================================
// Start the Express Server
// ===============================================
app.listen(PORT, () => {
  console.log(
    `[${new Date().toISOString()}] INFO: Express server started on port ${PORT}`
  );
});
