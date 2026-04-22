"use client";

import { useState } from "react";
import {
  History,
  MessageSquare,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Code2,
} from "lucide-react";
import LanguageSelect from "./LanguageSelect";
import UserPresence from "./UserPresence";
import type { User } from "@/lib/types";

interface ToolbarProps {
  roomId: string;
  language: string;
  onLanguageChange: (lang: string) => void;
  users: User[];
  currentUser: User | null;
  connected: boolean;
  onToggleChat: () => void;
  onToggleVersionHistory: () => void;
  chatOpen: boolean;
  messageCount: number;
}

export default function Toolbar({
  roomId,
  language,
  onLanguageChange,
  users,
  currentUser,
  connected,
  onToggleChat,
  onToggleVersionHistory,
  chatOpen,
  messageCount,
}: ToolbarProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/room/${roomId}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = `${window.location.origin}/room/${roomId}`;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="h-12 glass border-b border-[var(--color-border)] flex items-center justify-between px-4 shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded gradient-accent flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm text-[var(--color-text-primary)] hidden sm:block">
            RTCE
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--color-border)]" />

        {/* Room ID */}
        <button
          onClick={copyRoomId}
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors group"
          id="copy-room-btn"
        >
          <span className="font-mono bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors">
            {roomId}
          </span>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Language */}
        <LanguageSelect value={language} onChange={onLanguageChange} />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="w-3.5 h-3.5 text-[var(--color-success)]" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-[var(--color-danger)]" />
          )}
          <span
            className={`status-dot ${
              connected ? "online" : "offline"
            }`}
          />
        </div>

        {/* Users */}
        <UserPresence users={users} currentUser={currentUser} />

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--color-border)]" />

        {/* Version History */}
        <button
          onClick={onToggleVersionHistory}
          className="btn btn-ghost btn-sm"
          id="version-history-btn"
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">History</span>
        </button>

        {/* Chat toggle */}
        <button
          onClick={onToggleChat}
          className={`btn btn-sm relative ${
            chatOpen ? "btn-primary" : "btn-ghost"
          }`}
          id="chat-toggle-btn"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Chat</span>
          {!chatOpen && messageCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold text-white bg-[var(--color-accent)] rounded-full px-1">
              {messageCount > 99 ? "99+" : messageCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
