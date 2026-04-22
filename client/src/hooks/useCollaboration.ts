"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { SocketIOProvider } from "@/lib/yjs-provider";
import type { User, ChatMessage, JoinRoomResponse } from "@/lib/types";

interface CollaborationState {
  doc: Y.Doc | null;
  provider: SocketIOProvider | null;
  ytext: Y.Text | null;
  connected: boolean;
  synced: boolean;
  users: User[];
  currentUser: User | null;
  language: string;
  setLanguage: (lang: string) => void;
  initialMessages: ChatMessage[];
}

export function useCollaboration(
  roomId: string,
  username: string
): CollaborationState {
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [language, setLanguageState] = useState("javascript");
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SocketIOProvider | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);

  const setLanguage = useCallback(
    (lang: string) => {
      setLanguageState(lang);
      const socket = getSocket();
      socket.emit("language-change", { roomId, language: lang });
    },
    [roomId]
  );

  useEffect(() => {
    if (!roomId || !username) return;

    const doc = new Y.Doc();
    const ytext = doc.getText("monaco");
    const socket = getSocket();

    docRef.current = doc;
    ytextRef.current = ytext;

    socket.connect();

    const provider = new SocketIOProvider(socket, roomId, doc);
    providerRef.current = provider;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Join the room and receive initial state
    socket.emit(
      "join-room",
      { roomId, username },
      (response: JoinRoomResponse) => {
        provider.applyInitialState(response.yjsState);
        setUsers(response.users);
        setCurrentUser(response.user);
        setLanguageState(response.language);
        setInitialMessages(response.messages);
        setSynced(true);

        // Set awareness local state
        provider.awareness.setLocalStateField("user", {
          name: response.user.username,
          color: response.user.color,
        });
      }
    );

    // Presence events
    socket.on("user-joined", (user: User) => {
      setUsers((prev) => {
        if (prev.find((u) => u.socketId === user.socketId)) return prev;
        return [...prev, user];
      });
    });

    socket.on(
      "user-left",
      (data: { socketId: string; username: string }) => {
        setUsers((prev) =>
          prev.filter((u) => u.socketId !== data.socketId)
        );
      }
    );

    // Language sync
    socket.on("language-change", (data: { language: string }) => {
      setLanguageState(data.language);
    });

    provider.on("synced", () => setSynced(true));

    return () => {
      provider.destroy();
      doc.destroy();
      socket.off("connect");
      socket.off("disconnect");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("language-change");
      disconnectSocket();
      docRef.current = null;
      providerRef.current = null;
      ytextRef.current = null;
    };
  }, [roomId, username]);

  return {
    doc: docRef.current,
    provider: providerRef.current,
    ytext: ytextRef.current,
    connected,
    synced,
    users,
    currentUser,
    language,
    setLanguage,
    initialMessages,
  };
}
