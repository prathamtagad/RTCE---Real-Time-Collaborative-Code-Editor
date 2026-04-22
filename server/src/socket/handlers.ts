import type { Server, Socket } from "socket.io";
import {
  getOrCreateDoc,
  applyUpdate,
  encodeFullState,
  takeSnapshot,
  revertToSnapshot,
  cleanupRoom,
} from "./yjs-sync.js";
import {
  getOrCreateRoom,
  addMessage,
  getMessages,
  createVersion,
  getVersions,
  getVersion,
  updateRoomLanguage,
} from "../db/queries.js";
import type { ConnectedUser } from "../types.js";

// Track connected users across all rooms
const connectedUsers = new Map<string, ConnectedUser>();

// Pre-defined colors for user cursors
const USER_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
  "#F0B27A", "#82E0AA", "#F1948A", "#85929E", "#73C6B6",
];

function getColor(index: number): string {
  return USER_COLORS[index % USER_COLORS.length];
}

function getRoomUsers(roomId: string): ConnectedUser[] {
  return Array.from(connectedUsers.values()).filter(
    (u) => u.roomId === roomId
  );
}

export function registerSocketHandlers(io: Server): void {
  let colorIndex = 0;

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ── Join Room ──
    socket.on(
      "join-room",
      async (
        data: { roomId: string; username: string },
        callback?: (res: unknown) => void
      ) => {
        try {
          const { roomId, username } = data;

          socket.join(roomId);

          const room = await getOrCreateRoom(roomId);
          await getOrCreateDoc(roomId);

          const user: ConnectedUser = {
            socketId: socket.id,
            username,
            color: getColor(colorIndex++),
            roomId,
          };
          connectedUsers.set(socket.id, user);

          const fullState = await encodeFullState(roomId);
          const messages = (await getMessages(roomId, 100)).reverse();
          const users = getRoomUsers(roomId);

          const response = {
            yjsState: Buffer.from(fullState).toString("base64"),
            language: room.language,
            messages: messages.map((m) => ({
              id: m.id,
              roomId: m.room_id,
              username: m.username,
              content: m.content,
              timestamp: m.created_at,
            })),
            users: users.map((u) => ({
              socketId: u.socketId,
              username: u.username,
              color: u.color,
            })),
            user: {
              socketId: user.socketId,
              username: user.username,
              color: user.color,
            },
          };

          if (callback) callback(response);

          socket.to(roomId).emit("user-joined", {
            socketId: user.socketId,
            username: user.username,
            color: user.color,
          });

          console.log(
            `[Socket] ${username} joined room ${roomId} (${users.length} users)`
          );
        } catch (err) {
          console.error("[Socket] Error joining room:", err);
        }
      }
    );

    // ── Yjs Sync ──
    socket.on("yjs-update", async (data: { roomId: string; update: string }) => {
      try {
        const { roomId, update } = data;
        const binaryUpdate = new Uint8Array(Buffer.from(update, "base64"));
        await applyUpdate(roomId, binaryUpdate);
        socket.to(roomId).emit("yjs-update", { update });
      } catch (err) {
        console.error("[Socket] Error applying Yjs update:", err);
      }
    });

    socket.on(
      "yjs-sync-request",
      async (data: { roomId: string }, callback?: (res: unknown) => void) => {
        try {
          const fullState = await encodeFullState(data.roomId);
          const response = {
            state: Buffer.from(fullState).toString("base64"),
          };
          if (callback) callback(response);
        } catch (err) {
          console.error("[Socket] Error syncing:", err);
        }
      }
    );

    // ── Awareness (cursors, selections, presence) ──
    socket.on(
      "awareness-update",
      (data: { roomId: string; update: string }) => {
        socket.to(data.roomId).emit("awareness-update", {
          update: data.update,
        });
      }
    );

    // ── Chat ──
    socket.on(
      "chat-message",
      async (data: { roomId: string; username: string; content: string }) => {
        try {
          const { roomId, username, content } = data;
          const record = await addMessage(roomId, username, content);
          const message = {
            id: record.id,
            roomId: record.room_id,
            username: record.username,
            content: record.content,
            timestamp: record.created_at,
          };
          io.in(roomId).emit("chat-message", message);
        } catch (err) {
          console.error("[Socket] Error sending chat message:", err);
        }
      }
    );

    // ── Language Change ──
    socket.on(
      "language-change",
      async (data: { roomId: string; language: string }) => {
        try {
          const { roomId, language } = data;
          await updateRoomLanguage(roomId, language);
          socket.to(roomId).emit("language-change", { language });
        } catch (err) {
          console.error("[Socket] Error changing language:", err);
        }
      }
    );

    // ── Version History ──
    socket.on(
      "save-version",
      async (
        data: { roomId: string; author: string; label?: string },
        callback?: (res: unknown) => void
      ) => {
        try {
          const { roomId, author, label } = data;
          const snapshot = await takeSnapshot(roomId);
          const version = await createVersion(roomId, snapshot, author, label);
          const response = {
            id: version.id,
            label: version.label,
            author: version.author,
            createdAt: version.created_at,
          };
          if (callback) callback(response);
          io.in(roomId).emit("version-saved", response);
          console.log(
            `[Version] Saved version ${version.id} for room ${roomId} by ${author}`
          );
        } catch (err) {
          console.error("[Socket] Error saving version:", err);
        }
      }
    );

    socket.on(
      "get-versions",
      async (data: { roomId: string }, callback?: (res: unknown) => void) => {
        try {
          const versions = (await getVersions(data.roomId)).map((v) => ({
            id: v.id,
            label: v.label,
            author: v.author,
            createdAt: v.created_at,
          }));
          if (callback) callback({ versions });
        } catch (err) {
          console.error("[Socket] Error getting versions:", err);
        }
      }
    );

    socket.on(
      "revert-version",
      async (
        data: { roomId: string; versionId: number },
        callback?: (res: unknown) => void
      ) => {
        try {
          const { roomId, versionId } = data;
          const version = await getVersion(versionId);
          if (!version) {
            if (callback) callback({ error: "Version not found" });
            return;
          }

          const snapshot = new Uint8Array(version.snapshot);
          const newState = await revertToSnapshot(roomId, snapshot);

          io.in(roomId).emit("yjs-full-sync", {
            state: Buffer.from(newState).toString("base64"),
          });

          if (callback) callback({ success: true });
          console.log(
            `[Version] Reverted room ${roomId} to version ${versionId}`
          );
        } catch (err) {
          console.error("[Socket] Error reverting version:", err);
        }
      }
    );

    // ── Disconnect ──
    socket.on("disconnect", async () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        connectedUsers.delete(socket.id);
        const roomUsers = getRoomUsers(user.roomId);

        socket.to(user.roomId).emit("user-left", {
          socketId: user.socketId,
          username: user.username,
        });

        console.log(
          `[Socket] ${user.username} left room ${user.roomId} (${roomUsers.length} remaining)`
        );

        if (roomUsers.length === 0) {
          await cleanupRoom(user.roomId);
        }
      }
    });
  });
}
