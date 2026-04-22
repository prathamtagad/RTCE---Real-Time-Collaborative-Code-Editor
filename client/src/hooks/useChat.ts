"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import type { ChatMessage } from "@/lib/types";

interface ChatState {
  messages: ChatMessage[];
  sendMessage: (content: string) => void;
  setInitialMessages: (msgs: ChatMessage[]) => void;
}

export function useChat(roomId: string, username: string): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        // Deduplicate by ID
        if (msg.id && prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on("chat-message", handleMessage);

    return () => {
      socket.off("chat-message", handleMessage);
      initializedRef.current = false;
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || !roomId) return;
      const socket = getSocket();
      socket.emit("chat-message", {
        roomId,
        username,
        content: content.trim(),
      });
    },
    [roomId, username]
  );

  const setInitialMessages = useCallback((msgs: ChatMessage[]) => {
    if (!initializedRef.current) {
      setMessages(msgs);
      initializedRef.current = true;
    }
  }, []);

  return { messages, sendMessage, setInitialMessages };
}
