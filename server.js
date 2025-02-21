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
// This allows us to embed dynamic data in our HTML templates.
app.engine("html", ejs.renderFile);
app.set("view engine", "html");
app.set("views", path.join(__dirname, "templates"));

// ===============================================
// API Configuration
// ===============================================
// Cases.gg API token and endpoint (wager race starting February 16, 2025)
// IMPORTANT: Ensure the date used is valid (in the past) for which your token is authorized.
const API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicGFzcyIsInNjb3BlIjoiYWZmaWxpYXRlcyIsInVzZXJJZCI6OTQ5NDUsImlhdCI6MTczNzMyNDA1MCwiZXhwIjoxODk1MTEyMDUwfQ.8gmdCP5HKuVul-oA0hQqvzPVluEXUPyQUSeeycV9kJI";
const API_DATE = "2025-02-16";
const API_URL = `https://api.cases.gg/affiliates/detailed-summary/v2/${API_DATE}`;

// ===============================================
// Data Cache (Top 11 Wagerers)
// ===============================================
// This cache will store an array of the top 11 wagerers.
let dataCache = [];

// ===============================================
// Fetch Data Function
// ===============================================
/*
  This function fetches data from the Cases.gg API using cloudscraper.
  It logs detailed debugging information, sorts the API response by "wagered"
  (highest first), and then extracts the top 11 wagerers. For each wagerer, it
  creates an object with:
    - rank: placement number (1 through 11)
    - name: the player's name (from the API "name" field)
    - wager: the wagered amount (converted from cents to dollars and formatted)
  The resulting array is stored in the dataCache variable.
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
      json: true,
      resolveWithFullResponse: true
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

        // Extract the top 11 wagerers and map them into objects with rank, name, and wager.
        const topWagerers = sortedData.slice(0, 11).map((user, index) => ({
          rank: index + 1,
          name: user.name, // Use the "name" field from the API output.
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

// Render index.html from the "templates" folder with API data injected.
// The index.html template should include EJS code to iterate over "topWagerers" and display the data.
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
