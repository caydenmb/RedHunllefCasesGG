/**********************************************
 * server.js (Example with Detailed Logging)
 **********************************************/
const express = require('express');
const app = express();
const port = 3000; // or whatever port you currently use

// Parse JSON bodies (if needed)
app.use(express.json());

// Detailed logging middleware for all incoming requests
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

// Route to serve API data for wager race standings
app.get('/data', (req, res) => {
  console.log('[DATA ROUTE] Request received at /data');
  
  // Example data (replace with your actual data logic)
  const exampleData = [
    { name: "Alice", wager: "$10,000" },
    { name: "Bob", wager: "$9,500" },
    { name: "Charlie", wager: "$8,750" },
    { name: "Derek", wager: "$8,000" },
    { name: "Erin", wager: "$7,500" },
    // Additional example objects as needed...
  ];
  
  console.log('[DATA ROUTE] Sending the following data to client:', exampleData);
  
  res.json(exampleData);
});

// Serve static files (e.g., index.html, images, etc.)
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
  console.log(`[SERVER START] Listening on port ${port}`);
});
