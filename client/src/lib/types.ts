export interface User {
  socketId: string;
  username: string;
  color: string;
}

export interface ChatMessage {
  id?: number;
  roomId: string;
  username: string;
  content: string;
  timestamp: string;
}

export interface Version {
  id: number;
  label: string | null;
  author: string;
  createdAt: string;
}

export interface JoinRoomResponse {
  yjsState: string; // base64 encoded
  language: string;
  messages: ChatMessage[];
  users: User[];
  user: User; // the current user's assigned info
}
