# Codebase Explanation: RTCE In-Depth 🔍

This document provides a deep dive into the RTCE (Real-Time Collaborative Code Editor) codebase. It explains every core module, the folder structure, and how data moves between the client and the server.

---

## 🏗 Directory Structure Overview

The project is structured as an npm **monorepo** with two main workspaces:
- `/client`: The Next.js frontend
- `/server`: The Express + Socket.io backend

```text
RTCE/
├── client/
│   ├── src/
│   │   ├── app/             # Next.js App Router (Pages & Layout)
│   │   ├── components/      # React UI Components
│   │   ├── hooks/           # Custom React hooks containing logic
│   │   └── lib/             # Utilities (Socket.io config, Yjs Provider)
├── server/
│   ├── src/
│   │   ├── db/              # Database connection, schema, and queries
│   │   ├── socket/          # Socket handlers and Yjs connection
│   │   ├── index.ts         # Server entry point
│   │   └── types.ts         # TypeScript definitions
└── package.json             # Root monorepo configuration
```

---

## 💻 The Client Workspace (`/client`)

The frontend is built using **Next.js 15**, **React 19**, and **Tailwind CSS**. It relies heavily on custom React hooks to separate complex socket and state logic from the UI.

### 1. `src/app/` (Pages and Routing)
*   **`page.tsx`**: The landing page. Contains the `JoinForm` where users type a username and a Room ID to enter a specific session.
*   **`room/[roomId]/page.tsx`**: The main room where collaboration happens. This page gathers all the components (Toolbar, ChatPanel, CodeEditor, VersionHistory) and initializes the three main custom hooks (`useCollaboration`, `useChat`, `useVersionHistory`).

### 2. `src/hooks/` (State and Logic)
*   **`useCollaboration.ts`**: The brain of the editor. When a user joins, this hook connects to the server via Socket.io. It creates a local `Y.Doc` (the blank piece of paper) and connects it to our custom `SocketIOProvider`. It handles tracking connected users when they join or leave, updating language selections, and fetching the initial state.
*   **`useChat.ts`**: Manages the array of chat messages. It exposes a `sendMessage` function that emits a Socket.io event, and listens for incoming `chat-message` events broadcast by the server.
*   **`useVersionHistory.ts`**: Handles the logic for retrieving, saving, and reverting code snapshots. It emits socket events and handles server responses. We built this with timeouts (to prevent the UI from freezing if the server takes long) and listens for global `version-saved` events so if *Alice* saves a version, the history panel updates on *Bob's* screen too.

### 3. `src/lib/` (The Technical Connectors)
*   **`socket.ts`**: A simple singleton. It ensures we only create one single connection to the Node.js backend.
*   **`yjs-provider.ts`**: **(Very Important!)** This file is completely custom. Usually, people use `y-websocket`, but that requires running a separate dedicated server. We built a custom `SocketIOProvider` that bridges `Yjs` and `Socket.io`. 
    *   It listens for local updates (when you type) and emits them over the socket. 
    *   It listens for remote over-the-wire updates and applies them locally. 
    *   It also handles "Awareness" (broadcasting where your cursor is and what your username/color is).

### 4. `src/components/` (The UI Blocks)
*   **`CodeEditor.tsx`**: A wrapper around the Monaco Editor. We dynamically import it (to avoid Next.js Server-Side Rendering crashes since Monaco needs `window`). Once loaded, it uses the `y-monaco` package to physically bind our Yjs Document to the Monaco text field.
*   **`ChatPanel.tsx` / `VersionHistory.tsx` / `Toolbar.tsx`**: Standard React components that take props (like arrays of messages or connected users) and render the UI.

---

## ⚙️ The Server Workspace (`/server`)

The backend is built with **Express** (for standard HTTP stuff) and **Socket.io** (for real-time duplex communication). It uses pure JavaScript **SQLite (`sql.js`)** for data persistence.

### 1. `src/index.ts`
The entry point. It sets up the HTTP server, the Socket.io server with CORS configurations, calls the database initialization, and finally triggers `registerSocketHandlers()`.

### 2. `src/socket/` (Real-Time Communication)
*   **`handlers.ts`**: The switchboard. When a client connects, this file decides what happens. It listens for:
    *   `join-room`: Registers the user, creates their specific cursor color, fetches database history, and sends the room's current state buffer back.
    *   `yjs-update` / `awareness-update`: Immediately bounces typing and cursor events to all other users in the room.
    *   `chat-message`: Saves the text to the database and broadcasts it.
    *   `save-version` / `get-versions` / `revert-version`: Instructs the database interface and the sync engine to process snapshots.
*   **`yjs-sync.ts`**: The Server's memory. It maintains an active Map of `Y.Doc` objects—one for each active room. When clients send updates, it applies them to the server-side doc too. This is crucial because it allows the server to save the final state to the database every 5 seconds (debounced) and allows new users to get the completely up-to-date document state instantly.

### 3. `src/db/` (Data Persistence)
We use `sql.js` instead of native SQLite packages like `better-sqlite3` to guarantee it runs on any Node environment without complicated C++ compilation errors.
*   **`connection.ts`**: Initializes `sql.js`. Because `sql.js` lives entirely in computer memory, we specifically instruct it to read from an `.rtce.db` file when it starts, and `persistDb()` writes the active memory blob back to the hard drive on every transaction.
*   **`schema.ts`**: Creates tables if they don't exist: `rooms` (tracks code state & language), `messages` (tracks chat), and `versions` (tracks snapshots).
*   **`queries.ts`**: Wraps raw SQL statements into clean async Javascript functions. For example: `createVersion()` grabs a `Uint8Array` binary snapshot from Yjs and jams it into a BLOB column, then returns the database ID using a `last_insert_rowid()` lookup.

---

## 🔄 How the Sync Flow Works (Step-by-Step)

Here is a microscopic look at what happens when you type the letter "A" in the editor.

1. **User Input:** You press "A". The Monaco editor updates its UI.
2. **Yjs Binding:** The `y-monaco` binder observes this change. It updates our local `Y.Doc` object in Javascript.
3. **Provider Emission:** `SocketIOProvider` detects the `Y.Doc` updated. It grabs a tiny binary payload describing "User X added A at position Y", encodes it, and emits a `yjs-update` event over Socket.io.
4. **Server Reception:** `handlers.ts` on the server receives `yjs-update`. It immediately emits it to all other users in the same room. It also hands the binary string to `yjs-sync.ts` to apply.
5. **Server Memory & Save:** The server applies the update to its own version of the `Y.Doc`. A 5-second timer starts. If no one types for 5 seconds, it takes the full binary document and saves it to the SQLite database.
6. **Remote Client Reception:** Another connected client receives the `yjs-update`. Their `SocketIOProvider` decodes it and applies it to *their* local `Y.Doc`.
7. **Remote UI Update:** Their `y-monaco` binder detects the doc changed and forces their Monaco Editor to display the letter "A".

This entire process occurs in just a few milliseconds!

---

## 🛠 Advanced Mechanism: Reverting Versions

Resolving old code dynamically inside a CRDT ecosystem is notoriously tricky. We cannot traditionally compute a "diff" backwards to undo actions. 

**Our Solution for Reversion:**
When a client hits "Revert":
1. The server grabs the binary BLOB of the old code from the SQLite `versions` table.
2. The server loads it into a temporary throwaway Yjs document and extracts the raw `String` of code.
3. The server then executes a `delete` (wiping the whole document) and an `insert` (inserting the raw string) inside a single **Yjs Transaction** on the active document. 
4. This preserves the CRDT network lineage, avoiding syncing crashes between clients!
