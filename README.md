# RTCE — Real-Time Collaborative Code Editor

A web app where multiple users can code together in real time with live cursors, chat, and version history.

![Editor](https://img.shields.io/badge/Editor-Monaco-blue) ![Sync](https://img.shields.io/badge/Sync-Yjs%20CRDT-green) ![Transport](https://img.shields.io/badge/Transport-Socket.io-yellow)

## Features

- **Real-time editing** — CRDT-based sync, no conflicts
- **Live cursors** — see everyone's cursor and selections
- **Chat** — sidebar messaging with history
- **Version history** — save snapshots and revert anytime
- **Language selector** — synced across all users

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, Monaco Editor, Tailwind v4 |
| Backend | Express, Socket.io, sql.js (SQLite) |
| Sync | Yjs, y-monaco, y-protocols |

## Quick Start

**Prerequisites:** Node.js 18+

```bash
# 1. Clone & install
git clone https://github.com/your-username/RTCE.git
cd RTCE
npm install

# 2. Setup env
cp .env.example .env

# 3. Run (starts both server & client)
npm run dev
```

Open **http://localhost:3000**, pick a name, and start coding.

## Project Structure

```
RTCE/
├── client/          # Next.js frontend
│   └── src/
│       ├── app/         # Pages (landing + room)
│       ├── components/  # Editor, Chat, Toolbar, etc.
│       ├── hooks/       # useCollaboration, useChat, useVersionHistory
│       └── lib/         # Socket client, Yjs provider, types
├── server/          # Express + Socket.io backend
│   └── src/
│       ├── db/          # SQLite schema, queries, connection
│       └── socket/      # Event handlers, Yjs sync
└── package.json     # Workspace root
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | `3001` | Backend port |
| `CLIENT_URL` | `http://localhost:3000` | CORS origin |
| `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3001` | Client → server URL |
| `DB_PATH` | `./server/data/rtce.db` | SQLite file path |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both server & client |
| `npm run dev:server` | Server only |
| `npm run dev:client` | Client only |

## License

MIT
