import requests
import json
from flask import Flask, jsonify, send_from_directory
from datetime import datetime, timedelta
import os
import threading
import pytz
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Cases.gg API configuration
API_URL = "https://api.cases.gg/affiliates/detailed-summary/v2/{start_date}"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicGFzcyIsInNjb3BlIjoiYWZmaWxpYXRlcyIsInVzZXJJZCI6OTQ5NDUsImlhdCI6MTczNzMyNDA1MCwiZXhwIjoxODk1MTEyMDUwfQ.8gmdCP5HKuVul-oA0hQqvzPVluEXUPyQUSeeycV9kJI"
HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}"
}
TIMEZONE = pytz.timezone("US/Eastern")  # Eastern Timezone
DATA_LOG_DIR = "./casesgg_logs"  # Directory to store logged data

# Dynamic Start Date and End Date
START_DATE = (datetime(2025, 1, 27, tzinfo=TIMEZONE)).strftime("%Y-%m-%d")
END_DATE = (datetime(2025, 1, 27, tzinfo=TIMEZONE) + timedelta(days=60)).strftime("%Y-%m-%d")

# Data cache
data_cache = {}

# Function to log messages
def log_message(level, message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level.upper()}]: {message}")

# Function to fetch data from the Cases.gg API
def fetch_data():
    global data_cache
    try:
        log_message("info", f"Fetching data for {START_DATE} to {END_DATE}...")

        # Prepare the API URL
        url = API_URL.format(start_date=START_DATE)

        # Make the API request
        response = requests.get(url, headers=HEADERS)

        if response.status_code == 200:
            api_response = response.json()
            log_message("info", "Data fetched successfully.")

            # Process data into the required format
            if "data" in api_response:
                data_cache = process_api_data(api_response["data"])
                log_message("info", f"Processed data: {data_cache}")

                # Log the data to a file
                log_previous_data(data_cache)
            else:
                log_message("warning", "No valid data found in the API response.")
                data_cache = {"error": "No valid data found."}
        else:
            log_message("error", f"Failed to fetch data. Status code: {response.status_code}")
            data_cache = {"error": f"Failed to fetch data. Status code: {response.status_code}"}
    except Exception as e:
        log_message("error", f"Error fetching data: {e}")
        data_cache = {"error": str(e)}

# Function to process API data
def process_api_data(data):
    """Process raw API data into the required format."""
    sorted_data = sorted(data, key=lambda x: x["amount"], reverse=True)  # Sort by amount
    processed = {
        f"top{i+1}": {
            "username": user["displayName"],
            "wager": f"${user['amount'] / 100:,.2f}"  # Convert cents to dollars
        }
        for i, user in enumerate(sorted_data[:11])  # Top 11 players
    }
    return processed

# Function to log previous data
def log_previous_data(data):
    """Log the current data into a file for historical tracking."""
    if not os.path.exists(DATA_LOG_DIR):
        os.makedirs(DATA_LOG_DIR)

    current_date = datetime.now(TIMEZONE).strftime("%Y-%m-%d")
    log_file = os.path.join(DATA_LOG_DIR, f"{current_date}.json")

    with open(log_file, "w") as f:
        json.dump(data, f, indent=4)
    log_message("info", f"Data logged to {log_file}")

    # Remove logs older than the defined time range
    cleanup_old_logs()

# Function to clean up logs older than 2 months
def cleanup_old_logs():
    cutoff_date = datetime(2025, 1, 27, tzinfo=TIMEZONE)
    for filename in os.listdir(DATA_LOG_DIR):
        file_path = os.path.join(DATA_LOG_DIR, filename)
        file_date_str = filename.split(".json")[0]
        try:
            file_date = datetime.strptime(file_date_str, "%Y-%m-%d").replace(tzinfo=TIMEZONE)
            if file_date < cutoff_date:
                os.remove(file_path)
                log_message("info", f"Deleted old log file: {filename}")
        except ValueError:
            log_message("warning", f"Skipping invalid log file: {filename}")

# Schedule data fetching daily at 3 AM Eastern Time
def schedule_daily_fetch():
    now = datetime.now(TIMEZONE)
    next_fetch = now.replace(hour=3, minute=0, second=0, microsecond=0)
    if now > next_fetch:
        next_fetch += timedelta(days=1)

    wait_time = (next_fetch - now).total_seconds()
    log_message("info", f"Next fetch scheduled at {next_fetch}")
    threading.Timer(wait_time, daily_fetch_task).start()

def daily_fetch_task():
    fetch_data()  # Fetch data
    schedule_daily_fetch()  # Reschedule for the next day

# Flask route to serve cached data
@app.route("/data")
def get_data():
    log_message("info", "Serving cached data to a client.")
    return jsonify(data_cache)

# Flask route to serve historical logs
@app.route("/casesggprevious")
def serve_previous_data():
    log_message("info", "Serving historical log data.")
    if not os.path.exists(DATA_LOG_DIR):
        return jsonify({"error": "No logs found."})

    logs = []
    for filename in sorted(os.listdir(DATA_LOG_DIR)):
        file_path = os.path.join(DATA_LOG_DIR, filename)
        with open(file_path, "r") as f:
            logs.append({
                "date": filename.replace(".json", ""),
                "data": json.load(f)
            })
    return jsonify(logs)

# Flask route to serve the index.html file
@app.route("/")
def serve_index():
    log_message("info", "Serving index.html.")
    return send_from_directory(os.getcwd(), "index.html")

# Flask route to serve historical logs interface
@app.route("/casesggprevious.html")
def serve_previous_logs_page():
    log_message("info", "Serving casesggprevious.html.")
    return send_from_directory(os.getcwd(), "casesggprevious.html")

# Start the daily fetching schedule
schedule_daily_fetch()

# Run the Flask app
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))  # Default to port 8080
    log_message("info", f"Starting Flask app on port {port}")
    app.run(host="0.0.0.0", port=port)
