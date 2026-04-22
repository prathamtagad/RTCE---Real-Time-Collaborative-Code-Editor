export interface RoomRecord {
  id: string;
  name: string;
  language: string;
  yjs_state: Uint8Array | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: number;
  room_id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface VersionRecord {
  id: number;
  room_id: string;
  snapshot: Uint8Array;
  label: string | null;
  author: string;
  created_at: string;
}

export interface ConnectedUser {
  socketId: string;
  username: string;
  color: string;
  roomId: string;
}

export interface ChatMessage {
  id?: number;
  roomId: string;
  username: string;
  content: string;
  timestamp: string;
}

export interface VersionInfo {
  id: number;
  label: string | null;
  author: string;
  createdAt: string;
}
