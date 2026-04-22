import * as Y from "yjs";
import { Socket } from "socket.io-client";
import { Observable } from "lib0/observable";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";

/**
 * Custom Yjs provider that uses Socket.io for transport.
 *
 * Why custom instead of y-websocket?
 * - y-websocket requires its own server process.
 * - Socket.io gives us rooms, acknowledgements, and fallbacks for free.
 * - We can integrate chat, presence, and version events on the same connection.
 */
export class SocketIOProvider extends Observable<string> {
  doc: Y.Doc;
  awareness: Awareness;
  socket: Socket;
  roomId: string;
  private _synced = false;
  private _updateHandler: (update: Uint8Array, origin: unknown) => void;
  private _awarenessUpdateHandler: (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: string | null
  ) => void;

  constructor(socket: Socket, roomId: string, doc: Y.Doc) {
    super();
    this.doc = doc;
    this.socket = socket;
    this.roomId = roomId;
    this.awareness = new Awareness(doc);

    // Listen for remote Yjs updates
    this.socket.on("yjs-update", (data: { update: string }) => {
      const update = this._base64ToUint8Array(data.update);
      Y.applyUpdate(this.doc, update, "remote");
    });

    // Listen for full state sync (used on revert)
    this.socket.on("yjs-full-sync", (data: { state: string }) => {
      const state = this._base64ToUint8Array(data.state);
      // Reconstruct the target text from the snapshot
      const newDoc = new Y.Doc();
      Y.applyUpdate(newDoc, state);
      const newText = newDoc.getText("monaco").toString();
      // Replace current doc text content atomically
      this.doc.transact(() => {
        const ytext = this.doc.getText("monaco");
        ytext.delete(0, ytext.length);
        ytext.insert(0, newText);
      }, "remote");
      newDoc.destroy();
    });

    // Listen for remote awareness updates
    this.socket.on("awareness-update", (data: { update: string }) => {
      const update = this._base64ToUint8Array(data.update);
      applyAwarenessUpdate(this.awareness, update, "remote");
    });

    // Broadcast local Yjs updates
    this._updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return; // don't echo remote updates
      this.socket.emit("yjs-update", {
        roomId: this.roomId,
        update: this._uint8ArrayToBase64(update),
      });
    };
    this.doc.on("update", this._updateHandler);

    // Broadcast local awareness changes
    this._awarenessUpdateHandler = (changes, origin) => {
      if (origin === "remote") return;
      const changedClients = [
        ...changes.added,
        ...changes.updated,
        ...changes.removed,
      ];
      const update = encodeAwarenessUpdate(this.awareness, changedClients);
      this.socket.emit("awareness-update", {
        roomId: this.roomId,
        update: this._uint8ArrayToBase64(update),
      });
    };
    this.awareness.on("update", this._awarenessUpdateHandler);

    // Handle reconnection
    this.socket.on("connect", () => {
      if (!this._synced) return;
      // Re-request full state on reconnect
      this.socket.emit(
        "yjs-sync-request",
        { roomId: this.roomId },
        (res: { state: string }) => {
          const state = this._base64ToUint8Array(res.state);
          Y.applyUpdate(this.doc, state, "remote");
          // Re-broadcast our awareness
          const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [
            this.doc.clientID,
          ]);
          this.socket.emit("awareness-update", {
            roomId: this.roomId,
            update: this._uint8ArrayToBase64(awarenessUpdate),
          });
        }
      );
    });
  }

  /**
   * Apply the initial state received from the server's join-room response.
   */
  applyInitialState(base64State: string): void {
    const state = this._base64ToUint8Array(base64State);
    Y.applyUpdate(this.doc, state, "remote");
    this._synced = true;
    this.emit("synced", [true]);
  }

  get synced(): boolean {
    return this._synced;
  }

  destroy(): void {
    this.doc.off("update", this._updateHandler);
    this.awareness.off("update", this._awarenessUpdateHandler);
    removeAwarenessStates(this.awareness, [this.doc.clientID], null);
    this.socket.off("yjs-update");
    this.socket.off("yjs-full-sync");
    this.socket.off("awareness-update");
    this.awareness.destroy();
    super.destroy();
  }

  private _uint8ArrayToBase64(data: Uint8Array): string {
    let binary = "";
    const bytes = new Uint8Array(data);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private _base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
