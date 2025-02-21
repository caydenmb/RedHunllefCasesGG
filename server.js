/**********************************************
 * server.js (Original with Adjustments for File Structure and Additional Logging)
 **********************************************/
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Parse JSON bodies if needed
app.use(express.json());

// --- Detailed Logging Middleware (Added) ---
// Logs request details without altering existing functionality.
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

// Serve static files from the "static" folder under the "/static" URL
app.use('/static', express.static(path.join(__dirname, 'static')));

// Route to serve index.html from the "templates" folder at the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

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

// Fallback for unmatched routes: serve 404.html from the templates folder
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'templates', '404.html'));
});

// Start the server (original startup code)
app.listen(port, () => {
  console.log(`[SERVER START] Listening on port ${port}`);
});
