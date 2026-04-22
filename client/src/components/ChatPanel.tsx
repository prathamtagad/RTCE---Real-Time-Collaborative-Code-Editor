"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  X,
  ChevronRight,
} from "lucide-react";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  username: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  username,
  isOpen,
  onToggle,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp + "Z");
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Collapsed toggle button
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 glass-strong rounded-l-lg p-2 hover:bg-[var(--color-bg-hover)] transition-all group"
        data-tooltip="Open chat"
        id="chat-toggle-open"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5 text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)]" />
          {messages.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-[var(--color-accent)] border border-[var(--color-bg-primary)]" />
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="w-80 h-full glass-strong flex flex-col animate-slide-right border-l border-[var(--color-border)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="font-semibold text-sm text-[var(--color-text-primary)]">
            Chat
          </h3>
          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded">
            {messages.length}
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors"
          id="chat-toggle-close"
        >
          <X className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 mx-auto text-[var(--color-text-muted)] mb-2 opacity-50" />
            <p className="text-xs text-[var(--color-text-muted)]">
              No messages yet. Say hello!
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.username === username;
          return (
            <div
              key={msg.id || i}
              className={`animate-fade-in ${
                isOwn ? "ml-4" : "mr-4"
              }`}
            >
              <div className="flex items-baseline gap-2 mb-0.5">
                <span
                  className="text-xs font-medium"
                  style={{ color: isOwn ? "var(--color-accent-light)" : "var(--color-success)" }}
                >
                  {isOwn ? "You" : msg.username}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div
                className={`text-sm rounded-lg px-3 py-2 ${
                  isOwn
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-text-primary)]"
                    : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="px-3 py-3 border-t border-[var(--color-border)]"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="input flex-1 text-sm py-2"
            maxLength={500}
            id="chat-input"
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm p-2"
            disabled={!input.trim()}
            id="chat-send-btn"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
