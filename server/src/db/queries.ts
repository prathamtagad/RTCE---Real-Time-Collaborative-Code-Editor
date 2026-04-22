import { getDb, persistDb } from "./connection.js";
import type { RoomRecord, MessageRecord, VersionRecord } from "../types.js";

// Helper: execute a query and return all rows
async function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params as (string | number | Uint8Array | null)[]);
  }
  const rows: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as T;
    rows.push(row);
  }
  stmt.free();
  return rows;
}

// Helper: execute a query and return the first row
async function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await all<T>(sql, params);
  return rows[0];
}

// Helper: execute a write query and return last insert rowid
async function run(sql: string, params: unknown[] = []): Promise<number> {
  const db = await getDb();
  db.run(sql, params as (string | number | Uint8Array | null)[]);
  // Get last inserted rowid
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0] as number;
  }
  return 0;
}

// ── Room queries ──

export async function getRoom(roomId: string): Promise<RoomRecord | undefined> {
  return get<RoomRecord>("SELECT * FROM rooms WHERE id = ?", [roomId]);
}

export async function getOrCreateRoom(
  roomId: string,
  name?: string
): Promise<RoomRecord> {
  const existing = await getRoom(roomId);
  if (existing) return existing;

  await run(
    "INSERT INTO rooms (id, name, language) VALUES (?, ?, ?)",
    [roomId, name || roomId, "javascript"]
  );
  persistDb();

  return (await getRoom(roomId))!;
}

export async function saveRoomState(roomId: string, yjsState: Uint8Array): Promise<void> {
  await run(
    "UPDATE rooms SET yjs_state = ?, updated_at = datetime('now') WHERE id = ?",
    [yjsState, roomId]
  );
  persistDb();
}

export async function updateRoomLanguage(
  roomId: string,
  language: string
): Promise<void> {
  await run(
    "UPDATE rooms SET language = ?, updated_at = datetime('now') WHERE id = ?",
    [language, roomId]
  );
  persistDb();
}

// ── Message queries ──

export async function addMessage(
  roomId: string,
  username: string,
  content: string
): Promise<MessageRecord> {
  const lastId = await run(
    "INSERT INTO messages (room_id, username, content) VALUES (?, ?, ?)",
    [roomId, username, content]
  );
  persistDb();

  const row = await get<MessageRecord>(
    "SELECT * FROM messages WHERE id = ?",
    [lastId]
  );

  // Fallback: construct the record manually if get fails
  if (!row) {
    return {
      id: lastId,
      room_id: roomId,
      username,
      content,
      created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    };
  }
  return row;
}

export async function getMessages(
  roomId: string,
  limit = 100
): Promise<MessageRecord[]> {
  return all<MessageRecord>(
    "SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT ?",
    [roomId, limit]
  );
}

// ── Version queries ──

export async function createVersion(
  roomId: string,
  snapshot: Uint8Array,
  author: string,
  label?: string
): Promise<VersionRecord> {
  const lastId = await run(
    "INSERT INTO versions (room_id, snapshot, author, label) VALUES (?, ?, ?, ?)",
    [roomId, snapshot, author, label || null]
  );
  persistDb();

  const row = await get<VersionRecord>(
    "SELECT * FROM versions WHERE id = ?",
    [lastId]
  );

  // Fallback: construct the record manually if get fails
  if (!row) {
    return {
      id: lastId,
      room_id: roomId,
      snapshot: snapshot,
      label: label || null,
      author,
      created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    };
  }
  return row;
}

export async function getVersions(roomId: string): Promise<VersionRecord[]> {
  return all<VersionRecord>(
    "SELECT id, room_id, label, author, created_at FROM versions WHERE room_id = ? ORDER BY created_at DESC",
    [roomId]
  );
}

export async function getVersion(versionId: number): Promise<VersionRecord | undefined> {
  return get<VersionRecord>(
    "SELECT * FROM versions WHERE id = ?",
    [versionId]
  );
}
