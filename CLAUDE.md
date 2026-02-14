# CLAUDE.md - Rempart

## Project Overview

**Rempart** is a web GUI for nftables firewall configuration with a "Transparency First" philosophy. Users see and edit the real nftables code while getting visual, human-friendly guidance in French.

## Architecture

```
rempart/
├── backend/          Python FastAPI backend
│   └── rempart/
│       ├── api/      REST endpoints (ruleset.py, apply.py)
│       ├── auth/     Session-based authentication (bcrypt)
│       ├── nft/      nftables core (parser, serializer, executor, rollback)
│       ├── ws/       WebSocket live updates (poller, manager)
│       ├── config.py Settings via env vars (REMPART_ prefix)
│       └── main.py   FastAPI app entry point
├── frontend/         React 18 + TypeScript + Vite
│   └── src/
│       ├── components/
│       │   ├── Dashboard/    Main dashboard with table cards
│       │   ├── Detail/       Table detail: ChainFlow, RuleCard, SetCard
│       │   ├── Layout/       AppShell, Header
│       │   ├── RuleBuilder/  Rule creation wizard with insights
│       │   ├── Editor/       CodeMirror 6 code editor
│       │   └── Dialogs/      ApplyDialog, LoginPage
│       ├── state/    Zustand stores (rulesetStore, uiStore, authStore)
│       ├── utils/    humanize.ts, nftSerializer.ts, syncEngine.ts
│       └── types/    nftables.ts type definitions
├── tests/
│   ├── backend/      pytest tests (parser, serializer, rollback)
│   └── frontend/     vitest tests (buildRule, nftSerializer)
├── .env.example      Environment variables reference
└── start.sh/bat      One-command launchers
```

## Key Commands

```bash
# Backend
cd backend && pip install -e ".[dev]"     # Install with dev deps
cd backend && python -m rempart           # Run server (port 8443)
cd backend && pytest ../tests/backend -v  # Run backend tests

# Frontend
cd frontend && npm install                # Install deps
cd frontend && npx vite                   # Dev server (port 5173, proxies to backend)
cd frontend && npx tsc --noEmit           # Type check
cd frontend && npx vite build             # Production build → backend/rempart/static/
cd frontend && npx vitest run             # Run frontend tests

# Full stack (dev)
./start.sh   # Linux/macOS
start.bat     # Windows
```

## Key Design Decisions

- **French UI**: All user-facing text is in French. Code comments and variable names stay in English.
- **No CSS framework**: Inline styles with a dark theme (slate/gray palette). Colors defined in components.
- **Bidirectional sync**: Code panel ↔ visual GUI via `syncEngine.ts` with origin tracking to prevent loops.
- **Mock mode**: On Windows or without nft binary, uses `mock_executor.py` with sample data. Controlled by `REMPART_MOCK_MODE=true`.
- **bcrypt directly**: Not passlib (incompatible with Python 3.13). Auth uses bcrypt + itsdangerous sessions.
- **CodeMirror 6**: Official packages only (not @uiwjs wrapper). Custom nft syntax highlighting via Lezer.
- **No nftables on Windows**: The mock executor simulates all nft operations for development.

## State Management

- `rulesetStore` (Zustand): Holds `RulesetModel`, syncs with backend, provides `updateModelFromTree(updater)` for visual edits.
- `uiStore`: Navigation (dashboard/table view), code panel toggle, selected table.
- `authStore`: Login state, session management.

## nftables Data Flow

```
Backend (nft -j list ruleset)
  → JSON → parser.py → RulesetModel (Pydantic)
  → API /api/ruleset → Frontend rulesetStore
  → humanize.ts (French descriptions)
  → nftSerializer.ts (nft text for code panel)
```

Visual edits use `updateModelFromTree()` which clones the model, applies changes, then auto-serializes to nft text.

## Testing

- Backend: pytest + pytest-asyncio. Fixtures in `tests/backend/fixtures/`.
- Frontend: vitest. Test files in `tests/frontend/`.
- Always run `npx tsc --noEmit` before committing frontend changes.

## Environment Variables

All prefixed with `REMPART_`. See `.env.example` for the full list. Key ones:
- `REMPART_MOCK_MODE` (true/false) - Demo vs production
- `REMPART_SECRET_KEY` - Session signing key
- `REMPART_PORT` - Server port (default 8443)
