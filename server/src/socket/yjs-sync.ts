import * as Y from "yjs";
import { getOrCreateRoom, saveRoomState } from "../db/queries.js";

// In-memory Yjs documents keyed by room ID
const docs = new Map<string, Y.Doc>();

// Debounce timers for persisting state
const persistTimers = new Map<string, NodeJS.Timeout>();

const PERSIST_DEBOUNCE_MS = 5000;

/**
 * Get or create a Yjs document for a room.
 * If the room has persisted state in SQLite, it's loaded into the doc.
 */
export async function getOrCreateDoc(roomId: string): Promise<Y.Doc> {
  const existing = docs.get(roomId);
  if (existing) return existing;

  const doc = new Y.Doc();
  const room = await getOrCreateRoom(roomId);

  // Load persisted state if available
  if (room.yjs_state) {
    const state = new Uint8Array(room.yjs_state as unknown as ArrayBuffer);
    Y.applyUpdate(doc, state);
    console.log(`[Yjs] Loaded persisted state for room ${roomId}`);
  }

  docs.set(roomId, doc);
  return doc;
}

/**
 * Apply a binary update from a client to the server-side doc.
 * Schedules a debounced persist to SQLite.
 */
export async function applyUpdate(roomId: string, update: Uint8Array): Promise<void> {
  const doc = await getOrCreateDoc(roomId);
  Y.applyUpdate(doc, update);
  schedulePersist(roomId);
}

/**
 * Encode the full state of a room's Yjs doc for sending to a new client.
 */
export async function encodeFullState(roomId: string): Promise<Uint8Array> {
  const doc = await getOrCreateDoc(roomId);
  return Y.encodeStateAsUpdate(doc);
}

/**
 * Take a snapshot of the current doc state (for version history).
 */
export async function takeSnapshot(roomId: string): Promise<Uint8Array> {
  const doc = await getOrCreateDoc(roomId);
  return Y.encodeStateAsUpdate(doc);
}

/**
 * Revert a room's doc to a previous snapshot.
 * Modifies the existing doc's text in-place to preserve Yjs lineage.
 * Returns the full state to broadcast to clients.
 */
export async function revertToSnapshot(
  roomId: string,
  snapshot: Uint8Array
): Promise<Uint8Array> {
  const doc = await getOrCreateDoc(roomId);

  // Extract the target text from the snapshot
  const tempDoc = new Y.Doc();
  Y.applyUpdate(tempDoc, snapshot);
  const targetText = tempDoc.getText("monaco").toString();
  tempDoc.destroy();

  // Replace text in the existing doc to preserve lineage
  doc.transact(() => {
    const ytext = doc.getText("monaco");
    ytext.delete(0, ytext.length);
    ytext.insert(0, targetText);
  });

  schedulePersist(roomId);
  return Y.encodeStateAsUpdate(doc);
}

/**
 * Forcefully persist the current state of a room.
 */
export async function persistNow(roomId: string): Promise<void> {
  const doc = docs.get(roomId);
  if (!doc) return;

  const state = Y.encodeStateAsUpdate(doc);
  await saveRoomState(roomId, state);
}

/**
 * Schedule debounced persistence for a room.
 */
function schedulePersist(roomId: string): void {
  const existingTimer = persistTimers.get(roomId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(async () => {
    await persistNow(roomId);
    persistTimers.delete(roomId);
    console.log(`[Yjs] Persisted state for room ${roomId}`);
  }, PERSIST_DEBOUNCE_MS);

  persistTimers.set(roomId, timer);
}

/**
 * Cleanup a room's doc if no clients are connected.
 */
export async function cleanupRoom(roomId: string): Promise<void> {
  await persistNow(roomId);
  const doc = docs.get(roomId);
  if (doc) {
    doc.destroy();
    docs.delete(roomId);
  }
  const timer = persistTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    persistTimers.delete(roomId);
  }
  console.log(`[Yjs] Cleaned up room ${roomId}`);
}
