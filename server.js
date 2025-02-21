"use strict";

// ===============================================
// Imports and Setup
// ===============================================
const express = require("express");
const cloudscraper = require("cloudscraper");
const path = require("path");
const ejs = require("ejs");

const app = express();
const PORT = process.env.PORT || 8080;

// ===============================================
// View Engine Configuration
// ===============================================
// Configure Express to render .html files using EJS.
app.engine("html", ejs.renderFile);
app.set("view engine", "html");
app.set("views", path.join(__dirname, "templates"));

// ===============================================
// API Configuration
// ===============================================
// IMPORTANT: Use a valid date (in the past) for which your token is authorized.
// Using a future date may trigger a 403 error.
const API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicGFzcyIsInNjb3BlIjoiYWZmaWxpYXRlcyIsInVzZXJJZCI6OTQ5NDUsImlhdCI6MTczNzMyNDA1MCwiZXhwIjoxODk1MTEyMDUwfQ.8gmdCP5HKuVul-oA0hQqvzPVluEXUPyQUSeeycV9kJI";
const API_DATE = "2025-02-16"; // Replace with a valid past date if needed.
const API_URL = `https://api.cases.gg/affiliates/detailed-summary/v2/${API_DATE}`;

// ===============================================
// Data Cache (Top 11 Wagerers)
// ===============================================
// This variable will hold the processed top 11 wagerers.
let dataCache = [];

// ===============================================
// Fetch Data Function
// ===============================================
/*
  fetchData() sends a GET request to the Cases.gg API using cloudscraper.
  It mimics a browser request by using a common User-Agent and necessary headers,
  including the Authorization token. The API response is expected to be an array.
  
  Steps:
  1. Log the request options and send the GET request.
  2. If the response status is 200, sort the data by the "wagered" field (descending).
  3. Extract the top 11 entries, mapping each to an object containing:
       - rank: the placement (1 through 11)
       - name: the player's name (from the API "name" field)
       - wager: the wagered amount in dollars and cents (calculated from "wagered")
  4. Store the processed array in dataCache.
  5. Log all steps for debugging.
*/
async function fetchData() {
  console.log(
    `[${new Date().toISOString()}] INFO: Initiating API data fetch from ${API_URL}`
  );
  try {
    const options = {
      method: "GET",
      uri: API_URL,
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://cases.gg/",
        Origin: "https://cases.gg"
      },
      jar: true, // Enable cookie jar for Cloudflare cookies
      json: true,
      resolveWithFullResponse: true,
      simple: false // Do not automatically throw errors on non-2xx responses
    };

    console.log(
      `[${new Date().toISOString()}] DEBUG: Options for cloudscraper:\n${JSON.stringify(
        options,
        null,
        2
      )}`
    );

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
        // Sort the API data by "wagered" in descending order (highest wager first)
        const sortedData = apiResponse.sort(
          (a, b) => (b.wagered || 0) - (a.wagered || 0)
        );

        // Map the top 11 wagerers into an array of objects.
        // For each user, "name" is taken from the API "name" field,
        // and "wager" is computed by converting "wagered" (in cents) to dollars.
        const topWagerers = sortedData.slice(0, 11).map((user, index) => ({
          rank: index + 1,
          name: user.name,
          wager: `$${(user.wagered / 100).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`
        }));

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

// Fetch data immediately and then every 90 seconds.
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
// Serve static assets from the "static" folder.
app.use("/static", express.static(path.join(__dirname, "static")));

// Render index.html from the "templates" folder with the API data injected.
// Your index.html file (an EJS template) should loop through "topWagerers" to replace placeholder data.
app.get("/", (req, res) => {
  console.log(
    `[${new Date().toISOString()}] INFO: Rendering index.html with API data`
  );
  res.render("index.html", { topWagerers: dataCache });
});

// Endpoint to serve cached API data as JSON.
app.get("/data", (req, res) => {
  console.log(
    `[${new Date().toISOString()}] INFO: Serving API data cache as JSON`
  );
  res.json(dataCache);
});

// ===============================================
// 404 Handler: Serve 404.html for any undefined paths.
// ===============================================
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
