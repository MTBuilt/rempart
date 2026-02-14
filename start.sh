#!/bin/bash
# Rempart - One-command launcher
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo -e "${CYAN}${BOLD}  ============================================${NC}"
echo -e "${CYAN}${BOLD}    Rempart - nftables Configuration GUI${NC}"
echo -e "${CYAN}${BOLD}  ============================================${NC}"
echo ""

# Check deps
command -v python3 >/dev/null 2>&1 || { echo -e "${RED}Python3 requis${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js requis${NC}"; exit 1; }

# Backend
if [ ! -f backend/.installed ]; then
    echo -e "[1/3] Installation backend..."
    cd backend && pip install -e . -q && echo OK > .installed && cd ..
else
    echo -e "[1/3] Backend OK"
fi

# Frontend
if [ ! -d frontend/node_modules ]; then
    echo -e "[2/3] Installation frontend..."
    cd frontend && npm install --silent && cd ..
else
    echo -e "[2/3] Frontend OK"
fi

# Build
echo -e "[3/3] Build frontend..."
cd frontend && npx vite build --silent 2>/dev/null && cd ..

echo ""
echo -e "${GREEN}${BOLD}  Serveur pret !${NC}"
echo ""
echo -e "  ${BOLD}http://127.0.0.1:8443${NC}"
echo -e "  Mot de passe: admin"
echo ""

# Detect mock or real mode
if command -v nft >/dev/null 2>&1; then
    echo -e "  Mode: ${GREEN}PRODUCTION${NC} (nftables detecte)"
    export REMPART_MOCK_MODE=false
else
    echo -e "  Mode: ${CYAN}DEMO${NC} (donnees simulees)"
    export REMPART_MOCK_MODE=true
fi
echo ""

cd backend
python3 -m uvicorn rempart.main:app --host 127.0.0.1 --port 8443
