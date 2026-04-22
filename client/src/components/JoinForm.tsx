"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { Code2, Users, Zap, ArrowRight } from "lucide-react";

export default function JoinForm() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    const room = roomId.trim() || nanoid(10);
    sessionStorage.setItem("rtce-username", username.trim());
    router.push(`/room/${room}`);
  };

  const handleCreateRoom = () => {
    if (!username.trim()) return;
    const room = nanoid(10);
    setRoomId(room);
    sessionStorage.setItem("rtce-username", username.trim());
    router.push(`/room/${room}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[var(--color-accent)] opacity-[0.03] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[var(--color-accent-light)] opacity-[0.03] blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-accent mb-4 shadow-lg shadow-[var(--color-accent)]/20">
            <Code2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            RTCE
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Real-Time Collaborative Code Editor
          </p>
        </div>

        {/* Features */}
        <div className="flex justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Zap className="w-3.5 h-3.5 text-[var(--color-warning)]" />
            Live Sync
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Users className="w-3.5 h-3.5 text-[var(--color-success)]" />
            Live Cursors
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Code2 className="w-3.5 h-3.5 text-[var(--color-info)]" />
            Monaco Editor
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleJoin} className="glass-strong rounded-xl p-6 space-y-4">
          <div>
            <label
              htmlFor="username-input"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Your Name
            </label>
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="input"
              required
              autoFocus
              maxLength={30}
            />
          </div>

          <div>
            <label
              htmlFor="room-input"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Room ID{" "}
              <span className="text-[var(--color-text-muted)] font-normal">
                (leave empty to create new)
              </span>
            </label>
            <input
              id="room-input"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. abc123"
              className="input"
              maxLength={50}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCreateRoom}
              className="btn btn-secondary flex-1"
              disabled={!username.trim()}
            >
              Create Room
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={!username.trim()}
            >
              Join Room
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          No sign-up required. Just pick a name and start coding.
        </p>
      </div>
    </div>
  );
}
