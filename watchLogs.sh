#!/bin/bash

# watchLogs.sh - Monitor Ghost MCP server logs in real-time

if [ ! -d "logs" ]; then
    echo "❌ Logs directory not found. Make sure to run ./runLocally.sh first."
    exit 1
fi

echo "📊 Monitoring Ghost MCP server logs..."
echo "🛑 Press Ctrl+C to stop monitoring"
echo ""

# Function to display logs with colors
display_logs() {
    local file=$1
    local color=$2
    local label=$3

    if [ -f "$file" ]; then
        tail -f "$file" | sed "s/^/[$label] /" | while read line; do
            echo -e "\033[${color}m$line\033[0m"
        done &
    fi
}

# Start monitoring both log files with different colors
# 32 = green for server, 36 = cyan for tunnel
display_logs "logs/server.log" "32" "SERVER"
display_logs "logs/tunnel.log" "36" "TUNNEL"

# Wait for user to stop
wait