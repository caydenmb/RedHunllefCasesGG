const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Parse JSON bodies (if applicable)
app.use(express.json());

// --- Detailed Logging Middleware (Added) ---
// This middleware logs request details without altering any existing functionality.
app.use((req, res, next) => {
  console.log(`
[DETAILED REQUEST LOG]
----------------------
Time:      ${new Date().toISOString()}
Method:    ${req.method}
URL:       ${req.url}
IP:        ${req.ip}
Headers:   ${JSON.stringify(req.headers, null, 2)}
Query:     ${JSON.stringify(req.query, null, 2)}
Body:      ${JSON.stringify(req.body, null, 2)}
----------------------
`);
  next();
});

// --- Existing Routes (Unchanged) ---

// Example route to serve API data for wager race standings
app.get('/data', (req, res) => {
  console.log('[DATA ROUTE] Request received at /data');
  
  // Original logic to retrieve or compute data
  const exampleData = [
    { name: "Alice", wager: "$10,000" },
    { name: "Bob", wager: "$9,500" },
    { name: "Charlie", wager: "$8,750" },
    { name: "Derek", wager: "$8,000" },
    { name: "Erin", wager: "$7,500" }
    // ... (other data as originally provided)
  ];
  
  console.log('[DATA ROUTE] Sending the following data to client:', exampleData);
  res.json(exampleData);
});

// Serve static files (e.g. index.html, images, etc.)
// (This should reflect your original static file serving setup)
app.use(express.static('public'));

// --- Any Other Original Routes or Middleware ---
// (Preserve any additional code from your original server.js here)

// Start the server (original startup code)
app.listen(port, () => {
  console.log(`[SERVER START] Listening on port ${port}`);
});
