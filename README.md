# Redhunllef Livestream Wager Race

This Node.js application fetches wager race data from the Cases.gg API and displays the top 11 wagerers on a live webpage. The data is processed to show each user's name (masked so that only the first letter is visible followed by six asterisks) and their wagered amount (converted to USD dollars and cents).

## Features

- **API Data Fetching:** Retrieves wager race data from the Cases.gg API using a bearer token.
- **Data Processing:** Sorts and selects the top 11 wagerers, masks usernames (e.g., "GingrSnaps" becomes "G******"), and formats wager amounts to dollars and cents.
- **User Interface:** Serves a webpage with a starry background, sponsor buttons, and a podium for the top three wagerers.
- **Custom 404 Page:** Provides a friendly 404 error page for undefined routes.
