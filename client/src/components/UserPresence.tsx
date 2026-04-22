"use client";

import { Users } from "lucide-react";
import type { User } from "@/lib/types";

interface UserPresenceProps {
  users: User[];
  currentUser: User | null;
}

export default function UserPresence({
  users,
  currentUser,
}: UserPresenceProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Users className="w-4 h-4 text-[var(--color-text-muted)]" />

      <div className="flex -space-x-2">
        {users.map((user) => {
          const isMe = user.socketId === currentUser?.socketId;
          return (
            <div
              key={user.socketId}
              className="tooltip relative"
              data-tooltip={isMe ? `${user.username} (you)` : user.username}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[var(--color-bg-primary)] transition-transform hover:scale-110 hover:z-10"
                style={{ backgroundColor: user.color }}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      <span className="text-xs text-[var(--color-text-muted)] ml-1">
        {users.length} online
      </span>
    </div>
  );
}
