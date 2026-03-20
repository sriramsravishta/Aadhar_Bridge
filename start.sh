#!/bin/bash

# ──────────────────────────────────────────────────────────────────
#  Aadhaar Bridge — One-Command Startup Script
#  Usage: ./start.sh
#  Starts: Supabase → n8n → Vite → ngrok (updates .env.local auto)
# ──────────────────────────────────────────────────────────────────

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$PROJECT_DIR/.env.local"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

echo ""
echo "🪪  Aadhaar Bridge — Starting up..."
echo "────────────────────────────────────"

# ── 1. Supabase ──────────────────────────────────────────────────
echo ""
echo "▶ [1/4] Starting Supabase..."
SUPABASE_STATUS=$(npx supabase status 2>&1 || true)
if echo "$SUPABASE_STATUS" | grep -q "API URL"; then
    echo "  ✅ Supabase already running"
else
    npx supabase start
    echo "  ✅ Supabase started"
fi

# ── 2. n8n ───────────────────────────────────────────────────────
echo ""
echo "▶ [2/4] Starting n8n..."
if lsof -i :5678 | grep -q LISTEN 2>/dev/null; then
    echo "  ✅ n8n already running on port 5678"
else
    echo "  ⏳ Launching n8n in background..."
    nohup n8n start > /tmp/n8n.log 2>&1 &
    sleep 3
    echo "  ✅ n8n started (logs: /tmp/n8n.log)"
fi

# ── 3. ngrok tunnel ──────────────────────────────────────────────
echo ""
echo "▶ [3/4] Starting ngrok tunnel on port 5173..."

# Kill any existing ngrok
pkill -f "ngrok http 5173" 2>/dev/null || true
sleep 1

# Start ngrok in background
nohup npx ngrok http 5173 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

echo "  ⏳ Waiting for ngrok to connect..."
NGROK_URL=""
for i in {1..15}; do
    sleep 2
    NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
        | grep -o '"public_url":"https://[^"]*"' \
        | head -1 \
        | cut -d'"' -f4)
    if [ -n "$NGROK_URL" ]; then
        break
    fi
done

if [ -z "$NGROK_URL" ]; then
    echo "  ❌ ngrok failed to connect. Check /tmp/ngrok.log"
    echo "     Make sure your authtoken is configured: npx ngrok config add-authtoken YOUR_TOKEN"
    exit 1
fi

echo "  ✅ ngrok tunnel: $NGROK_URL"

# ── 4. Update .env.local ─────────────────────────────────────────
echo ""
echo "▶ [4/4] Updating .env.local with ngrok URL..."
cat > "$ENV_FILE" <<EOF
VITE_SUPABASE_URL=${NGROK_URL}
VITE_SUPABASE_ANON_KEY=${ANON_KEY}
VITE_N8N_WEBHOOK_URL=${NGROK_URL}
EOF
echo "  ✅ .env.local updated"

# ── 5. Start Vite ────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────"
echo "✅  All services running!"
echo ""
echo "  📱 Mobile URL  → $NGROK_URL"
echo "  🖥️  Local URL   → http://localhost:5173"
echo "  🗄️  Supabase    → http://127.0.0.1:54321"
echo "  ⚙️  n8n         → http://localhost:5678"
echo ""
echo "  Share the 📱 Mobile URL with demo attendees."
echo "  They'll see a ngrok warning — tell them to click 'Visit Site'."
echo ""
echo "▶ Starting Vite dev server (Ctrl+C to stop everything)..."
echo "────────────────────────────────────"
echo ""

cd "$PROJECT_DIR"
npm run dev -- --host
