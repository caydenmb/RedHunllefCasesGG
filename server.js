/**********************************************
 * server.js (Based on your attached file)
 **********************************************/
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Parse JSON bodies if needed
app.use(express.json());

// --- Detailed Logging Middleware ---
// Logs request details to the console and appends them as JSON to a daily log file.
app.use((req, res, next) => {
    const logEntry = {
        time: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip,
        headers: req.headers,
        query: req.query,
        body: req.body
    };

    console.log(`
[DETAILED REQUEST LOG]
----------------------
Time:      ${logEntry.time}
Method:    ${logEntry.method}
URL:       ${logEntry.url}
IP:        ${logEntry.ip}
Headers:   ${JSON.stringify(logEntry.headers, null, 2)}
Query:     ${JSON.stringify(logEntry.query, null, 2)}
Body:      ${JSON.stringify(logEntry.body, null, 2)}
----------------------
`);

    const today = new Date().toISOString().slice(0, 10);
    const logFile = path.join(logDir, `log-${today}.json`);

    fs.appendFile(logFile, JSON.stringify(logEntry) + "\n", err => {
        if (err) console.error("Error writing log:", err);
    });

    next();
});

// Serve static files from the "static" folder under the "/static" URL
app.use('/static', express.static(path.join(__dirname, 'static')));

// Route to serve index.html from the "templates" folder at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// API route to serve wager race data with full 11 spots.
// In production, replace getAPIData() with your actual API call logic.
app.get('/data', (req, res) => {
    console.log('[DATA ROUTE] Request received at /data');
    getAPIData()
        .then(data => {
            console.log('[DATA ROUTE] Sending data to client:', data);
            res.json(data);
        })
        .catch(err => {
            console.error('[DATA ROUTE] Error fetching API data:', err);
            res.status(500).json({ error: 'Error fetching data' });
        });
});

// Simulated function to retrieve API data.
// Replace this with your actual API call and processing.
function getAPIData() {
    return Promise.resolve([
        { name: "Alice", wager: "$10,000" },
        { name: "Bob", wager: "$9,500" },
        { name: "Charlie", wager: "$8,750" },
        { name: "Derek", wager: "$8,000" },
        { name: "Erin", wager: "$7,500" },
        { name: "Frank", wager: "$7,000" },
        { name: "Grace", wager: "$6,500" },
        { name: "Hannah", wager: "$6,000" },
        { name: "Ian", wager: "$5,500" },
        { name: "Jack", wager: "$5,000" },
        { name: "Kelly", wager: "$4,500" }
    ]);
}

// Fallback for unmatched routes: serve 404.html from the templates folder
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'templates', '404.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`[SERVER START] Listening on port ${port}`);
});
