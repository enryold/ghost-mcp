#!/bin/bash

# runLocally.sh - Build and run Ghost MCP server with serveo tunnel
# Usage: ./runLocally.sh [port]

set -e

# Default port
PORT=${1:-3000}

echo "🔧 Building the application..."
npm run build

echo "🚀 Starting Ghost MCP server on port $PORT..."

# Kill any existing processes on the port
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*http-server" || true
pkill -f "ssh.*serveo" || true
sleep 2

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the server in the background with logging
echo "📡 Starting MCP server..."
echo "📝 Server logs will be written to: logs/server.log"
PORT=$PORT npm run start:http > logs/server.log 2>&1 &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 3

# Check if server started successfully
if ! curl -s "http://localhost:$PORT/health" > /dev/null; then
    echo "❌ Server failed to start on port $PORT"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Server started successfully on port $PORT"

# Start serveo tunnel
echo "🌐 Creating serveo tunnel..."
echo "📱 Your public URL will be: https://yoursubdomain.serveo.net"
echo "🔗 Tunnel will forward to: http://localhost:$PORT"
echo ""
echo "⚠️  Note: The serveo subdomain will be randomly assigned"
echo "💡 You can also specify a subdomain like: ssh -R yourname:80:localhost:$PORT serveo.net"
echo ""
echo "📊 Monitoring commands (run in another terminal):"
echo "   tail -f logs/server.log    # Watch server logs"
echo "   tail -f logs/tunnel.log    # Watch tunnel logs"
echo "   tail -f logs/*.log         # Watch all logs"
echo ""
echo "🛑 Press Ctrl+C to stop both server and tunnel"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    echo "🔌 Stopping serveo tunnel..."
    kill $TUNNEL_PID 2>/dev/null || true
    echo "🔌 Stopping MCP server..."
    kill $SERVER_PID 2>/dev/null || true
    echo "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start serveo tunnel with logging
echo "📝 Tunnel logs will be written to: logs/tunnel.log"
ssh -R 80:localhost:$PORT serveo.net > logs/tunnel.log 2>&1 &
TUNNEL_PID=$!

# Wait a moment for tunnel to establish and extract URL
echo "⏳ Establishing tunnel connection..."
sleep 5

# Extract the serveo URL from the logs
SERVEO_URL=$(grep -o "https://[a-zA-Z0-9-]*\.serveo\.net" logs/tunnel.log | head -1)
if [ -n "$SERVEO_URL" ]; then
    echo ""
    echo "🎉 Tunnel established successfully!"
    echo "🔗 Your public URL: $SERVEO_URL"
    echo "📋 Copy this URL: $SERVEO_URL"
    echo ""
else
    echo "⚠️  Tunnel URL not detected yet, check logs/tunnel.log"
fi

# Wait for both processes
wait $SERVER_PID $TUNNEL_PID