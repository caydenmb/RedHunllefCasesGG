# Cases.gg Wager Leaderboard

This project provides a dynamic leaderboard and historical logging for wager data on **Cases.gg**, allowing users to track top wagerers and view historical performance.

## Key Features
- **Live Leaderboard**: Displays the top wagerers with their wager amounts dynamically updated every 5 minutes.
- **Daily Refresh**: Automatically fetches data from the Cases.gg API at 3 AM Eastern Time.
- **Historical Logs**: Logs daily wager data and makes it accessible via a subdomain (e.g., `redhunllef.gg/casesggprevious`).
- **API Integration**: Connects seamlessly to the Cases.gg API using token-based authentication.
- **Responsive Design**: Modern and user-friendly interface for both the leaderboard and historical logs.

## Project Structure
```plaintext
.
├── casesgg.py             # Python backend for API integration and data processing
├── index.html             # Frontend for displaying the live leaderboard
├── casesggprevious.html   # Frontend for viewing historical wager logs
├── static/                # Static assets like images and styles
│   ├── redlogo.png
│   ├── 1st.png
│   ├── 2nd.png
│   ├── 3rd.png
├── casesgg_logs/          # Directory for storing historical log files (JSON format)
├── Procfile               # Configuration for deployment
├── runtime.txt            # Specifies Python runtime version
└── README.md              # Project documentation
